import random
import string
import re
import secrets
import sys
import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request, Body
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.security import get_password_hash, verify_password, create_access_token
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.otp import EmailOTP
from app.schemas.auth import (
    SendOTPRequest,
    VerifyAndRegisterRequest,
    UserLogin,
    ProfileUpdateRequest,
    UserProfileResponse,
    TokenResponse,
    VerifyPasswordRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    FirebaseLoginRequest,
)
from app.services.otp_service import generate_and_store_otp
from app.api.v1.deps import get_current_user
import json
import urllib.request
import urllib.error

router = APIRouter()

from typing import Dict, Any
from pydantic import BaseModel

class AbhaLinkRequest(BaseModel):
    abha_number: str
    abha_address: str
    full_name: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    dob: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None

OTP_STORE: Dict[str, dict] = {}
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")

def send_via_resend(to_email: str, code: str) -> bool:
    """Delivers email via HTTPS (Port 443) - unblockable by cloud firewalls."""
    if not RESEND_API_KEY:
        print("[RESEND] RESEND_API_KEY is not set in Render Environment variables.", flush=True)
        return False

    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {RESEND_API_KEY.strip()}",
        "Content-Type": "application/json",
        "User-Agent": "SehatMitra-AI"
    }
    payload = {
        "from": "SehatMitra AI <onboarding@resend.dev>",
        "to": [to_email],
        "subject": f"Your SehatMitra Verification Code: {code}",
        "html": f"""
        <div style="font-family: Arial, sans-serif; padding: 24px; background-color: #f9fafb;">
            <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 24px; border: 1px solid #e5e7eb;">
                <h2 style="color: #059669; text-align: center; margin-top: 0;">SehatMitra AI</h2>
                <p style="font-size: 14px; color: #374151;">Your 6-digit verification code is:</p>
                <div style="text-align: center; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #059669; background: #ecfdf5; padding: 10px 24px; border-radius: 8px; display: inline-block;">{code}</span>
                </div>
                <p style="font-size: 12px; color: #6b7280; text-align: center; margin-bottom: 0;">Valid for 10 minutes. Do not share this OTP with anyone.</p>
            </div>
        </div>
        """
    }

    try:
        req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=8) as res:
            if res.status in (200, 201):
                print(f"[RESEND SUCCESS] Email successfully delivered to {to_email}", flush=True)
                return True
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="ignore")
        print(f"[RESEND HTTP ERROR] {err_body}", flush=True)
    except Exception as general_err:
        print(f"[RESEND ERROR] {general_err}", flush=True)
    return False

@router.get("/suggest-usernames")
def suggest_usernames(
    name: Optional[str] = None,
    base_name: Optional[str] = None,
    email: Optional[str] = None,
    db: Session = Depends(get_db)
):
    clean_name = ""
    target_name = name or base_name
    if target_name:
        clean_name = re.sub(r'[^a-zA-Z0-9]', '', target_name).lower()
    elif email:
        email_prefix = email.split('@')[0]
        clean_name = re.sub(r'[^a-zA-Z0-9]', '', email_prefix).lower()
    
    if not clean_name:
        clean_name = "user"

    clean_name = clean_name[:15]

    candidates = [
        f"{clean_name}{random.randint(10, 99)}",
        f"{clean_name}_sm",
        f"{clean_name}_2026",
        f"{clean_name}_care",
        f"{clean_name}_{random.randint(100, 999)}",
        f"{clean_name}{random.randint(100, 999)}",
        f"{clean_name}_patient"
    ]

    suggestions = []
    for cand in candidates:
        exists = db.query(User).filter(User.username == cand).first()
        if not exists and cand not in suggestions:
            suggestions.append(cand)
        if len(suggestions) >= 4:
            break

    return {"suggestions": suggestions[:4]}

