import enum
from sqlalchemy import Column, Integer, Text, ForeignKey, DateTime, JSON, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class RiskLevel(str, enum.Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    EMERGENCY = "emergency"

class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id"), nullable=False)
    risk_level = Column(Enum(RiskLevel), default=RiskLevel.LOW, nullable=False)
    reasons = Column(JSON, nullable=True)
    recommendation = Column(Text, nullable=True)
    disclaimer = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("HealthInterviewSession", backref="risk_assessments")
