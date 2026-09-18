from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class AshaRiskLevelEnum(str, Enum):
    MILD = "Mild"
    MODERATE = "Moderate"
    SEVERE = "Severe"


# ── Request Schemas ──────────────────────────────────────────────────────────

class AshaVisitCreate(BaseModel):
    patient_name: str = Field(..., min_length=2, max_length=120)
    age: int = Field(..., ge=0, le=120)
    gender: str = Field(..., pattern=r"^(Male|Female|Other)$")
    village: str = Field(..., min_length=2, max_length=120)

    bp_systolic: Optional[int] = Field(None, ge=50, le=300)
    bp_diastolic: Optional[int] = Field(None, ge=30, le=200)
    blood_sugar: Optional[int] = Field(None, ge=30, le=800)
    spo2: Optional[int] = Field(None, ge=50, le=100)
    pulse: Optional[int] = Field(None, ge=20, le=300)

    symptoms: Optional[str] = None          # comma-separated string
    risk_level: AshaRiskLevelEnum = AshaRiskLevelEnum.MILD
    referral_needed: bool = False


class AshaVisitUpdate(BaseModel):
    bp_systolic: Optional[int] = None
    bp_diastolic: Optional[int] = None
    blood_sugar: Optional[int] = None
    spo2: Optional[int] = None
    pulse: Optional[int] = None
    symptoms: Optional[str] = None
    risk_level: Optional[AshaRiskLevelEnum] = None
    referral_needed: Optional[bool] = None


# ── Response Schemas ─────────────────────────────────────────────────────────

class AshaVisitResponse(BaseModel):
    id: int
    asha_id: int
    patient_name: str
    age: int
    gender: str
    village: str
    bp_systolic: Optional[int] = None
    bp_diastolic: Optional[int] = None
    blood_sugar: Optional[int] = None
    spo2: Optional[int] = None
    pulse: Optional[int] = None
    symptoms: Optional[str] = None
    risk_level: str
    referral_needed: bool
    created_at: datetime

    class Config:
        from_attributes = True


class AshaVisitListResponse(BaseModel):
    visits: List[AshaVisitResponse]
    total: int
    high_risk_count: int
    referral_count: int