@router.post("/send-otp")
async def send_otp_endpoint(request: Request, db: Session = Depends(get_db)):
    try:
        data = await request.json()
    except Exception:
        data = {}

    email = str(data.get("email") or data.get("username") or "").strip().lower()
    name = str(data.get("full_name") or data.get("name") or data.get("fullName") or "").strip()
    password = str(data.get("password") or "").strip()

    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")

    # 1. Check if email is already registered in User table
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This email or phone number is already registered."
        )

    code = f"{random.randint(100000, 999999)}"
    OTP_STORE[email] = {
        "otp": code,
        "expires_at": datetime.utcnow() + timedelta(minutes=10),
        "name": name,
        "password": password
    }

    print(f"\n====================================", flush=True)
    print(f"[OTP GENERATED] {email} : {code}", flush=True)
    print(f"====================================\n", flush=True)

    try:
        send_via_resend(email, code)
    except Exception as email_err:
        print(f"Resend delivery failed: {email_err}")

    return {"success": True, "message": f"OTP sent to {email}", "dev_otp": code}

@router.post("/verify-and-register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def verify_and_register(payload: VerifyAndRegisterRequest, db: Session = Depends(get_db)):
    # 1. Look up active OTP matching criteria
    db_otp = db.query(EmailOTP).filter(
        EmailOTP.email == payload.email,
        EmailOTP.otp_code == payload.otp_code,
        EmailOTP.is_used == False,
        EmailOTP.expires_at >= datetime.utcnow()
    ).order_by(EmailOTP.created_at.desc()).first()

    if not db_otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP code"
        )

    # 2. Mark OTP record as used
    db_otp.is_used = True
    db.commit()

    # 3. Verify uniqueness of username or email or phone to double check
    existing_user_email = db.query(User).filter(User.email == payload.email).first()
    if existing_user_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    existing_user_phone = db.query(User).filter(User.phone == payload.phone).first()
    if existing_user_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number already registered"
        )
    existing_user_username = db.query(User).filter(User.username == payload.username).first()
    if existing_user_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )

    # 4. Generate unique patient ID: SM-2026- + 5 random uppercase alphanumeric characters
    while True:
        suffix = "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(5))
        patient_id = f"SM-2026-{suffix}"
        exists = db.query(User).filter(User.patient_id == patient_id).first()
        if not exists:
            break

    # 5. Hash password with bcrypt and save user
    new_user = User(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        phone=payload.phone,
        phone_number=payload.phone,  # backward compatibility
        username=payload.username,
        patient_id=patient_id,
        is_email_verified=True,
        is_profile_completed=False,
        role=UserRole.PATIENT,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 6. Generate JWT token with user ID subject
    token = create_access_token(data={"sub": str(new_user.id), "role": new_user.role})

    resolved_role = str(new_user.role.value if hasattr(new_user.role, "value") else new_user.role)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "email": new_user.email,
            "full_name": new_user.full_name or (new_user.email.split("@")[0] if new_user.email else "User"),
            "role": resolved_role,
            "patient_id": new_user.patient_id,
            "abha_id": getattr(new_user, "abha_id", None) or new_user.patient_id,
            "username": new_user.username,
            "phone": new_user.phone,
            "age": None,
            "gender": None,
            "blood_group": None,
            "allergies": [],
            "chronic_conditions": [],
            "is_profile_completed": False,
        },
    }

# Keep signup endpoint as fallback but deprecate it internally to maintain API compatibility
@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(user_in: VerifyAndRegisterRequest, db: Session = Depends(get_db)):
    return verify_and_register(user_in, db)

