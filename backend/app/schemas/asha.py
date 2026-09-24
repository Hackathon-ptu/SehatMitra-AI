"""Request bodies for the ASHA portal API (responses are assembled in the endpoint module)."""
from datetime import date
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field, field_validator

from app.services.asha import reference as ref

Gender = Literal["F", "M", "O"]
Urgency = Literal["ROUTINE", "URGENT", "EMERGENCY"]


class AshaLoginRequest(BaseModel):
    worker_id: str = Field(..., min_length=3, description="ASHA worker code or registered mobile number")
    mpin: str = Field(..., min_length=4, max_length=6)


# ── Households & members ─────────────────────────────────────────────────────

class MemberIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    gender: Gender
    dob: Optional[date] = None
    age_years: Optional[int] = Field(None, ge=0, le=120, description="Used when the exact date of birth is unknown")
    relation: Optional[str] = None
    marital_status: Optional[str] = None
    phone: Optional[str] = Field(None, max_length=15)
    abha_number: Optional[str] = Field(None, max_length=20)
    mother_id: Optional[int] = None
    birth_weight_kg: Optional[float] = Field(None, gt=0, lt=7)
    birth_place: Optional[Literal["INSTITUTIONAL", "HOME"]] = None
    chronic_conditions: List[str] = []
    enrolled_schemes: List[str] = []
    notes: Optional[str] = None

    @field_validator("chronic_conditions")
    @classmethod
    def _known_conditions(cls, v):
        return [c for c in v if c in ref.CHRONIC_CONDITIONS]

    @field_validator("enrolled_schemes")
    @classmethod
    def _known_schemes(cls, v):
        return [c for c in v if c in ref.SCHEMES]


class MemberUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    gender: Optional[Gender] = None
    dob: Optional[date] = None
    relation: Optional[str] = None
    marital_status: Optional[str] = None
    phone: Optional[str] = Field(None, max_length=15)
    abha_number: Optional[str] = Field(None, max_length=20)
    chronic_conditions: Optional[List[str]] = None
    enrolled_schemes: Optional[List[str]] = None
    status: Optional[Literal["ACTIVE", "MIGRATED", "DECEASED"]] = None
    risk_level: Optional[Literal["LOW", "MODERATE", "HIGH"]] = None
    notes: Optional[str] = None


class HouseholdIn(BaseModel):
    head_name: str = Field(..., min_length=1, max_length=120)
    village: Optional[str] = None
    hamlet: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = Field(None, max_length=15)
    social_category: Optional[Literal["GEN", "OBC", "SC", "ST"]] = None
    is_bpl: bool = False
    drinking_water: Optional[Literal["PIPED", "HANDPUMP", "WELL", "OTHER"]] = None
    has_toilet: Optional[bool] = None
    consent_given: bool
    members: List[MemberIn] = []
    notes: Optional[str] = None


class HouseholdUpdate(BaseModel):
    head_name: Optional[str] = Field(None, min_length=1, max_length=120)
    hamlet: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = Field(None, max_length=15)
    social_category: Optional[Literal["GEN", "OBC", "SC", "ST"]] = None
    is_bpl: Optional[bool] = None
    drinking_water: Optional[Literal["PIPED", "HANDPUMP", "WELL", "OTHER"]] = None
    has_toilet: Optional[bool] = None
    notes: Optional[str] = None


# ── Pregnancy ────────────────────────────────────────────────────────────────

class PregnancyIn(BaseModel):
    lmp_date: date
    gravida: Optional[int] = Field(None, ge=1, le=15)
    parity: Optional[int] = Field(None, ge=0, le=15)
    rch_id: Optional[str] = None
    risk_factors: List[str] = []


class BabyIn(BaseModel):
    name: Optional[str] = None
    gender: Gender
    birth_weight_kg: Optional[float] = Field(None, gt=0, lt=7)


