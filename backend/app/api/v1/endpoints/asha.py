"""
ASHA Portal API
===============
Family-centred endpoints for ASHA workers. Every route authenticates the
worker via ``get_current_asha`` and only ever touches households assigned to
that worker (minimum-necessary access). Reads of a family's record and all
writes are written to ``asha_audit_logs``.
"""
import re
import uuid
from calendar import monthrange
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_asha
from app.db.session import get_db
from app.models.asha import (
    AshaActivity,
    AshaAuditLog,
    AshaWorker,
    CareVisit,
    Immunization,
    Pregnancy,
    Referral,
)
from app.models.family import FamilyMember, Household
from app.schemas.asha import (
    ActivityIn,
    HouseholdIn,
    HouseholdUpdate,
    ImmunizationIn,
    MemberIn,
    MemberUpdate,
    PregnancyIn,
    PregnancyOutcomeIn,
    ReferralFields,
    ReferralIn,
    ReferralUpdate,
    VisitIn,
    VoiceParseIn,
)
from app.services.asha import care_plan as cp
from app.services.asha import reference as ref
from app.services.asha.risk import assess_visit

router = APIRouter()


# ── Helpers ──────────────────────────────────────────────────────────────────

def _audit(db: Session, worker: AshaWorker, action: str, entity: str, entity_id: Optional[int], detail: str = None):
    db.add(AshaAuditLog(asha_id=worker.id, action=action, entity=entity, entity_id=entity_id, detail=detail))


def _worker_households(db: Session, worker: AshaWorker) -> List[Household]:
    return (
        db.query(Household)
        .filter(Household.asha_id == worker.id, Household.is_active.is_(True))
        .order_by(Household.household_code)
        .all()
    )


def _own_household(db: Session, worker: AshaWorker, household_id: int) -> Household:
    hh = db.query(Household).filter(Household.id == household_id).first()
    if hh is None or hh.asha_id != worker.id:
        raise HTTPException(status_code=404, detail="Household not found in your area")
    return hh


def _own_member(db: Session, worker: AshaWorker, member_id: int) -> FamilyMember:
    m = db.query(FamilyMember).filter(FamilyMember.id == member_id).first()
    if m is None or m.household is None or m.household.asha_id != worker.id:
        raise HTTPException(status_code=404, detail="Family member not found in your area")
    return m


def _dob_from(m: MemberIn, today: date):
    if m.dob:
        if m.dob > today:
            raise HTTPException(status_code=422, detail=f"Date of birth for {m.name} is in the future")
        return m.dob, False
    if m.age_years is not None:
        try:
            return today.replace(year=today.year - m.age_years), True
        except ValueError:  # 29 Feb
            return today.replace(year=today.year - m.age_years, day=28), True
    raise HTTPException(status_code=422, detail=f"Date of birth or age is required for {m.name}")


def _new_member(hh: Household, data: MemberIn, today: date) -> FamilyMember:
    dob, estimated = _dob_from(data, today)
    return FamilyMember(
        household=hh,
        name=data.name.strip(),
        gender=data.gender,
        dob=dob,
        dob_estimated=estimated,
        relation=data.relation,
        marital_status=data.marital_status,
        phone=data.phone,
        abha_number=data.abha_number,
        mother_id=data.mother_id,
        birth_weight_kg=data.birth_weight_kg,
        birth_place=data.birth_place,
        chronic_conditions=data.chronic_conditions,
        enrolled_schemes=data.enrolled_schemes,
        notes=data.notes,
    )


def _household_code(db: Session, village: str) -> str:
    prefix = (re.sub(r"[^A-Za-z]", "", village or "") or "HH")[:3].upper()
    n = db.query(Household).filter(Household.household_code.like(f"HH-{prefix}-%")).count() + 1
    while True:
        code = f"HH-{prefix}-{n:03d}"
        if not db.query(Household.id).filter(Household.household_code == code).first():
            return code
        n += 1


def _iso(d) -> Optional[str]:
    return d.isoformat() if d else None


def _visit_out(v: CareVisit, member: Optional[FamilyMember] = None) -> Dict[str, Any]:
    return {
        "id": v.id,
        "household_id": v.household_id,
        "member_id": v.member_id,
        "member_name": member.name if member else None,
        "pregnancy_id": v.pregnancy_id,
        "visit_type": v.visit_type,
        "schedule_key": v.schedule_key,
        "visit_date": _iso(v.visit_date),
        "vitals": {
            "bp_systolic": v.bp_systolic,
            "bp_diastolic": v.bp_diastolic,
            "weight_kg": v.weight_kg,
            "temperature_c": v.temperature_c,
            "pulse": v.pulse,
            "spo2": v.spo2,
            "hb": v.hb,
            "blood_sugar": v.blood_sugar,
            "muac_cm": v.muac_cm,
        },
        "danger_signs": v.danger_signs or [],
        "findings": v.findings or {},
        "counselling": v.counselling or [],
        "notes": v.notes,
        "risk_level": v.risk_level,
        "risk_reasons": v.risk_reasons or [],
        "next_followup_date": _iso(v.next_followup_date),
        "input_mode": v.input_mode,
        "created_at": _iso(v.created_at),
    }


