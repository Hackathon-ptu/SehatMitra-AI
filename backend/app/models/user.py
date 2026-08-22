from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, JSON
from sqlalchemy.sql import func
import enum
from app.db.base import Base

class UserRole(str, enum.Enum):
    PATIENT = "patient"
    DOCTOR = "doctor"
    ADMIN = "admin"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    phone_number = Column(String, nullable=True)
    role = Column(Enum(UserRole), default=UserRole.PATIENT, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Verified Anti-Fake Auth Pipeline & Profile Fields
    patient_id = Column(String, unique=True, index=True, nullable=True)
    phone = Column(String, unique=True, index=True, nullable=True)
    username = Column(String, unique=True, index=True, nullable=True)
    is_email_verified = Column(Boolean, default=False, nullable=False)
    is_profile_completed = Column(Boolean, default=False, nullable=False)
    age = Column(Integer, nullable=True)
    gender = Column(String, nullable=True)
    blood_group = Column(String, nullable=True)
    village_town = Column(String, nullable=True)
    district = Column(String, nullable=True)
    state = Column(String, nullable=True)
    pincode = Column(String, nullable=True)
    emergency_contact_name = Column(String, nullable=True)
    emergency_contact_phone = Column(String, nullable=True)
    chronic_conditions = Column(JSON, default=list, nullable=True)
    allergies = Column(JSON, default=list, nullable=True)