@router.post("/login", response_model=TokenResponse)
async def login(
    request: Request,
    db: Session = Depends(get_db)
):
    username = None
    password = None

    content_type = request.headers.get("content-type", "")
    if "application/x-www-form-urlencoded" in content_type:
        try:
            form_data = await request.form()
            username = form_data.get("username")
            password = form_data.get("password")
        except Exception:
            pass
    else:
        try:
            body = await request.json()
            username = body.get("identifier") or body.get("username") or body.get("email")
            password = body.get("password")
        except Exception:
            pass

    if not username or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing identifier (email, phone, or username) or password",
        )

    user = db.query(User).filter(
        (User.email == username) | (User.phone == username) | (User.username == username)
    ).first()

    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect identifier or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})

    resolved_full_name = user.full_name or (user.email.split("@")[0] if user.email else "User")
    resolved_patient_id = user.patient_id or f"SM-2026-{user.id:04d}"
    resolved_role = str(user.role.value if hasattr(user.role, "value") else user.role)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": resolved_full_name,
            "role": resolved_role,
            "patient_id": resolved_patient_id,
            "abha_id": getattr(user, "abha_id", None) or resolved_patient_id,
            "username": user.username,
            "phone": user.phone,
            "age": getattr(user, "age", None),
            "gender": getattr(user, "gender", None),
            "blood_group": getattr(user, "blood_group", None),
            "village_town": getattr(user, "village_town", None),
            "district": getattr(user, "district", None),
            "state": getattr(user, "state", None),
            "pincode": getattr(user, "pincode", None),
            "emergency_contact_name": getattr(user, "emergency_contact_name", None),
            "emergency_contact_phone": getattr(user, "emergency_contact_phone", None),
            "allergies": getattr(user, "allergies", None),
            "chronic_conditions": getattr(user, "chronic_conditions", None),
            "is_profile_completed": user.is_profile_completed,
        },
    }

@router.get("/me", response_model=UserProfileResponse)
def get_me(current_user: User = Depends(get_current_user)):
    # Run through UserProfileResponse.model_validate so that normalisation
    # (full_name fallback, deterministic patient_id, abha_id) is always applied
    # before FastAPI serialises the response, regardless of Pydantic v1/v2 path.
    return UserProfileResponse.model_validate(current_user)

@router.post("/profile")
@router.put("/profile")
@router.put("/me")
@router.post("/complete-profile")
@router.put("/complete-profile")
def update_profile(
    payload: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # ── full_name ───────────────────────────────────────────────────────────
    if payload.full_name is not None and payload.full_name.strip():
        current_user.full_name = payload.full_name.strip()

    # ── phone — accept phone or phone_number ────────────────────────────────
    resolved_phone = payload.phone or payload.phone_number
    if resolved_phone is not None:
        current_user.phone = resolved_phone.strip() or None

    # ── age ─────────────────────────────────────────────────────────────────
    if payload.age is not None:
        try:
            if isinstance(payload.age, str):
                cleaned_age = payload.age.strip()
                current_user.age = int(float(cleaned_age)) if cleaned_age else None
            else:
                current_user.age = int(payload.age)
        except Exception:
            current_user.age = None
    else:
        current_user.age = None

    # ── gender ───────────────────────────────────────────────────────────────
    if payload.gender is not None:
        current_user.gender = payload.gender

    # ── blood_group — accept snake_case or camelCase ─────────────────────────
    resolved_blood_group = payload.blood_group or payload.bloodGroup
    if resolved_blood_group is not None:
        current_user.blood_group = resolved_blood_group

    # ── location fields ──────────────────────────────────────────────────────
    if payload.village_town is not None:
        current_user.village_town = payload.village_town
    if payload.district is not None:
        current_user.district = payload.district
    if payload.state is not None:
        current_user.state = payload.state
    if payload.pincode is not None:
        current_user.pincode = payload.pincode

    # ── emergency contact ────────────────────────────────────────────────────
    if payload.emergency_contact_name is not None:
        current_user.emergency_contact_name = payload.emergency_contact_name
    if payload.emergency_contact_phone is not None:
        current_user.emergency_contact_phone = payload.emergency_contact_phone

    # ── clinical history ─────────────────────────────────────────────────────
    if payload.chronic_conditions is not None:
        current_user.chronic_conditions = payload.chronic_conditions
    if payload.allergies is not None:
        current_user.allergies = payload.allergies

    current_user.is_profile_completed = True

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    
    resolved_patient_id = current_user.patient_id or f"SM-2026-{current_user.id:04d}"
    return {
        "success": True,
        "message": "Medical profile updated successfully.",
        "user": {
            "id": current_user.id,
            "patient_id": resolved_patient_id,
            "abha_id": resolved_patient_id,
            "full_name": current_user.full_name,
            "username": current_user.username,
            "email": current_user.email,
            "phone": current_user.phone,
            "role": str(current_user.role.value if hasattr(current_user.role, 'value') else current_user.role),
            "age": current_user.age,
            "gender": current_user.gender,
            "blood_group": current_user.blood_group,
            "village_town": current_user.village_town,
            "district": current_user.district,
            "state": current_user.state,
            "pincode": current_user.pincode,
            "emergency_contact_name": current_user.emergency_contact_name,
            "emergency_contact_phone": current_user.emergency_contact_phone,
            "chronic_conditions": current_user.chronic_conditions or [],
            "allergies": current_user.allergies or [],
            "is_profile_completed": True
        }
    }

@router.post("/forgot-password", status_code=status.HTTP_200_OK)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        (User.email == payload.identifier) | (User.username == payload.identifier)
    ).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account associated with this email or username was found."
        )

    # Generate, print, and store OTP (non-blocking)
    otp_code = generate_and_store_otp(db, user.email, getattr(user, "phone", "") or "")
 
    try:
        send_otp_email(user.email, otp_code)
    except Exception as email_err:
        print(f"Email delivery failed: {email_err}")
 
    return {"success": True, "message": "Password reset OTP dispatched successfully", "dev_otp": otp_code}