def _referral_out(r: Referral, member: Optional[FamilyMember], hh: Optional[Household]) -> Dict[str, Any]:
    return {
        "id": r.id,
        "member": cp.member_brief(member) if member else None,
        "household": cp.household_brief(hh) if hh else None,
        "visit_id": r.visit_id,
        "reason": r.reason,
        "urgency": r.urgency,
        "facility_type": r.facility_type,
        "facility_name": r.facility_name,
        "referred_on": _iso(r.referred_on),
        "status": r.status,
        "visited_on": _iso(r.visited_on),
        "outcome_notes": r.outcome_notes,
        "opd_token": r.opd_token,
    }


def _member_out(m: FamilyMember, ctx: cp.FamilyContext, today: date, tasks=None) -> Dict[str, Any]:
    tasks = tasks if tasks is not None else cp.member_tasks(m, ctx, today)
    preg = ctx.active_pregnancy(m.id)
    return {
        **cp.member_brief(m),
        "household_id": m.household_id,
        "dob_estimated": m.dob_estimated,
        "age_days": cp.age_in_days(m, today),
        "marital_status": m.marital_status,
        "phone": m.phone,
        "abha_number": m.abha_number,
        "mother_id": m.mother_id,
        "birth_weight_kg": m.birth_weight_kg,
        "birth_place": m.birth_place,
        "chronic_conditions": m.chronic_conditions or [],
        "enrolled_schemes": m.enrolled_schemes or [],
        "risk_reasons": m.risk_reasons or [],
        "status": m.status,
        "notes": m.notes,
        "tags": cp.member_tags(m, ctx, today, tasks),
        "pregnancy": cp.pregnancy_summary(preg, ctx.visits.get(m.id, []), today) if preg else None,
        "task_counts": {
            "overdue": sum(1 for t in tasks if t["status"] == "overdue"),
            "due": sum(1 for t in tasks if t["status"] == "due"),
        },
    }


def _new_referral(worker, member: FamilyMember, data: ReferralFields, visit_id: Optional[int], on: date) -> Referral:
    r = Referral(
        household_id=member.household_id,
        member_id=member.id,
        visit_id=visit_id,
        asha_id=worker.id,
        reason=data.reason.strip(),
        urgency=data.urgency,
        facility_type=data.facility_type,
        facility_name=data.facility_name,
        referred_on=on,
        status="PENDING",
    )
    if data.urgency == "EMERGENCY":
        # Lets the receiving hospital open the case in the Doctor Cockpit
        r.opd_token = f"ASHA-{uuid.uuid4().hex[:6].upper()}"
    return r


# ── Profile & reference ──────────────────────────────────────────────────────

@router.get("/me", summary="Signed-in ASHA worker profile")
def asha_me(worker: AshaWorker = Depends(get_current_asha)):
    return {
        "id": worker.id,
        "worker_id": worker.worker_code,
        "name": worker.full_name,
        "phone": worker.phone,
        "village": worker.village,
        "sub_center": worker.sub_center,
        "phc": worker.phc,
        "block": worker.block,
        "district": worker.district,
        "state": worker.state,
        "population_covered": worker.population_covered,
        "supervisor_name": worker.supervisor_name,
        "supervisor_phone": worker.supervisor_phone,
        "preferred_language": worker.preferred_language,
        "last_login_at": _iso(worker.last_login_at),
    }


@router.get("/reference", summary="Programme reference data (schedules, danger signs, schemes)")
def asha_reference(worker: AshaWorker = Depends(get_current_asha)):
    return ref.reference_payload()


# ── Today / work list ────────────────────────────────────────────────────────

@router.get("/today", summary="Prioritised work list and area summary")
def asha_today(db: Session = Depends(get_db), worker: AshaWorker = Depends(get_current_asha)):
    today = cp.today_ist()
    ctx = cp.load_context(db, _worker_households(db, worker))
    tasks = cp.all_tasks(ctx, today)
    visited_today = (
        db.query(CareVisit.member_id)
        .filter(CareVisit.asha_id == worker.id, CareVisit.visit_date == today)
        .distinct()
        .count()
    )
    return {
        "date": today.isoformat(),
        "summary": {**cp.summary_counts(ctx, tasks, today), "visited_today": visited_today},
        "tasks": tasks,
    }


# ── Households ───────────────────────────────────────────────────────────────

HOUSEHOLD_FILTERS = {"all", "pregnant", "children", "high_risk", "due"}


