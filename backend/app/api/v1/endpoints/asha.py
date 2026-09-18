"""
ASHA Worker Portal — Protected Endpoints
=========================================
All routes in this router require the caller to be an authenticated user
with role ``asha`` or ``admin``.  Regular patients (role ``patient``) and
doctors (role ``doctor``) will receive HTTP 403 Forbidden.

ABDM-Compliance note
--------------------
Visit records are scoped per ASHA worker (asha_id = current_user.id) so
that no ASHA can read or mutate another worker's household visit records.
Admins can query all records for supervisory / HMIS reporting purposes.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.api.v1.deps import require_asha, get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.asha_visit import AshaVisit, AshaRiskLevel
from app.schemas.asha import (
    AshaVisitCreate,
    AshaVisitUpdate,
    AshaVisitResponse,
    AshaVisitListResponse,
)

router = APIRouter()


# ── Helpers ──────────────────────────────────────────────────────────────────

def _auto_risk(data: AshaVisitCreate) -> str:
    """
    Deterministic clinical rule engine — derives risk_level from vitals when
    the caller submits raw measurements, overriding the user-supplied value.
    """
    level = "Mild"

    # SpO2 checks
    if data.spo2 is not None:
        if data.spo2 < 90:
            return "Severe"
        elif data.spo2 < 94:
            level = "Moderate"

    # BP checks
    if data.bp_systolic is not None:
        if data.bp_systolic >= 160 or (data.bp_diastolic and data.bp_diastolic >= 100):
            return "Severe"
        elif data.bp_systolic >= 140 or (data.bp_diastolic and data.bp_diastolic >= 90):
            level = "Moderate"
        elif data.bp_systolic < 85:
            return "Severe"

    # Blood sugar
    if data.blood_sugar is not None:
        if data.blood_sugar > 400 or data.blood_sugar < 60:
            return "Severe"
        elif data.blood_sugar > 200:
            if level == "Mild":
                level = "Moderate"

    # Pulse
    if data.pulse is not None:
        if data.pulse > 130 or data.pulse < 40:
            return "Severe"
        elif data.pulse > 100 or data.pulse < 50:
            if level == "Mild":
                level = "Moderate"

    return level


# ── Routes ───────────────────────────────────────────────────────────────────

@router.post(
    "/visits",
    response_model=AshaVisitResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record a new door-to-door household health visit",
)
def create_asha_visit(
    payload: AshaVisitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_asha),
):
    """
    Submit a new patient health screening conducted during a home visit.
    The risk_level is auto-computed from vitals; the submitted value is
    used as a fallback only when no vitals are provided.
    Referral is automatically flagged as required for any Severe case.
    """
    computed_risk = _auto_risk(payload)
    referral = payload.referral_needed or (computed_risk == "Severe")

    visit = AshaVisit(
        asha_id=current_user.id,
        patient_name=payload.patient_name,
        age=payload.age,
        gender=payload.gender,
        village=payload.village,
        bp_systolic=payload.bp_systolic,
        bp_diastolic=payload.bp_diastolic,
        blood_sugar=payload.blood_sugar,
        spo2=payload.spo2,
        pulse=payload.pulse,
        symptoms=payload.symptoms,
        risk_level=AshaRiskLevel(computed_risk),
        referral_needed=referral,
    )
    db.add(visit)
    db.commit()
    db.refresh(visit)
    return visit


@router.get(
    "/visits",
    response_model=AshaVisitListResponse,
    summary="List all visits recorded by the current ASHA worker",
)
def list_my_visits(
    village: Optional[str] = Query(None, description="Filter by village name"),
    risk: Optional[str] = Query(None, description="Filter by risk level (Mild/Moderate/Severe)"),
    referral_only: bool = Query(False, description="Return only patients who need referral"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_asha),
):
    """
    Returns the paginated list of visits for the authenticated ASHA worker.
    Admins can see all visits; ASHA workers see only their own records.
    """
    q = db.query(AshaVisit)

    # Scope to current worker unless admin
    if current_user.role not in ("admin", "asha"):  # belt-and-suspenders
        raise HTTPException(status_code=403, detail="Insufficient role.")
    if current_user.role == "asha":
        q = q.filter(AshaVisit.asha_id == current_user.id)

    if village:
        q = q.filter(AshaVisit.village.ilike(f"%{village}%"))
    if risk:
        try:
            q = q.filter(AshaVisit.risk_level == AshaRiskLevel(risk))
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Invalid risk level '{risk}'. Use Mild/Moderate/Severe.")
    if referral_only:
        q = q.filter(AshaVisit.referral_needed == True)  # noqa: E712

    total = q.count()
    visits = q.order_by(AshaVisit.created_at.desc()).offset(skip).limit(limit).all()

    high_risk = db.query(AshaVisit).filter(
        AshaVisit.asha_id == current_user.id,
        AshaVisit.risk_level == AshaRiskLevel.SEVERE,
    ).count() if current_user.role == "asha" else db.query(AshaVisit).filter(
        AshaVisit.risk_level == AshaRiskLevel.SEVERE
    ).count()

    referral_count = db.query(AshaVisit).filter(
        AshaVisit.asha_id == current_user.id,
        AshaVisit.referral_needed == True,  # noqa: E712
    ).count() if current_user.role == "asha" else db.query(AshaVisit).filter(
        AshaVisit.referral_needed == True  # noqa: E712
    ).count()

    return AshaVisitListResponse(
        visits=visits,
        total=total,
        high_risk_count=high_risk,
        referral_count=referral_count,
    )


@router.get(
    "/visits/{visit_id}",
    response_model=AshaVisitResponse,
    summary="Retrieve a specific visit record",
)
def get_visit(
    visit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_asha),
):
    visit = db.query(AshaVisit).filter(AshaVisit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit record not found.")

    # ASHA workers may only view their own records; admins can view all
    if current_user.role == "asha" and visit.asha_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have access to this visit record.")

    return visit


@router.patch(
    "/visits/{visit_id}",
    response_model=AshaVisitResponse,
    summary="Update vitals or assessment for an existing visit",
)
def update_visit(
    visit_id: int,
    payload: AshaVisitUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_asha),
):
    visit = db.query(AshaVisit).filter(AshaVisit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit record not found.")
    if current_user.role == "asha" and visit.asha_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have access to this visit record.")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "risk_level" and value is not None:
            setattr(visit, field, AshaRiskLevel(value))
        else:
            setattr(visit, field, value)

    db.commit()
    db.refresh(visit)
    return visit


@router.delete(
    "/visits/{visit_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a visit record (ASHA worker or Admin only)",
)
def delete_visit(
    visit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_asha),
):
    visit = db.query(AshaVisit).filter(AshaVisit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit record not found.")
    if current_user.role == "asha" and visit.asha_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own visit records.")

    db.delete(visit)
    db.commit()


@router.get(
    "/me",
    summary="Get the authenticated ASHA worker's profile summary",
)
def asha_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_asha),
):
    """
    Returns the ASHA worker's profile along with summary statistics
    (total visits, villages covered, referrals made).
    """
    total_visits = db.query(AshaVisit).filter(AshaVisit.asha_id == current_user.id).count()
    villages_covered = (
        db.query(AshaVisit.village)
        .filter(AshaVisit.asha_id == current_user.id)
        .distinct()
        .count()
    )
    severe_cases = db.query(AshaVisit).filter(
        AshaVisit.asha_id == current_user.id,
        AshaVisit.risk_level == AshaRiskLevel.SEVERE,
    ).count()
    referrals_made = db.query(AshaVisit).filter(
        AshaVisit.asha_id == current_user.id,
        AshaVisit.referral_needed == True,  # noqa: E712
    ).count()

    return {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "role": current_user.role if isinstance(current_user.role, str) else current_user.role.value,
        "patient_id": current_user.patient_id,
        "village_town": current_user.village_town,
        "district": current_user.district,
        "state": current_user.state,
        "stats": {
            "total_visits": total_visits,
            "villages_covered": villages_covered,
            "severe_cases": severe_cases,
            "referrals_made": referrals_made,
        },
    }