@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    db_otp = db.query(EmailOTP).filter(
        EmailOTP.email == payload.email,
        EmailOTP.otp_code == payload.otp_code,
        EmailOTP.is_used == False,
        EmailOTP.expires_at >= datetime.utcnow()
    ).order_by(EmailOTP.created_at.desc()).first()

    if not db_otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP verification code."
        )

    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account associated with this email address was not found."
        )

    db_otp.is_used = True
    user.hashed_password = get_password_hash(payload.new_password)
    db.commit()

    return {"success": True, "message": "Your password has been successfully reset. You may now login."}

@router.post("/verify-password")
def verify_user_password(
    payload: VerifyPasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    hash_val = getattr(current_user, "hashed_password", None) or getattr(current_user, "password_hash", None)
    # Firebase/OAuth users have no user-chosen password — auto-verify them
    if not hash_val:
        return {"success": True, "verified": True, "message": "Password verified (OAuth user)"}
    # Auto-verify if the stored hash has the Firebase OAuth sentinel prefix,
    # meaning the user was created via Google/Firebase and has no user-set password
    if hash_val.startswith("FIREBASE_OAUTH:"):
        return {"success": True, "verified": True, "message": "Password verified (OAuth user)"}
    # Also auto-verify if the stored value is NOT a bcrypt hash (legacy fallback)
    is_bcrypt = hash_val.startswith("$2b$") or hash_val.startswith("$2a$") or hash_val.startswith("$2y$")
    if not is_bcrypt:
        return {"success": True, "verified": True, "message": "Password verified (OAuth user)"}
    is_correct = verify_password(payload.password, hash_val)
    if not is_correct:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect password"
        )
    return {"success": True, "verified": True, "message": "Password verified"}

@router.post("/firebase-login")
async def firebase_login_handler(request: Request, db: Session = Depends(get_db)):
    # Ensure any previous aborted transaction is cleared
    db.rollback()
    try:
        body = await request.json()
    except Exception:
        db.rollback()
        body = {}

    email = str(body.get("email", "")).strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required.")

    try:
        user = db.query(User).filter(User.email == email).first()

        if not user:
            # Create user
            import secrets
            import string
            while True:
                suffix = "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(5))
                patient_id = f"SM-2026-{suffix}"
                exists = db.query(User).filter(User.patient_id == patient_id).first()
                if not exists:
                    break

            name = str(body.get("displayName") or body.get("name") or email.split("@")[0])
            base_username = re.sub(r'[^a-zA-Z0-9_]', '', name).lower()
            username = base_username
            counter = 1
            while db.query(User).filter(User.username == username).first():
                username = f"{base_username}_{counter}"
                counter += 1

            # Allow sign-up to set role=asha when a valid passcode was used on the frontend
            requested_role_str = str(body.get("role", "patient")).lower()
            assigned_role = UserRole.ASHA if requested_role_str == "asha" else UserRole.PATIENT

            user = User(
                full_name=name or username,
                email=email,
                # Store a sentinel so verify-password can auto-approve Firebase/OAuth users
                hashed_password="FIREBASE_OAUTH:" + secrets.token_hex(16),
                phone=None,
                username=username,
                patient_id=patient_id,
                is_email_verified=True,
                is_profile_completed=False,
                role=assigned_role,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        token = create_access_token(data={"sub": str(user.id), "role": user.role})

        # Resolve full_name + patient_id with the same normalisation used by GET /me
        resolved_full_name = user.full_name or email.split("@")[0]
        resolved_patient_id = user.patient_id or f"SM-2026-{user.id:04d}"

        return {
            "success": True,
            "access_token": token,
            "token_type": "bearer",
            "user": {
                # Keys match UserPayload / UserProfileResponse so AuthContext
                # can store this directly without shape mismatches.
                "id": user.id,
                "email": email,
                "full_name": resolved_full_name,
                "role": str(user.role.value if hasattr(user.role, 'value') else user.role),
                "patient_id": resolved_patient_id,
                "abha_id": resolved_patient_id,
                "username": user.username,
                "is_profile_completed": user.is_profile_completed,
            }
        }
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(exc))