@router.get("/households", summary="Households in the ASHA's area")
def list_households(
    q: Optional[str] = Query(None, max_length=80),
    filter: str = Query("all"),
    db: Session = Depends(get_db),
    worker: AshaWorker = Depends(get_current_asha),
):
    if filter not in HOUSEHOLD_FILTERS:
        raise HTTPException(status_code=422, detail=f"filter must be one of {sorted(HOUSEHOLD_FILTERS)}")
    today = cp.today_ist()
    households = _worker_households(db, worker)
    ctx = cp.load_context(db, households)

    last_visit: Dict[int, date] = {}
    for rows in ctx.visits.values():
        for v in rows:
            if v.visit_date > last_visit.get(v.household_id, date.min):
                last_visit[v.household_id] = v.visit_date

    needle = (q or "").strip().lower()
    out = []
    for hh in households:
        members = [m for m in ctx.members_by_household.get(hh.id, []) if m.status == "ACTIVE"]
        if needle:
            haystack = " ".join(
                [hh.head_name, hh.household_code, hh.hamlet or "", hh.phone or ""] + [m.name for m in members]
            ).lower()
            if needle not in haystack:
                continue
        tasks = [t for m in members for t in cp.member_tasks(m, ctx, today)]
        tag_codes = []
        for m in members:
            for tag in cp.member_tags(m, ctx, today):
                if tag["code"] not in ("CONDITION",) and tag["code"] not in tag_codes:
                    tag_codes.append(tag["code"])
        overdue = sum(1 for t in tasks if t["status"] == "overdue")
        due = sum(1 for t in tasks if t["status"] == "due")

        if filter == "pregnant" and "PREGNANT" not in tag_codes:
            continue
        if filter == "children" and not {"NEWBORN", "INFANT", "CHILD_U5"} & set(tag_codes):
            continue
        if filter == "high_risk" and not {"HIGH_RISK", "HIGH_RISK_PREGNANCY"} & set(tag_codes):
            continue
        if filter == "due" and not (overdue or due):
            continue

        out.append({
            **cp.household_brief(hh),
            "member_count": len(members),
            "members": [{"id": m.id, "name": m.name, "gender": m.gender, "dob": m.dob.isoformat()} for m in members],
            "tags": tag_codes,
            "overdue": overdue,
            "due": due,
            "last_visit_date": _iso(last_visit.get(hh.id)),
        })
    out.sort(key=lambda h: (-h["overdue"], -h["due"], h["household_code"]))
    return {"total": len(out), "households": out}


@router.post("/households", status_code=status.HTTP_201_CREATED, summary="Register a household")
def create_household(payload: HouseholdIn, db: Session = Depends(get_db), worker: AshaWorker = Depends(get_current_asha)):
    if not payload.consent_given:
        raise HTTPException(status_code=400, detail="Family consent is required before recording health information")
    today = cp.today_ist()
    village = (payload.village or worker.village or "").strip()
    if not village:
        raise HTTPException(status_code=422, detail="Village is required")
    hh = Household(
        household_code=_household_code(db, village),
        asha_id=worker.id,
        head_name=payload.head_name.strip(),
        village=village,
        hamlet=payload.hamlet,
        address=payload.address,
        phone=payload.phone,
        social_category=payload.social_category,
        is_bpl=payload.is_bpl,
        drinking_water=payload.drinking_water,
        has_toilet=payload.has_toilet,
        consent_given=True,
        consent_at=datetime.now(timezone.utc),
        notes=payload.notes,
    )
    db.add(hh)
    for m in payload.members:
        db.add(_new_member(hh, m, today))
    db.flush()
    _audit(db, worker, "CREATE", "household", hh.id, hh.household_code)
    db.commit()
    return {"id": hh.id, "household_code": hh.household_code}


@router.get("/households/{household_id}", summary="Full family record")
def get_household(household_id: int, db: Session = Depends(get_db), worker: AshaWorker = Depends(get_current_asha)):
    today = cp.today_ist()
    hh = _own_household(db, worker, household_id)
    ctx = cp.load_context(db, [hh])
    members = ctx.members_by_household.get(hh.id, [])

    member_rows, tasks, schemes = [], [], []
    for m in members:
        m_tasks = cp.member_tasks(m, ctx, today)
        tasks += m_tasks
        member_rows.append(_member_out(m, ctx, today, m_tasks))
        if m.status == "ACTIVE":
            for s in cp.scheme_suggestions(m, hh, ctx, today):
                schemes.append({**s, "member_id": m.id, "member_name": m.name})

    by_id = {m.id: m for m in members}
    visits = sorted((v for rows in ctx.visits.values() for v in rows), key=lambda v: (v.visit_date, v.id), reverse=True)
    referrals = [r for rows in ctx.referrals.values() for r in rows]

    _audit(db, worker, "VIEW", "household", hh.id)
    db.commit()
    return {
        **cp.household_brief(hh),
        "address": hh.address,
        "social_category": hh.social_category,
        "is_bpl": hh.is_bpl,
        "drinking_water": hh.drinking_water,
        "has_toilet": hh.has_toilet,
        "consent_given": hh.consent_given,
        "consent_at": _iso(hh.consent_at),
        "notes": hh.notes,
        "created_at": _iso(hh.created_at),
        "members": member_rows,
        "tasks": cp.sort_tasks(tasks),
        "visits": [_visit_out(v, by_id.get(v.member_id)) for v in visits[:20]],
        "referrals": [_referral_out(r, by_id.get(r.member_id), hh) for r in referrals],
        "schemes": schemes,
    }


@router.patch("/households/{household_id}", summary="Update household details")
def update_household(
    household_id: int, payload: HouseholdUpdate,
    db: Session = Depends(get_db), worker: AshaWorker = Depends(get_current_asha),
):
    hh = _own_household(db, worker, household_id)
    changes = payload.model_dump(exclude_unset=True)
    for k, v in changes.items():
        setattr(hh, k, v)
    _audit(db, worker, "UPDATE", "household", hh.id, ",".join(changes))
    db.commit()
    return {"id": hh.id}


