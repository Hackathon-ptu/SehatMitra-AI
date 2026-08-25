import random
import string
import re
import secrets
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
from app.services.email_service import send_otp_email
from app.services.otp_service import generate_and_store_otp
from app.api.v1.deps import get_current_user

router = APIRouter()

from typing import Dict, Any

OTP_STORE: Dict[str, dict] = {}

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
async def send_otp_handler(request: Request, db: Session = Depends(get_db)):
    try:
        body = await request.json()
    except Exception:
        body = {}
    
    email = str(body.get("email", "")).strip().lower()
    name = str(body.get("name", "")).strip()
    password = str(body.get("password", "")).strip()

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
    print(f"[SEHATMITRA OTP CODE] {email} -> {code}", flush=True)
    print(f"====================================\n", flush=True)
    sys.stdout.flush()

    try:
        send_otp_email(email, code)
    except Exception as email_err:
        print(f"Email delivery failed: {email_err}")

    return {"success": True, "message": f"OTP successfully dispatched to {email}", "dev_otp": code}

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

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "patient_id": new_user.patient_id,
            "username": new_user.username,
            "email": new_user.email,
            "full_name": new_user.full_name,
            "is_profile_completed": False
        }
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
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "patient_id": user.patient_id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "is_profile_completed": user.is_profile_completed
        }
    }

@router.get("/me", response_model=UserProfileResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/profile")
@router.put("/profile")
@router.post("/complete-profile")
@router.put("/complete-profile")
def update_profile(
    payload: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if payload.age is not None:
        try:
            if isinstance(payload.age, str):
                cleaned_age = payload.age.strip()
                if cleaned_age:
                    current_user.age = int(float(cleaned_age))
                else:
                    current_user.age = None
            else:
                current_user.age = int(payload.age)
        except Exception:
            current_user.age = None
    else:
        current_user.age = None
    if payload.gender is not None:
        current_user.gender = payload.gender
    if payload.blood_group is not None:
        current_user.blood_group = payload.blood_group
    if payload.village_town is not None:
        current_user.village_town = payload.village_town
    if payload.district is not None:
        current_user.district = payload.district
    if payload.state is not None:
        current_user.state = payload.state
    if payload.pincode is not None:
        current_user.pincode = payload.pincode
    if payload.emergency_contact_name is not None:
        current_user.emergency_contact_name = payload.emergency_contact_name
    if payload.emergency_contact_phone is not None:
        current_user.emergency_contact_phone = payload.emergency_contact_phone
    if payload.chronic_conditions is not None:
        current_user.chronic_conditions = payload.chronic_conditions
    if payload.allergies is not None:
        current_user.allergies = payload.allergies
    current_user.is_profile_completed = True

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    
    return {
        "success": True,
        "message": "Medical profile updated successfully.",
        "user": {
            "id": current_user.id,
            "patient_id": getattr(current_user, "patient_id", f"SM-2026-{current_user.id:04d}"),
            "full_name": current_user.full_name,
            "username": current_user.username,
            "email": current_user.email,
            "phone": current_user.phone,
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
    if not hash_val:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User password hash not configured."
        )
    is_correct = verify_password(payload.password, hash_val)
    if not is_correct:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect password"
        )
    return {"success": True, "message": "Password verified"}

@router.post("/firebase-login")
async def firebase_login_handler(request: Request, db: Session = Depends(get_db)):
    try:
        body = await request.json()
    except Exception:
        body = {}

    email = str(body.get("email", "")).strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required.")
        
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        # Create user
        # Generate patient ID
        import secrets
        import string
        while True:
            suffix = "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(5))
            patient_id = f"SM-2026-{suffix}"
            exists = db.query(User).filter(User.patient_id == patient_id).first()
            if not exists:
                break
        
        # Check username uniqueness, fallback to email prefix if not specified or already taken
        name = str(body.get("displayName") or body.get("name") or email.split("@")[0])
        base_username = name
        base_username = re.sub(r'[^a-zA-Z0-9_]', '', base_username).lower()
        username = base_username
        
        # Ensure username uniqueness
        counter = 1
        while db.query(User).filter(User.username == username).first():
            username = f"{base_username}_{counter}"
            counter += 1

        user = User(
            full_name=name or username,
            email=email,
            hashed_password=get_password_hash(secrets.token_hex(16)), # dummy password since Auth is done via Firebase
            phone=None,
            username=username,
            patient_id=patient_id,
            is_email_verified=True,
            is_profile_completed=False,
            role=UserRole.PATIENT,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token(data={"sub": str(user.id), "role": user.role})
    
    return {
        "success": True,
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "uid": str(body.get("uid", email)),
            "email": email,
            "displayName": user.full_name,
            "id": user.id,
            "patient_id": user.patient_id,
            "username": user.username,
            "is_profile_completed": user.is_profile_completed
        }
    }

@router.post("/verify-otp")
async def verify_otp_handler(request: Request, db: Session = Depends(get_db)):
    try:
        body = await request.json()
    except Exception:
        body = {}

    email = str(body.get("email", "")).strip().lower()
    otp = str(body.get("otp", "")).strip()
    
    stored = OTP_STORE.get(email)
    if not stored or stored["otp"] != otp:
        raise HTTPException(
            status_code=400,
            detail="Invalid verification code or email"
        )
    if datetime.utcnow() > stored["expires_at"]:
        raise HTTPException(
            status_code=400,
            detail="Verification code expired"
        )
    
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
            full_name=stored["name"] or username,
            email=email,
            hashed_password=get_password_hash(stored["password"] or secrets.token_hex(16)),
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
        "message": "Verification successful",
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