@router.post("/verify-otp")
async def verify_otp_endpoint(request: Request, db: Session = Depends(get_db)):
    try:
        data = await request.json()
    except Exception:
        data = {}

    email = str(data.get("email") or data.get("username") or "").strip().lower()
    otp = str(data.get("otp") or "").strip()

    record = OTP_STORE.get(email)
    if not record:
        raise HTTPException(status_code=400, detail="No OTP requested for this email.")
    if datetime.utcnow() > record["expires_at"]:
        OTP_STORE.pop(email, None)
        raise HTTPException(status_code=400, detail="OTP has expired.")
    if record["otp"] != otp:
        raise HTTPException(status_code=400, detail="Invalid OTP code.")

    user_name = record.get("name") or email.split("@")[0]
    password = record.get("password", "")

    # Create the user in database if they don't already exist
    user = db.query(User).filter(User.email == email).first()
    if not user:
        import secrets
        import string
        while True:
            suffix = "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(5))
            patient_id = f"SM-2026-{suffix}"
            exists = db.query(User).filter(User.patient_id == patient_id).first()
            if not exists:
                break
        
        base_username = email.split("@")[0]
        base_username = re.sub(r'[^a-zA-Z0-9_]', '', base_username).lower()
        username = base_username
        
        counter = 1
        while db.query(User).filter(User.username == username).first():
            username = f"{base_username}_{counter}"
            counter += 1

        user = User(
            full_name=user_name or username,
            email=email,
            hashed_password=get_password_hash(password or secrets.token_hex(16)),
            username=username,
            patient_id=patient_id,
            is_email_verified=True,
            is_profile_completed=False,
            role=UserRole.PATIENT,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Clean up OTP store
    OTP_STORE.pop(email, None)

    # Return JWT token
    token = create_access_token(data={"sub": str(user.id), "role": user.role})

    return {
        "success": True,
        "message": "Verified successfully",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "uid": email,
            "email": email,
            "displayName": user.full_name,
            "id": user.id,
            "patient_id": user.patient_id,
            "username": user.username,
            "is_profile_completed": user.is_profile_completed
        }
    }