# ── Members ──────────────────────────────────────────────────────────────────

@router.post("/households/{household_id}/members", status_code=status.HTTP_201_CREATED, summary="Add a family member")
def add_member(
    household_id: int, payload: MemberIn,
    db: Session = Depends(get_db), worker: AshaWorker = Depends(get_current_asha),
):
    hh = _own_household(db, worker, household_id)
    if payload.mother_id:
        mother = _own_member(db, worker, payload.mother_id)
        if mother.household_id != hh.id:
            raise HTTPException(status_code=422, detail="Mother must belong to the same household")
    m = _new_member(hh, payload, cp.today_ist())
    db.add(m)
    db.flush()
    _audit(db, worker, "CREATE", "member", m.id)
    db.commit()
    return {"id": m.id}


@router.get("/members/{member_id}", summary="Individual health record")
def get_member(member_id: int, db: Session = Depends(get_db), worker: AshaWorker = Depends(get_current_asha)):
    today = cp.today_ist()
    m = _own_member(db, worker, member_id)
    hh = m.household
    ctx = cp.load_context(db, [hh])
    tasks = cp.member_tasks(m, ctx, today)
    visits = ctx.visits.get(m.id, [])
    pregnancies = ctx.pregnancies.get(m.id, [])
    age = cp.age_in_days(m, today)
    relatives = ctx.members_by_household.get(hh.id, [])

    _audit(db, worker, "VIEW", "member", m.id)
    db.commit()
    return {
        **_member_out(m, ctx, today, tasks),
        "household": cp.household_brief(hh),
        "tasks": cp.sort_tasks(tasks),
        "past_pregnancies": [cp.pregnancy_summary(p, visits, today) for p in pregnancies if p.status != "ACTIVE"],
        "vaccine_card": cp.vaccine_card(m, ctx, today) if age < 17 * 365 else None,
        "pregnancy_vaccines": [
            {"id": i.id, "code": i.vaccine_code, "given_on": _iso(i.given_on)}
            for i in ctx.immunizations.get(m.id, [])
            if i.vaccine_code.endswith("_PW")
        ],
        "visits": [_visit_out(v, m) for v in visits],
        "referrals": [_referral_out(r, m, hh) for r in ctx.referrals.get(m.id, [])],
        "schemes": cp.scheme_suggestions(m, hh, ctx, today) if m.status == "ACTIVE" else [],
        "mother": cp.member_brief(ctx.members[m.mother_id]) if m.mother_id in ctx.members else None,
        "children": [cp.member_brief(c) for c in relatives if c.mother_id == m.id],
    }


@router.patch("/members/{member_id}", summary="Update a family member")
def update_member(
    member_id: int, payload: MemberUpdate,
    db: Session = Depends(get_db), worker: AshaWorker = Depends(get_current_asha),
):
    m = _own_member(db, worker, member_id)
    changes = payload.model_dump(exclude_unset=True)
    if "dob" in changes:
        m.dob_estimated = False
    if changes.get("chronic_conditions") is not None:
        changes["chronic_conditions"] = [c for c in changes["chronic_conditions"] if c in ref.CHRONIC_CONDITIONS]
    if changes.get("enrolled_schemes") is not None:
        changes["enrolled_schemes"] = [c for c in changes["enrolled_schemes"] if c in ref.SCHEMES]
    if changes.get("risk_level") == "LOW":
        m.risk_reasons = []
    for k, v in changes.items():
        setattr(m, k, v)
    _audit(db, worker, "UPDATE", "member", m.id, ",".join(changes))
    db.commit()
    return {"id": m.id}


# ── Pregnancy ────────────────────────────────────────────────────────────────

@router.post("/members/{member_id}/pregnancies", status_code=status.HTTP_201_CREATED, summary="Register a pregnancy")
def register_pregnancy(
    member_id: int, payload: PregnancyIn,
    db: Session = Depends(get_db), worker: AshaWorker = Depends(get_current_asha),
):
    today = cp.today_ist()
    m = _own_member(db, worker, member_id)
    if m.gender != "F":
        raise HTTPException(status_code=422, detail="Pregnancy can only be registered for a woman")
    if db.query(Pregnancy).filter(Pregnancy.member_id == m.id, Pregnancy.status == "ACTIVE").first():
        raise HTTPException(status_code=409, detail="This woman already has an active pregnancy")
    if payload.lmp_date > today or (today - payload.lmp_date).days > 44 * 7:
        raise HTTPException(status_code=422, detail="LMP date must be within the last 44 weeks")

    risk_factors = list(payload.risk_factors)
    age_years = cp.age_in_days(m, today) // 365
    if age_years < 18:
        risk_factors.append("AGE_UNDER_18")
    elif age_years > 35:
        risk_factors.append("AGE_OVER_35")
    if payload.gravida and payload.gravida >= 5:
        risk_factors.append("GRAND_MULTIPARA")

    p = Pregnancy(
        member_id=m.id,
        registered_by=worker.id,
        lmp_date=payload.lmp_date,
        edd=payload.lmp_date + timedelta(days=280),
        registered_on=today,
        gravida=payload.gravida,
        parity=payload.parity,
        rch_id=payload.rch_id,
        risk_factors=sorted(set(risk_factors)),
        high_risk=bool(risk_factors),
    )
    db.add(p)
    db.flush()
    _audit(db, worker, "CREATE", "pregnancy", p.id)
    db.commit()
    return {"id": p.id, "edd": p.edd.isoformat(), "high_risk": p.high_risk}


