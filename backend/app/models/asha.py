"""
ASHA (Accredited Social Health Activist) workforce and care records.

Clinical records (pregnancies, visits, immunizations, referrals) belong to a
family member; the ASHA who recorded them is kept for accountability.
"""
from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class AshaWorker(Base):
    __tablename__ = "asha_workers"

    id = Column(Integer, primary_key=True, index=True)
    worker_code = Column(String, unique=True, index=True, nullable=False)  # e.g. ASHA-101
    phone = Column(String, unique=True, index=True, nullable=True)
    mpin_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)

    # Posting
    village = Column(String, nullable=True)
    sub_center = Column(String, nullable=True)
    phc = Column(String, nullable=True)
    block = Column(String, nullable=True)
    district = Column(String, nullable=True)
    state = Column(String, nullable=True)
    population_covered = Column(Integer, nullable=True)

    # Supervision chain (ASHA Facilitator / ANM); room for a supervisor role later
    supervisor_name = Column(String, nullable=True)
    supervisor_phone = Column(String, nullable=True)

    preferred_language = Column(String, default="hi", nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Pregnancy(Base):
    __tablename__ = "pregnancies"

    id = Column(Integer, primary_key=True, index=True)
    member_id = Column(Integer, ForeignKey("family_members.id", ondelete="CASCADE"), nullable=False, index=True)
    registered_by = Column(Integer, ForeignKey("asha_workers.id", ondelete="SET NULL"), nullable=True)

    lmp_date = Column(Date, nullable=False)
    edd = Column(Date, nullable=False)
    registered_on = Column(Date, nullable=False)
    gravida = Column(Integer, nullable=True)          # number of pregnancies including this one
    parity = Column(Integer, nullable=True)           # number of previous births
    rch_id = Column(String, nullable=True)

    high_risk = Column(Boolean, default=False, nullable=False)
    risk_factors = Column(JSON, default=list, nullable=True)

    status = Column(String, default="ACTIVE", nullable=False)   # ACTIVE | DELIVERED | ENDED
    outcome = Column(String, nullable=True)           # LIVE_BIRTH | STILLBIRTH | MISCARRIAGE | ABORTION
    outcome_date = Column(Date, nullable=True)
    delivery_place = Column(String, nullable=True)    # INSTITUTIONAL | HOME
    facility_name = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    member = relationship("FamilyMember", backref="pregnancies")


class CareVisit(Base):
    """A home visit / screening recorded by an ASHA worker."""
    __tablename__ = "care_visits"

    id = Column(Integer, primary_key=True, index=True)
    household_id = Column(Integer, ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True)
    member_id = Column(Integer, ForeignKey("family_members.id", ondelete="CASCADE"), nullable=True, index=True)
    pregnancy_id = Column(Integer, ForeignKey("pregnancies.id", ondelete="SET NULL"), nullable=True, index=True)
    asha_id = Column(Integer, ForeignKey("asha_workers.id", ondelete="SET NULL"), nullable=True, index=True)

    visit_type = Column(String, nullable=False)       # GENERAL | ANC | HBNC | HBYC | NCD | FOLLOW_UP
    schedule_key = Column(String, nullable=True)      # which scheduled item this satisfies, e.g. ANC_2, HBNC_D7
    visit_date = Column(Date, nullable=False)

    # Vitals / measurements
    bp_systolic = Column(Integer, nullable=True)
    bp_diastolic = Column(Integer, nullable=True)
    weight_kg = Column(Float, nullable=True)
    temperature_c = Column(Float, nullable=True)
    pulse = Column(Integer, nullable=True)
    spo2 = Column(Integer, nullable=True)
    hb = Column(Float, nullable=True)
    blood_sugar = Column(Integer, nullable=True)      # random, mg/dL
    muac_cm = Column(Float, nullable=True)

    danger_signs = Column(JSON, default=list, nullable=True)        # codes
    findings = Column(JSON, default=dict, nullable=True)            # type-specific answers (CBAC, feeding, ...)
    counselling = Column(JSON, default=list, nullable=True)         # topic codes
    notes = Column(Text, nullable=True)

    risk_level = Column(String, default="LOW", nullable=False)      # LOW | MODERATE | HIGH
    risk_reasons = Column(JSON, default=list, nullable=True)
    next_followup_date = Column(Date, nullable=True)

    input_mode = Column(String, default="FORM", nullable=False)     # FORM | VOICE
    voice_transcript = Column(Text, nullable=True)
    client_ref = Column(String, nullable=True, index=True)          # idempotency key for offline sync

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Immunization(Base):
    __tablename__ = "immunizations"

    id = Column(Integer, primary_key=True, index=True)
    member_id = Column(Integer, ForeignKey("family_members.id", ondelete="CASCADE"), nullable=False, index=True)
    vaccine_code = Column(String, nullable=False)     # see services.asha.reference.VACCINES
    given_on = Column(Date, nullable=False)
    given_at = Column(String, nullable=True)          # VHSND / sub-centre / PHC name
    recorded_by = Column(Integer, ForeignKey("asha_workers.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Referral(Base):
    __tablename__ = "referrals"

    id = Column(Integer, primary_key=True, index=True)
    household_id = Column(Integer, ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True)
    member_id = Column(Integer, ForeignKey("family_members.id", ondelete="CASCADE"), nullable=False, index=True)
    visit_id = Column(Integer, ForeignKey("care_visits.id", ondelete="SET NULL"), nullable=True)
    asha_id = Column(Integer, ForeignKey("asha_workers.id", ondelete="SET NULL"), nullable=True, index=True)

    reason = Column(Text, nullable=False)
    urgency = Column(String, default="ROUTINE", nullable=False)     # ROUTINE | URGENT | EMERGENCY
    facility_type = Column(String, nullable=True)                   # SC | PHC | CHC | DH
    facility_name = Column(String, nullable=True)
    referred_on = Column(Date, nullable=False)

    status = Column(String, default="PENDING", nullable=False)      # PENDING | VISITED | NOT_VISITED | CLOSED
    visited_on = Column(Date, nullable=True)
    outcome_notes = Column(Text, nullable=True)

    # Emergency referrals get a token the hospital Doctor Cockpit can open
    opd_token = Column(String, nullable=True, unique=True, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    member = relationship("FamilyMember")


class AshaActivity(Base):
    """Community activities that are not tied to one family (VHSND, meetings, awareness)."""
    __tablename__ = "asha_activities"

    id = Column(Integer, primary_key=True, index=True)
    asha_id = Column(Integer, ForeignKey("asha_workers.id", ondelete="CASCADE"), nullable=False, index=True)
    activity_type = Column(String, nullable=False)    # VHSND | MOTHERS_MEETING | VHSNC | AWARENESS | OTHER
    activity_date = Column(Date, nullable=False)
    topic = Column(String, nullable=True)
    participants = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AshaAuditLog(Base):
    """Who read or changed which family record, and when."""
    __tablename__ = "asha_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    asha_id = Column(Integer, ForeignKey("asha_workers.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String, nullable=False)           # VIEW | CREATE | UPDATE | DELETE | LOGIN
    entity = Column(String, nullable=False)           # household | member | visit | ...
    entity_id = Column(Integer, nullable=True)
    detail = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