class PregnancyOutcomeIn(BaseModel):
    outcome: Literal["LIVE_BIRTH", "STILLBIRTH", "MISCARRIAGE", "ABORTION"]
    outcome_date: date
    delivery_place: Optional[Literal["INSTITUTIONAL", "HOME"]] = None
    facility_name: Optional[str] = None
    babies: List[BabyIn] = []


# ── Visits ───────────────────────────────────────────────────────────────────

class VisitIn(BaseModel):
    member_id: int
    visit_type: Literal["GENERAL", "ANC", "HBNC", "HBYC", "NCD", "FOLLOW_UP"]
    schedule_key: Optional[str] = None
    visit_date: Optional[date] = None

    bp_systolic: Optional[int] = Field(None, ge=50, le=260)
    bp_diastolic: Optional[int] = Field(None, ge=30, le=160)
    weight_kg: Optional[float] = Field(None, gt=0, lt=250)
    temperature_c: Optional[float] = Field(None, ge=30, le=45)
    pulse: Optional[int] = Field(None, ge=20, le=250)
    spo2: Optional[int] = Field(None, ge=50, le=100)
    hb: Optional[float] = Field(None, ge=2, le=20)
    blood_sugar: Optional[int] = Field(None, ge=20, le=700)
    muac_cm: Optional[float] = Field(None, ge=5, le=30)

    danger_signs: List[str] = []
    findings: Dict[str, Any] = {}
    counselling: List[str] = []
    notes: Optional[str] = Field(None, max_length=2000)
    next_followup_date: Optional[date] = None

    input_mode: Literal["FORM", "VOICE"] = "FORM"
    voice_transcript: Optional[str] = Field(None, max_length=5000)
    client_ref: Optional[str] = Field(None, max_length=64, description="Idempotency key from the offline outbox")

    # Optional referral raised in the same step
    referral: Optional["ReferralFields"] = None

    @field_validator("danger_signs")
    @classmethod
    def _known_signs(cls, v):
        return [s for s in v if s in ref.DANGER_SIGNS]

    @field_validator("counselling")
    @classmethod
    def _known_topics(cls, v):
        return [s for s in v if s in ref.COUNSELLING_TOPICS]


class ReferralFields(BaseModel):
    reason: str = Field(..., min_length=2, max_length=500)
    urgency: Urgency = "ROUTINE"
    facility_type: Optional[Literal["SC", "PHC", "CHC", "DH"]] = None
    facility_name: Optional[str] = None


VisitIn.model_rebuild()


class VoiceParseIn(BaseModel):
    transcript: str = Field(..., min_length=5, max_length=5000)
    lang: str = "hi"
    visit_type: Optional[str] = None


# ── Immunization ─────────────────────────────────────────────────────────────

class ImmunizationIn(BaseModel):
    vaccines: List[str] = Field(..., min_length=1)
    given_on: Optional[date] = None
    given_at: Optional[str] = None
    client_ref: Optional[str] = Field(None, max_length=64)

    @field_validator("vaccines")
    @classmethod
    def _known_vaccines(cls, v):
        bad = [c for c in v if c not in ref.ALL_VACCINE_CODES]
        if bad:
            raise ValueError(f"Unknown vaccine codes: {', '.join(bad)}")
        return v


# ── Referrals ────────────────────────────────────────────────────────────────

class ReferralIn(ReferralFields):
    member_id: int
    visit_id: Optional[int] = None


class ReferralUpdate(BaseModel):
    status: Literal["PENDING", "VISITED", "NOT_VISITED", "CLOSED"]
    visited_on: Optional[date] = None
    outcome_notes: Optional[str] = Field(None, max_length=1000)


# ── Activities ───────────────────────────────────────────────────────────────

class ActivityIn(BaseModel):
    activity_type: Literal["VHSND", "MOTHERS_MEETING", "VHSNC", "AWARENESS", "OTHER"]
    activity_date: Optional[date] = None
    topic: Optional[str] = Field(None, max_length=200)
    participants: Optional[int] = Field(None, ge=0, le=5000)
    notes: Optional[str] = Field(None, max_length=1000)