@router.post("/pregnancies/{pregnancy_id}/outcome", summary="Record delivery / pregnancy outcome")
def record_outcome(
    pregnancy_id: int, payload: PregnancyOutcomeIn,
    db: Session = Depends(get_db), worker: AshaWorker = Depends(get_current_asha),
):
    p = db.query(Pregnancy).filter(Pregnancy.id == pregnancy_id).first()
    if p is None:
        raise HTTPException(status_code=404, detail="Pregnancy not found")
    mother = _own_member(db, worker, p.member_id)
    if p.status != "ACTIVE":
        raise HTTPException(status_code=409, detail="Outcome already recorded")
    if payload.outcome_date > cp.today_ist() or payload.outcome_date < p.lmp_date:
        raise HTTPException(status_code=422, detail="Outcome date is not valid for this pregnancy")

    p.outcome = payload.outcome
    p.outcome_date = payload.outcome_date
    p.delivery_place = payload.delivery_place
    p.facility_name = payload.facility_name
    p.status = "DELIVERED" if payload.outcome in ("LIVE_BIRTH", "STILLBIRTH") else "ENDED"

    baby_ids = []
    if payload.outcome == "LIVE_BIRTH":
        for i, baby in enumerate(payload.babies or []):
            name = (baby.name or "").strip() or f"Baby of {mother.name}" + (f" ({i + 1})" if len(payload.babies) > 1 else "")
            child = FamilyMember(
                household_id=mother.household_id,
                name=name,
                gender=baby.gender,
                dob=payload.outcome_date,
                relation="CHILD",
                mother_id=mother.id,
                birth_weight_kg=baby.birth_weight_kg,
                birth_place=payload.delivery_place,
            )
            if baby.birth_weight_kg and baby.birth_weight_kg < 2.5:
                child.risk_level = "HIGH" if baby.birth_weight_kg < 1.8 else "MODERATE"
                child.risk_reasons = [{"code": "LBW_VERY" if baby.birth_weight_kg < 1.8 else "LBW",
                                       "severity": child.risk_level, "value": baby.birth_weight_kg}]
            db.add(child)
            db.flush()
            baby_ids.append(child.id)
    _audit(db, worker, "UPDATE", "pregnancy", p.id, f"outcome={payload.outcome}")
    db.commit()
    return {"id": p.id, "status": p.status, "baby_ids": baby_ids}


# ── Visits ───────────────────────────────────────────────────────────────────

@router.post("/visits", status_code=status.HTTP_201_CREATED, summary="Record a home visit")
def create_visit(payload: VisitIn, db: Session = Depends(get_db), worker: AshaWorker = Depends(get_current_asha)):
    today = cp.today_ist()
    m = _own_member(db, worker, payload.member_id)

    # Offline outbox retries must not create duplicates
    if payload.client_ref:
        existing = db.query(CareVisit).filter(
            CareVisit.client_ref == payload.client_ref, CareVisit.asha_id == worker.id
        ).first()
        if existing:
            return {"visit": _visit_out(existing, m), "duplicate": True}

    visit_date = payload.visit_date or today
    if visit_date > today:
        raise HTTPException(status_code=422, detail="Visit date cannot be in the future")

    ctx = cp.load_context(db, [m.household])
    preg = ctx.active_pregnancy(m.id)
    schedule_key = payload.schedule_key
    if not schedule_key and payload.visit_type in ("ANC", "HBNC", "HBYC"):
        schedule_key = cp.next_schedule_key(m, ctx, today, payload.visit_type)

    vitals = {k: getattr(payload, k) for k in (
        "bp_systolic", "bp_diastolic", "weight_kg", "temperature_c", "pulse", "spo2", "hb", "blood_sugar", "muac_cm"
    )}
    level, reasons, extra = assess_visit(
        visit_type=payload.visit_type,
        age_days=cp.age_in_days(m, visit_date),
        gender=m.gender,
        is_pregnant=preg is not None,
        vitals=vitals,
        danger_signs=payload.danger_signs,
        findings=payload.findings,
    )
    findings = dict(payload.findings or {})
    if "cbac_score" in extra:
        findings["cbac_score"] = extra["cbac_score"]

    v = CareVisit(
        household_id=m.household_id,
        member_id=m.id,
        pregnancy_id=preg.id if preg else None,
        asha_id=worker.id,
        visit_type=payload.visit_type,
        schedule_key=schedule_key,
        visit_date=visit_date,
        danger_signs=payload.danger_signs,
        findings=findings,
        counselling=payload.counselling,
        notes=payload.notes,
        risk_level=level,
        risk_reasons=reasons,
        next_followup_date=payload.next_followup_date,
        input_mode=payload.input_mode,
        voice_transcript=payload.voice_transcript,
        client_ref=payload.client_ref,
        **vitals,
    )
    db.add(v)

    # Latest assessment becomes the member's current risk
    m.risk_level = level
    m.risk_reasons = reasons
    if preg and level == "HIGH":
        preg.high_risk = True
        preg.risk_factors = sorted(set((preg.risk_factors or []) + [r["code"] for r in reasons if r["severity"] == "HIGH"]))
    if level != "LOW" and not payload.next_followup_date:
        v.next_followup_date = visit_date + timedelta(days=2 if level == "HIGH" else 7)
    db.flush()

    referral = None
    if payload.referral:
        referral = _new_referral(worker, m, payload.referral, v.id, visit_date)
        db.add(referral)
        db.flush()

    _audit(db, worker, "CREATE", "visit", v.id, payload.visit_type)
    db.commit()
    return {
        "visit": _visit_out(v, m),
        "risk": {"level": level, "reasons": reasons, "suggested_urgency": extra.get("suggested_urgency")},
        "referral": _referral_out(referral, m, m.household) if referral else None,
        "duplicate": False,
    }


