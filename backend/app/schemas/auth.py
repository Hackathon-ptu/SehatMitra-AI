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
    phone: Optional[str] = None
    age: Optional[Union[int, str, None]] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
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
    email: EmailStr
    phone_number: Optional[str] = None
    role: str
    is_active: bool
    
    patient_id: Optional[str] = None
    phone: Optional[str] = None
    username: Optional[str] = None
    is_email_verified: bool
    is_profile_completed: bool
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
