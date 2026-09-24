"""
Family-centric health records.

The household is the central entity of community care: every member,
pregnancy, visit, vaccination and referral hangs off a household so that an
ASHA worker (and later the family itself, an ANM or a doctor) can see one
family's health picture in one place.
"""
from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class Household(Base):
    __tablename__ = "households"

    id = Column(Integer, primary_key=True, index=True)
    household_code = Column(String, unique=True, index=True, nullable=False)  # e.g. HH-RAI-012

    # Assigned ASHA worker (minimum-necessary access is enforced on this key)
    asha_id = Column(Integer, ForeignKey("asha_workers.id", ondelete="SET NULL"), nullable=True, index=True)

    head_name = Column(String, nullable=False)
    village = Column(String, nullable=False)
    hamlet = Column(String, nullable=True)            # mohalla / tola / ward
    address = Column(String, nullable=True)
    phone = Column(String, nullable=True)

    social_category = Column(String, nullable=True)   # GEN | OBC | SC | ST
    is_bpl = Column(Boolean, default=False, nullable=False)
    drinking_water = Column(String, nullable=True)    # PIPED | HANDPUMP | WELL | OTHER
    has_toilet = Column(Boolean, nullable=True)

    # Consent to record the family's health information (captured at registration)
    consent_given = Column(Boolean, default=False, nullable=False)
    consent_at = Column(DateTime(timezone=True), nullable=True)

    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    members = relationship(
        "FamilyMember",
        back_populates="household",
        cascade="all, delete-orphan",
        order_by="FamilyMember.id",
    )


class FamilyMember(Base):
    __tablename__ = "family_members"

    id = Column(Integer, primary_key=True, index=True)
    household_id = Column(Integer, ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True)

    # Optional link to a citizen account, so a family member who signs up can
    # later see the same records.
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    name = Column(String, nullable=False)
    gender = Column(String, nullable=False)           # F | M | O
    dob = Column(Date, nullable=False)
    dob_estimated = Column(Boolean, default=False, nullable=False)
    relation = Column(String, nullable=True)          # HEAD | SPOUSE | SON | DAUGHTER | ...
    marital_status = Column(String, nullable=True)    # MARRIED | UNMARRIED | WIDOWED | SEPARATED
    phone = Column(String, nullable=True)
    abha_number = Column(String, nullable=True)

    # Birth details (children)
    mother_id = Column(Integer, ForeignKey("family_members.id", ondelete="SET NULL"), nullable=True)
    birth_weight_kg = Column(Float, nullable=True)
    birth_place = Column(String, nullable=True)       # INSTITUTIONAL | HOME

    chronic_conditions = Column(JSON, default=list, nullable=True)  # codes, see services.asha.reference
    enrolled_schemes = Column(JSON, default=list, nullable=True)    # scheme codes the member is enrolled in

    # Latest assessed risk (updated from visits, can be cleared by the ASHA)
    risk_level = Column(String, default="LOW", nullable=False)      # LOW | MODERATE | HIGH
    risk_reasons = Column(JSON, default=list, nullable=True)

    status = Column(String, default="ACTIVE", nullable=False)       # ACTIVE | MIGRATED | DECEASED
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    household = relationship("Household", back_populates="members")