@router.post("/voice/parse", summary="Turn a spoken visit note into a pre-filled visit form")
def parse_voice_note(payload: VoiceParseIn, worker: AshaWorker = Depends(get_current_asha)):
    """
    The AI only drafts: the ASHA reviews every field before saving. Uses the
    Groq → Gemini → offline heuristic chain, plus keyword spotting for danger
    signs in Hindi and English.
    """
    from app.services.ibm_granite import analyze_asha_voice_survey

    triage = analyze_asha_voice_survey(payload.transcript, payload.lang) or {}
    raw_vitals = triage.get("vitals") or {}

    def _num(v, cast):
        try:
            return cast(v) if v not in (None, "", "null") else None
        except (TypeError, ValueError):
            return None

    vitals = {
        "bp_systolic": _num(raw_vitals.get("bp_systolic"), int),
        "bp_diastolic": _num(raw_vitals.get("bp_diastolic"), int),
        "hb": _num(raw_vitals.get("hb"), float),
        "blood_sugar": _num(raw_vitals.get("sugar") or raw_vitals.get("blood_sugar"), int),
        "temperature_c": _num(raw_vitals.get("temperature_c"), float),
        "weight_kg": _num(raw_vitals.get("weight_kg"), float),
    }
    case_to_visit = {"MCH": "ANC", "NCD_30PLUS": "NCD", "IMMUNIZATION": "GENERAL", "NEWBORN": "HBNC"}
    visit_type = payload.visit_type or case_to_visit.get(triage.get("case_type"), "GENERAL")
    allowed = set(ref.DANGER_SIGN_SETS.get(visit_type, [])) | (
        set(ref.DANGER_SIGN_SETS["PNC"]) if visit_type == "HBNC" else set()
    )
    signs = [s for s in _spot_danger_signs(payload.transcript) if s in allowed]
    risk_map = {"RED_LAL_PATAKA": "HIGH", "YELLOW_MONITOR": "MODERATE", "GREEN_NORMAL": "LOW"}
    engine = triage.get("_engine", "heuristic")
    # The offline fallback's canned summary adds nothing to the ASHA's own note
    from_llm = "heuristic" not in engine
    return {
        "visit_type": visit_type,
        "vitals": {k: v for k, v in vitals.items() if v is not None},
        "danger_signs": signs,
        "summary": (triage.get("clinical_summary") or "") if from_llm else "",
        "suggested_action": (triage.get("action_plan") or "") if from_llm else "",
        "ai_risk_level": risk_map.get(triage.get("risk_level"), "LOW"),
        "referral_suggested": bool(triage.get("referral_needed")),
        "engine": engine,
    }


_SIGN_KEYWORDS = {
    "VAGINAL_BLEEDING": ["bleeding", "khoon", "खून", "रक्तस्राव"],
    "HEAVY_BLEEDING": ["heavy bleeding", "zyada khoon", "ज्यादा खून", "अधिक रक्तस्राव"],
    "SEVERE_HEADACHE_BLURRED_VISION": ["headache", "sir dard", "सिर दर्द", "blurred", "dhundhla", "धुंधला"],
    "SWELLING_FACE_HANDS": ["swelling", "sujan", "soojan", "सूजन"],
    "HIGH_FEVER": ["fever", "bukhar", "बुखार", "तेज बुखार"],
    "CONVULSIONS": ["convulsion", "fits", "daura", "दौरा", "झटके"],
    "BREATHLESSNESS": ["breathless", "saans", "सांस", "साँस"],
    "FAST_BREATHING": ["fast breathing", "tez saans", "तेज सांस"],
    "REDUCED_FETAL_MOVEMENT": ["movement", "halchal", "हलचल"],
    "SEVERE_ABDOMINAL_PAIN": ["abdominal pain", "pet dard", "पेट दर्द"],
    "NOT_FEEDING_WELL": ["not feeding", "doodh nahi", "दूध नहीं", "स्तनपान नहीं"],
    "JAUNDICE_PALMS_SOLES": ["jaundice", "piliya", "पीलिया"],
    "COUGH_2_WEEKS": ["cough", "khansi", "खांसी", "खाँसी"],
    "DIARRHOEA_DEHYDRATION": ["diarrh", "dast", "दस्त"],
    "VOMITS_EVERYTHING": ["vomit", "ulti", "उल्टी"],
    "CHEST_PAIN": ["chest pain", "seene mein dard", "सीने में दर्द"],
    "WEIGHT_LOSS": ["weight loss", "vajan kam", "वजन कम"],
}


