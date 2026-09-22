from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Union

class SendOTPRequest(BaseModel):
    email: EmailStr
    phone: str = Field(..., pattern=r"^[6-9]\d{9}$")

class VerifyAndRegisterRequest(BaseModel):
    email: EmailStr
    otp_code: str = Field(..., min_length=6, max_length=6)
    password: str = Field(..., min_length=6)
    full_name: str
    phone: str = Field(..., pattern=r"^[6-9]\d{9}$")
    username: str = Field(..., min_length=3, max_length=30, pattern=r"^[a-zA-Z0-9_]+$")

class UserLogin(BaseModel):
    identifier: str  # email or phone or username
    password: str

class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    # Accept both snake_case and the legacy camelCase the frontend may send
    phone: Optional[str] = None
    phone_number: Optional[str] = None          # alias for phone
    age: Optional[Union[int, str, None]] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    bloodGroup: Optional[str] = None            # camelCase fallback
    village_town: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    chronic_conditions: Optional[List[str]] = None
    allergies: Optional[List[str]] = None

class UserProfileResponse(BaseModel):
    id: int
    full_name: str
    email: str
    phone_number: Optional[str] = None
    role: str
    is_active: bool

    patient_id: Optional[str] = None
    phone: Optional[str] = None
    username: Optional[str] = None
    is_email_verified: Optional[bool] = False
    is_profile_completed: Optional[bool] = False
    age: Optional[int] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    village_town: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    chronic_conditions: Optional[List[str]] = []
    allergies: Optional[List[str]] = []

    # Computed / normalised fields ─────────────────────────────────────────
    abha_id: Optional[str] = None

    @classmethod
    def model_validate(cls, obj, **kwargs):  # type: ignore[override]
        """Normalise ORM → schema before Pydantic validation runs.

        Supports three input shapes:
        1. SQLAlchemy ORM model instance (has ``__table__``)
        2. Any other object with attributes (dataclass, mock, etc.)
        3. Plain dict
        """
        # ── Extract a mutable dict from the source object ──────────────────
        if hasattr(obj, '__table__'):
            # Real SQLAlchemy model — read column values by name
            data: dict = {c: getattr(obj, c, None) for c in obj.__table__.columns.keys()}
        elif isinstance(obj, dict):
            data = dict(obj)
        else:
            # Generic object (dataclass, mock, Pydantic model, …)
            # getattr for every field declared on this schema, plus id/email/role/is_active
            _fields = list(cls.model_fields.keys()) + ['id', 'email', 'role', 'is_active']
            data = {f: getattr(obj, f, None) for f in set(_fields)}

        # ── Normalise full_name ─────────────────────────────────────────────
        if not data.get('full_name'):
            email_val = str(data.get('email') or '')
            data['full_name'] = email_val.split('@')[0] if email_val else 'User'

        # ── Normalise patient_id / abha_id (deterministic) ─────────────────
        if not data.get('patient_id'):
            data['patient_id'] = f"SM-2026-{int(data.get('id') or 0):04d}"
        data['abha_id'] = data.get('abha_id') or data['patient_id']

        return super().model_validate(data, **kwargs)

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class VerifyPasswordRequest(BaseModel):
    password: str

class ForgotPasswordRequest(BaseModel):
    identifier: str  # Email or username

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp_code: str
    new_password: str = Field(..., min_length=6)

class FirebaseLoginRequest(BaseModel):
    email: EmailStr
    full_name: Optional[str] = ""
    username: Optional[str] = ""
    phone: Optional[str] = ""
