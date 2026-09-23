from pydantic import BaseModel, Field
from typing import Any, Dict, Optional, List
from datetime import datetime
from enum import Enum


class AshaRiskLevelEnum(str, Enum):
    MILD = "Mild"
    MODERATE = "Moderate"
    SEVERE = "Severe"


# ── ASHA Voice Survey ─────────────────────────────────────────────────────────

class AshaVoiceSurveyRequest(BaseModel):
    transcript: str = Field(..., min_length=5, description="Raw vernacular ASHA field report text")
    lang: str = Field("hi", description="BCP-47 language code, e.g. 'hi', 'pa', 'bn'")


class AshaVoiceSurveyResponse(BaseModel):
    beneficiary_name: str
    age: int
    case_type: str
    risk_level: str          # GREEN_NORMAL | YELLOW_MONITOR | RED_LAL_PATAKA
    red_flag_alert: bool
    gestational_week: Optional[str] = None
    vitals: Dict[str, Any]
    suspected_condition: str
    clinical_summary: str
    action_plan: str
    referral_needed: bool
    _engine: Optional[str] = None   # internal: which backend served the request


# ── ASHA Case Submit ──────────────────────────────────────────────────────────

class AshaCaseSubmitRequest(BaseModel):
    transcript: str = Field(..., min_length=5)
    lang: str = Field("hi")
    village: str = Field(..., min_length=2, max_length=120)
    # optional manual override / enrichment from ASHA app form
    patient_name: Optional[str] = None
    age: Optional[int] = Field(None, ge=0, le=120)
    gender: Optional[str] = Field(None, pattern=r"^(Male|Female|Other)$")
    bp_systolic: Optional[int] = Field(None, ge=50, le=300)
    bp_diastolic: Optional[int] = Field(None, ge=30, le=200)


class AshaCaseSubmitResponse(BaseModel):
    case_id: int
    risk_level: str
    red_flag_alert: bool
    referral_needed: bool
    opd_token: Optional[str] = None          # set if RED_LAL_PATAKA → OPD queue
    incentive_inr: int                        # ₹100 routine / ₹300 high-risk
    clinical_summary: str
    action_plan: str


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