def _spot_danger_signs(text: str) -> List[str]:
    lowered = text.lower()
    return [code for code, words in _SIGN_KEYWORDS.items() if any(w in lowered for w in words)]


# ── Immunization ─────────────────────────────────────────────────────────────

@router.post("/members/{member_id}/immunizations", status_code=status.HTTP_201_CREATED, summary="Record vaccines given")
def record_immunizations(
    member_id: int, payload: ImmunizationIn,
    db: Session = Depends(get_db), worker: AshaWorker = Depends(get_current_asha),
):
    today = cp.today_ist()
    m = _own_member(db, worker, member_id)
    given_on = payload.given_on or today
    if given_on > today or given_on < m.dob:
        raise HTTPException(status_code=422, detail="Vaccination date is not valid")

    existing = {i.vaccine_code for i in db.query(Immunization).filter(Immunization.member_id == m.id)}
    added = []
    for code in dict.fromkeys(payload.vaccines):
        # Child doses are given once; pregnancy Td doses repeat across pregnancies
        if code in existing and not code.endswith("_PW"):
            continue
        rec = Immunization(member_id=m.id, vaccine_code=code, given_on=given_on,
                           given_at=payload.given_at, recorded_by=worker.id)
        db.add(rec)
        added.append(code)
    db.flush()
    _audit(db, worker, "CREATE", "immunization", m.id, ",".join(added))
    db.commit()
    return {"added": added, "skipped": [c for c in payload.vaccines if c not in added]}


@router.delete("/immunizations/{immunization_id}", summary="Remove a vaccine entered by mistake")
def delete_immunization(immunization_id: int, db: Session = Depends(get_db), worker: AshaWorker = Depends(get_current_asha)):
    rec = db.query(Immunization).filter(Immunization.id == immunization_id).first()
    if rec is None:
        raise HTTPException(status_code=404, detail="Record not found")
    _own_member(db, worker, rec.member_id)
    _audit(db, worker, "DELETE", "immunization", rec.id, rec.vaccine_code)
    db.delete(rec)
    db.commit()
    return {"deleted": immunization_id}


# ── Referrals ────────────────────────────────────────────────────────────────

@router.get("/referrals", summary="Referrals raised in the ASHA's area")
def list_referrals(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db), worker: AshaWorker = Depends(get_current_asha),
):
    households = {h.id: h for h in _worker_households(db, worker)}
    if not households:
        return {"referrals": []}
    query = db.query(Referral).filter(Referral.household_id.in_(households.keys()))
    if status_filter:
        query = query.filter(Referral.status == status_filter.upper())
    rows = query.order_by(Referral.referred_on.desc(), Referral.id.desc()).all()
    return {"referrals": [_referral_out(r, r.member, households.get(r.household_id)) for r in rows]}


@router.post("/referrals", status_code=status.HTTP_201_CREATED, summary="Refer a family member to a facility")
def create_referral(payload: ReferralIn, db: Session = Depends(get_db), worker: AshaWorker = Depends(get_current_asha)):
    m = _own_member(db, worker, payload.member_id)
    r = _new_referral(worker, m, payload, payload.visit_id, cp.today_ist())
    db.add(r)
    db.flush()
    _audit(db, worker, "CREATE", "referral", r.id, payload.urgency)
    db.commit()
    return _referral_out(r, m, m.household)


@router.patch("/referrals/{referral_id}", summary="Update whether the referred person reached the facility")
def update_referral(
    referral_id: int, payload: ReferralUpdate,
    db: Session = Depends(get_db), worker: AshaWorker = Depends(get_current_asha),
):
    r = db.query(Referral).filter(Referral.id == referral_id).first()
    if r is None:
        raise HTTPException(status_code=404, detail="Referral not found")
    m = _own_member(db, worker, r.member_id)
    r.status = payload.status
    if payload.status == "VISITED":
        r.visited_on = payload.visited_on or cp.today_ist()
    if payload.outcome_notes is not None:
        r.outcome_notes = payload.outcome_notes
    _audit(db, worker, "UPDATE", "referral", r.id, payload.status)
    db.commit()
    return _referral_out(r, m, m.household)


# ── Community activities ─────────────────────────────────────────────────────

@router.get("/activities", summary="Community activities logged by the ASHA")
def list_activities(db: Session = Depends(get_db), worker: AshaWorker = Depends(get_current_asha)):
    rows = (
        db.query(AshaActivity)
        .filter(AshaActivity.asha_id == worker.id)
        .order_by(AshaActivity.activity_date.desc(), AshaActivity.id.desc())
        .limit(100)
        .all()
    )
    return {"activities": [
        {"id": a.id, "activity_type": a.activity_type, "activity_date": _iso(a.activity_date),
         "topic": a.topic, "participants": a.participants, "notes": a.notes}
        for a in rows
    ]}


