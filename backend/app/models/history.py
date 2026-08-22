from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from app.db.base import Base

class ConsultationHistory(Base):
    __tablename__ = "consultation_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_id = Column(Integer, nullable=True)
    language = Column(String, default="hi", nullable=False)
    conversation_history = Column(JSON, nullable=True)  # List of messages
    risk_level = Column(String, nullable=True)
    reasons = Column(JSON, nullable=True)  # List of reason strings
    recommendation = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ReportHistory(Base):
    __tablename__ = "report_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String, nullable=False)
    extracted_data = Column(JSON, nullable=True)  # Key-value biomarkers JSON
    explanation = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