@router.post("/switch-role")
def switch_role(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Hackathon demo helper: toggles the authenticated user's role between 'patient' and 'asha'.
    Allows live RBAC demonstration without re-registering.
    """
    try:
        db.rollback()
    except Exception:
        pass
    new_role = UserRole.ASHA if current_user.role in (UserRole.PATIENT, "patient") else UserRole.PATIENT
    current_user.role = new_role
    db.commit()
    db.refresh(current_user)
    new_token = create_access_token(data={"sub": str(current_user.id), "role": current_user.role})
    return {
        "status": "success",
        "new_role": current_user.role,
        "access_token": new_token,
        "token_type": "bearer",
    }


# ── ABHA Linking Endpoints ────────────────────────────────────────────────────

def _build_user_payload(user: User) -> dict:
    """Return a consistent user dict for ABHA link/unlink responses."""
    resolved_patient_id = user.patient_id or f"SM-2026-{user.id:04d}"
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name or (user.email.split("@")[0] if user.email else "User"),
        "role": str(user.role.value if hasattr(user.role, "value") else user.role),
        "patient_id": resolved_patient_id,
        "abha_id": resolved_patient_id,
        "username": user.username,
        "phone": user.phone,
        "age": getattr(user, "age", None),
        "gender": getattr(user, "gender", None),
        "blood_group": getattr(user, "blood_group", None),
        "village_town": getattr(user, "village_town", None),
        "district": getattr(user, "district", None),
        "state": getattr(user, "state", None),
        "pincode": getattr(user, "pincode", None),
        "emergency_contact_name": getattr(user, "emergency_contact_name", None),
        "emergency_contact_phone": getattr(user, "emergency_contact_phone", None),
        "allergies": getattr(user, "allergies", None) or [],
        "chronic_conditions": getattr(user, "chronic_conditions", None) or [],
        "is_profile_completed": user.is_profile_completed,
        "is_abha_verified": bool(getattr(user, "is_abha_verified", False)),
        "abha_number": getattr(user, "abha_number", None),
        "abha_address": getattr(user, "abha_address", None),
    }


@router.post("/link-abha")
def link_abha(
    payload: AbhaLinkRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Link a verified ABHA ID to the authenticated user account."""
    current_user.is_abha_verified = True
    current_user.abha_number = payload.abha_number
    current_user.abha_address = payload.abha_address

    # ── Auto-update profile demographics from verified ABHA identity ─────────
    if payload.full_name and payload.full_name.strip():
        current_user.full_name = payload.full_name.strip()

    if payload.gender and payload.gender.strip():
        current_user.gender = payload.gender.strip()

    if payload.age is not None:
        current_user.age = payload.age

    if payload.district and payload.district.strip():
        current_user.district = payload.district.strip()

    if payload.state and payload.state.strip():
        current_user.state = payload.state.strip()

    # Persist ABHA metadata as JSON blob
    current_user.abha_meta = payload.model_dump()

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return {"success": True, "message": "ABHA ID linked successfully.", "user": _build_user_payload(current_user)}


@router.post("/unlink-abha")
def unlink_abha(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove the ABHA linkage from the authenticated user account."""
    current_user.is_abha_verified = False
    current_user.abha_number = None
    current_user.abha_address = None
    current_user.abha_meta = None

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return {"success": True, "message": "ABHA ID unlinked.", "user": _build_user_payload(current_user)}
 

# ── ASHA Worker Login ─────────────────────────────────────────────────────────

_ASHA_VALID_IDS = {"ASHA-101", "ASHA-PB-042", "9876543210"}
_ASHA_VALID_MPIN = "1234"

_ASHA_WORKER_PROFILES = {
    "ASHA-101":     {"name": "Sunita Devi",   "sub_center": "Raipur Sub-Center",  "village_code": "PB-JAL-04"},
    "ASHA-PB-042":  {"name": "Sunita Devi",   "sub_center": "Raipur Sub-Center",  "village_code": "PB-JAL-04"},
    "9876543210":   {"name": "Sunita Devi",   "sub_center": "Raipur Sub-Center",  "village_code": "PB-JAL-04"},
}


@router.post("/asha-login")
def asha_login(payload: dict = Body(...)):
    """
    Dedicated login endpoint for ASHA health workers.
    Returns a real, signed JWT with role='asha' on successful credential match.
    """
    worker_id = str(payload.get("worker_id", "")).strip().upper()
    mpin      = str(payload.get("mpin",      "")).strip()

    if worker_id not in _ASHA_VALID_IDS or mpin != _ASHA_VALID_MPIN:
        raise HTTPException(status_code=401, detail="Invalid ASHA Worker ID or M-PIN")

    profile = _ASHA_WORKER_PROFILES.get(worker_id, _ASHA_WORKER_PROFILES["ASHA-101"])

    access_token = create_access_token(
        data={"sub": f"asha_{worker_id}", "role": "asha", "worker_id": worker_id}
    )
    return {
        "access_token": access_token,
        "token_type":   "bearer",
        "worker": {
            "worker_id":    worker_id,
            "name":         profile["name"],
            "sub_center":   profile["sub_center"],
            "village_code": profile["village_code"],
            "role":         "asha",
        },
    }
