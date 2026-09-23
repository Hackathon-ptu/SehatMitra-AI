"""
OpdToken — SQLAlchemy model for the OPD queue.
Persisted to SQLite / Turso so queue state survives restarts and
is consistent across all Vercel / Render instances.
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, JSON, String

from app.db.base import Base


class OpdToken(Base):
    __tablename__ = "opd_tokens"

    id              = Column(Integer, primary_key=True, index=True)
    token_id        = Column(String, unique=True, index=True, nullable=False)   # e.g. "OPD-GRN-ZI0T2V"
    patient_name    = Column(String, nullable=False)
    age             = Column(Integer, nullable=True)
    gender          = Column(String, nullable=True)
    chief_complaint = Column(String, nullable=True)
    pain_scale      = Column(Integer, nullable=True)
    vitals          = Column(JSON, nullable=True)        # bp, pulse, spo2, temp + nurse flags
    red_flag        = Column(Boolean, default=False, nullable=False)
    red_flag_reason = Column(String, nullable=True)
    status          = Column(
        String,
        default="TRIAGE_PENDING",
        nullable=False,
    )                                                   # TRIAGE_PENDING | EMERGENCY_TRIAGE | READY_FOR_DOCTOR | IN_CONSULTATION | COMPLETED | CANCELLED
    assigned_cabin  = Column(String, default="Cabin 1 - General", nullable=True)
    cancelled_at    = Column(DateTime, nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow, nullable=False)
