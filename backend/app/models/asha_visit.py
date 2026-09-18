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
