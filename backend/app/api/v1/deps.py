from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User, UserRole
from app.core.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        sub: str = payload.get("sub")
        if sub is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    # Clear any prior aborted transaction so the DB query doesn't fail
    try:
        db.rollback()
    except Exception:
        pass

    # ── ASHA virtual-user fast path ─────────────────────────────────────────
    # Tokens issued by /auth/asha-login carry sub="asha_<WORKER_ID>" and
    # role="asha".  There is no corresponding row in the users table, so we
    # materialise a transient User object instead of hitting the DB.
    role_claim: str = payload.get("role", "")
    if sub.startswith("asha_") or role_claim == "asha":
        worker_id: str = payload.get("worker_id", sub.replace("asha_", ""))
        return User(
            id=0,
            email=f"{worker_id.lower()}@asha.nhm.gov.in",
            full_name=payload.get("name", "Sunita Devi"),
            role="asha",
            patient_id=f"ASHA-{worker_id}",
            is_active=True,
        )

    user = None
    try:
        if "@" in sub:
            user = db.query(User).filter(User.email == sub).first()
        else:
            try:
                user_id = int(sub)
                user = db.query(User).filter(User.id == user_id).first()
            except ValueError:
                user = db.query(User).filter(User.email == sub).first()
    except Exception as db_err:
        # Transaction-level error (e.g. InFailedSqlTransaction) — rollback and retry once
        import traceback
        print(f"[AUTH] DB query error in get_current_user: {db_err}", flush=True)
        try:
            db.rollback()
            if "@" in sub:
                user = db.query(User).filter(User.email == sub).first()
            else:
                try:
                    user_id = int(sub)
                    user = db.query(User).filter(User.id == user_id).first()
                except ValueError:
                    user = db.query(User).filter(User.email == sub).first()
        except Exception as retry_err:
            print(f"[AUTH] Retry also failed: {retry_err}", flush=True)
            # Return a minimal fallback user from the token payload so /auth/me never 401s for a valid JWT
            role = payload.get("role", "patient")
            email = sub if "@" in sub else payload.get("email", "")
            fallback = User(
                id=0,
                email=email,
                full_name=email.split("@")[0] if email else "User",
                role=role,
                patient_id=f"SM-FALLBACK-{sub[:5]}",
                is_active=True,
            )
            return fallback

    if user is None:
        raise credentials_exception
    return user

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

security_optional = HTTPBearer(auto_error=False)

async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional),
    db: Session = Depends(get_db)
) -> Optional[User]:
    if not credentials:
        return None
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        sub: str = payload.get("sub")
        if sub is None:
            return None
    except jwt.PyJWTError:
        return None

    # Clear any prior aborted transaction
    try:
        db.rollback()
    except Exception:
        pass

    user = None
    try:
        if "@" in sub:
            user = db.query(User).filter(User.email == sub).first()
        else:
            try:
                user_id = int(sub)
                user = db.query(User).filter(User.id == user_id).first()
            except ValueError:
                user = db.query(User).filter(User.email == sub).first()
    except Exception:
        try:
            db.rollback()
            if "@" in sub:
                user = db.query(User).filter(User.email == sub).first()
            else:
                try:
                    user_id = int(sub)
                    user = db.query(User).filter(User.id == user_id).first()
                except ValueError:
                    user = db.query(User).filter(User.email == sub).first()
        except Exception:
            pass

    return user


# ---------------------------------------------------------------------------
# Public alias: get_optional_current_user
# Extracts Bearer token if present, resolves user from DB, returns None for
# guests or on any validation error — never raises HTTP 401.
# ---------------------------------------------------------------------------

get_optional_current_user = get_current_user_optional

# ---------------------------------------------------------------------------
# Role-based access dependencies
# ---------------------------------------------------------------------------

def require_asha(current_user: User = Depends(get_current_user)) -> User:
    """
    Permits access only to certified ASHA workers and administrators.
    All other roles (patient, doctor) receive HTTP 403.
    """
    if current_user.role not in (UserRole.ASHA, UserRole.ADMIN, "asha", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Exclusive to certified ASHA Health Workers.",
        )
    return current_user


def require_doctor(current_user: User = Depends(get_current_user)) -> User:
    """Permits access only to doctors and administrators."""
    if current_user.role not in (UserRole.DOCTOR, UserRole.ADMIN, "doctor", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Exclusive to verified Doctors.",
        )
    return current_user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Permits access only to administrators."""
    if current_user.role not in (UserRole.ADMIN, "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Requires Administrator privileges.",
        )
    return current_user


# ---------------------------------------------------------------------------
# ASHA worker identity
# ---------------------------------------------------------------------------

def get_current_asha(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """
    Resolves an ASHA portal token (issued by /auth/asha-login) to the
    AshaWorker row. Every ASHA endpoint scopes its queries to this worker.
    """
    from app.models.asha import AshaWorker

    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="ASHA session expired. Please log in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise unauthorized
    if payload.get("role") != "asha" or payload.get("asha_db_id") is None:
        raise unauthorized

    worker = db.query(AshaWorker).filter(AshaWorker.id == payload["asha_db_id"]).first()
    if worker is None or not worker.is_active:
        raise unauthorized
    return worker