@router.post("/activities", status_code=status.HTTP_201_CREATED, summary="Log a community activity")
def create_activity(payload: ActivityIn, db: Session = Depends(get_db), worker: AshaWorker = Depends(get_current_asha)):
    a = AshaActivity(
        asha_id=worker.id,
        activity_type=payload.activity_type,
        activity_date=payload.activity_date or cp.today_ist(),
        topic=payload.topic,
        participants=payload.participants,
        notes=payload.notes,
    )
    db.add(a)
    db.flush()
    _audit(db, worker, "CREATE", "activity", a.id, payload.activity_type)
    db.commit()
    return {"id": a.id}


# ── Monthly report ───────────────────────────────────────────────────────────

@router.get("/reports/monthly", summary="Monthly work summary and indicative incentives")
def monthly_report(
    month: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}$"),
    db: Session = Depends(get_db), worker: AshaWorker = Depends(get_current_asha),
):
    today = cp.today_ist()
    year, mon = (int(x) for x in month.split("-")) if month else (today.year, today.month)
    start = date(year, mon, 1)
    end = date(year, mon, monthrange(year, mon)[1])

    def in_month(d: Optional[date]) -> bool:
        return d is not None and start <= d <= end

    households = _worker_households(db, worker)
    ctx = cp.load_context(db, households)
    visits = [v for rows in ctx.visits.values() for v in rows if in_month(v.visit_date)]
    visits_by_type: Dict[str, int] = {}
    for v in visits:
        visits_by_type[v.visit_type] = visits_by_type.get(v.visit_type, 0) + 1

    pregnancies = [p for rows in ctx.pregnancies.values() for p in rows]
    deliveries = [p for p in pregnancies if in_month(p.outcome_date) and p.outcome in ("LIVE_BIRTH", "STILLBIRTH")]
    imms = [i for rows in ctx.immunizations.values() for i in rows if in_month(i.given_on)]
    referrals = [r for rows in ctx.referrals.values() for r in rows if in_month(r.referred_on)]

    # Children whose immunization milestone was completed this month
    full_imm = complete_imm = hbnc_complete = 0
    for m in ctx.members.values():
        given = {i.vaccine_code: i.given_on for i in ctx.immunizations.get(m.id, [])}
        if ref.FULL_IMMUNIZATION_SET <= given.keys():
            done_on = max(given[c] for c in ref.FULL_IMMUNIZATION_SET)
            if in_month(done_on) and (done_on - m.dob).days < 365:
                full_imm += 1
        if {"MR2", "DPTB1"} <= given.keys():
            done_on = max(given["MR2"], given["DPTB1"])
            if in_month(done_on) and (done_on - m.dob).days < 730:
                complete_imm += 1
        hbnc = sorted(v.visit_date for v in ctx.visits.get(m.id, []) if v.visit_type == "HBNC")
        required = len(ref.HBNC_DAYS_HOME if m.birth_place == "HOME" else ref.HBNC_DAYS_INSTITUTIONAL)
        if len(hbnc) >= required and in_month(hbnc[required - 1]):
            hbnc_complete += 1

    counts = {
        "INSTITUTIONAL_DELIVERY": sum(1 for p in deliveries if p.delivery_place == "INSTITUTIONAL"),
        "HBNC_COMPLETE": hbnc_complete,
        "HBYC_VISIT": visits_by_type.get("HBYC", 0),
        "FULL_IMMUNIZATION": full_imm,
        "COMPLETE_IMMUNIZATION": complete_imm,
        "CBAC_FORM": visits_by_type.get("NCD", 0),
    }
    incentives = [
        {"code": code, "label": rate["label"], "rate": rate["amount"], "count": counts[code],
         "amount": rate["amount"] * counts[code]}
        for code, rate in ref.INCENTIVE_RATES.items()
    ]
    activities = (
        db.query(AshaActivity)
        .filter(AshaActivity.asha_id == worker.id, AshaActivity.activity_date >= start, AshaActivity.activity_date <= end)
        .count()
    )
    return {
        "month": start.strftime("%Y-%m"),
        "visits_total": len(visits),
        "households_visited": len({v.household_id for v in visits}),
        "visits_by_type": visits_by_type,
        "new_households": sum(1 for h in households if h.created_at and in_month(h.created_at.date())),
        "pregnancies_registered": sum(1 for p in pregnancies if in_month(p.registered_on)),
        "deliveries": len(deliveries),
        "institutional_deliveries": counts["INSTITUTIONAL_DELIVERY"],
        "vaccine_doses": len(imms),
        "children_fully_immunized": full_imm,
        "referrals_made": len(referrals),
        "referrals_completed": sum(1 for r in referrals if r.status == "VISITED"),
        "high_risk_identified": sum(1 for v in visits if v.risk_level == "HIGH"),
        "activities": activities,
        "incentives": incentives,
        "incentive_total": sum(i["amount"] for i in incentives),
    }
