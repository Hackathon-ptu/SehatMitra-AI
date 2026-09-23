import enum
from sqlalchemy import Column, Integer, String, Boolean, Float, Text, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class AshaRiskLevel(str, enum.Enum):
    MILD = "Mild"
    MODERATE = "Moderate"
    SEVERE = "Severe"


class AshaVisit(Base):
    """
    Stores door-to-door household health screening records submitted by ASHA workers.
    """
    __tablename__ = "asha_visits"

    id = Column(Integer, primary_key=True, index=True)

    # FK to the ASHA worker who conducted the visit
    asha_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Patient / Household details
    patient_name = Column(String, nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String, nullable=False)
    village = Column(String, nullable=False)

    # Vitals
    bp_systolic = Column(Integer, nullable=True)
    bp_diastolic = Column(Integer, nullable=True)
    blood_sugar = Column(Integer, nullable=True)     # mg/dL
    spo2 = Column(Integer, nullable=True)            # percentage
    pulse = Column(Integer, nullable=True)           # bpm

    # Clinical assessment
    symptoms = Column(Text, nullable=True)           # comma-separated list
    risk_level = Column(Enum(AshaRiskLevel), nullable=False, default=AshaRiskLevel.MILD)
    referral_needed = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship back to the ASHA worker
    asha_worker = relationship("User", backref="asha_visits", lazy="select")


# ── AshaCase — AI-triaged ASHA field case with OPD queue & incentive ──────────

class AshaCase(Base):
    """
    Stores an AI-triaged ASHA voice-survey case.
    RED_LAL_PATAKA cases automatically get an OPD token written here.
    """
    __tablename__ = "asha_cases"

    id = Column(Integer, primary_key=True, index=True)

    # FK to the ASHA worker who submitted the case
    asha_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Core clinical fields (mirroring AshaVoiceSurveyResponse)
    patient_name = Column(String, nullable=False)
    age = Column(Integer, nullable=True)
    gender = Column(String, nullable=True)
    village = Column(String, nullable=False)
    transcript = Column(Text, nullable=False)
    lang = Column(String, default="hi", nullable=False)

    case_type = Column(String, nullable=False, default="GENERAL")
    risk_level = Column(String, nullable=False, default="GREEN_NORMAL")
    red_flag_alert = Column(Boolean, default=False, nullable=False)
    gestational_week = Column(String, nullable=True)
    vitals_json = Column(Text, nullable=True)          # JSON-encoded vitals dict
    suspected_condition = Column(String, nullable=True)
    clinical_summary = Column(Text, nullable=True)
    action_plan = Column(Text, nullable=True)
    referral_needed = Column(Boolean, default=False, nullable=False)

    # OPD queue token (set when risk_level == RED_LAL_PATAKA)
    opd_token = Column(String, nullable=True, index=True)

    # Incentive payment record
    incentive_inr = Column(Integer, nullable=False, default=100)

    # Engine that produced the triage (groq / gemini / heuristic)
    triage_engine = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    asha_worker = relationship("User", backref="asha_cases", lazy="select")
