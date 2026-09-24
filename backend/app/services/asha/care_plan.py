"""
Care-plan engine: turns family records into the ASHA's work list.

Nothing here is stored. Due items are derived on every request from
pregnancies (LMP / EDD), dates of birth, the UIP schedule, past visits,
follow-up dates and open referrals — so recording a visit or a vaccine is
all it takes to clear a task, and the list can never drift out of sync.
"""
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, Iterable, List, Optional

from sqlalchemy.orm import Session

from app.models.asha import CareVisit, Immunization, Pregnancy, Referral
from app.models.family import FamilyMember, Household
from app.services.asha import reference as ref

IST = timezone(timedelta(hours=5, minutes=30))

STATUS_ORDER = {"overdue": 0, "due": 1, "upcoming": 2}


def today_ist() -> date:
    return datetime.now(IST).date()


def age_in_days(member: FamilyMember, on: date) -> int:
    return (on - member.dob).days


# ── Bulk context ─────────────────────────────────────────────────────────────

@dataclass
class FamilyContext:
    households: Dict[int, Household] = field(default_factory=dict)
    members: Dict[int, FamilyMember] = field(default_factory=dict)
    members_by_household: Dict[int, List[FamilyMember]] = field(default_factory=lambda: defaultdict(list))
    pregnancies: Dict[int, List[Pregnancy]] = field(default_factory=lambda: defaultdict(list))
    visits: Dict[int, List[CareVisit]] = field(default_factory=lambda: defaultdict(list))
    immunizations: Dict[int, List[Immunization]] = field(default_factory=lambda: defaultdict(list))
    referrals: Dict[int, List[Referral]] = field(default_factory=lambda: defaultdict(list))

    def active_pregnancy(self, member_id: int) -> Optional[Pregnancy]:
        for p in self.pregnancies.get(member_id, []):
            if p.status == "ACTIVE":
                return p
        return None


def load_context(db: Session, households: Iterable[Household]) -> FamilyContext:
    """Load everything needed for the given households in a handful of queries."""
    ctx = FamilyContext()
    for hh in households:
        ctx.households[hh.id] = hh
    if not ctx.households:
        return ctx

    members = (
        db.query(FamilyMember)
        .filter(FamilyMember.household_id.in_(ctx.households.keys()))
        .order_by(FamilyMember.id)
        .all()
    )
    for m in members:
        ctx.members[m.id] = m
        ctx.members_by_household[m.household_id].append(m)
    member_ids = list(ctx.members.keys())
    if not member_ids:
        return ctx

    for p in db.query(Pregnancy).filter(Pregnancy.member_id.in_(member_ids)).order_by(Pregnancy.lmp_date.desc()):
        ctx.pregnancies[p.member_id].append(p)
    for v in (
        db.query(CareVisit)
        .filter(CareVisit.member_id.in_(member_ids))
        .order_by(CareVisit.visit_date.desc(), CareVisit.id.desc())
    ):
        ctx.visits[v.member_id].append(v)
    for i in db.query(Immunization).filter(Immunization.member_id.in_(member_ids)).order_by(Immunization.given_on):
        ctx.immunizations[i.member_id].append(i)
    for r in (
        db.query(Referral)
        .filter(Referral.member_id.in_(member_ids))
        .order_by(Referral.referred_on.desc(), Referral.id.desc())
    ):
        ctx.referrals[r.member_id].append(r)
    return ctx


# ── Small serialisers shared with the API layer ─────────────────────────────

def member_brief(m: FamilyMember) -> Dict[str, Any]:
    return {
        "id": m.id,
        "name": m.name,
        "gender": m.gender,
        "dob": m.dob.isoformat(),
        "relation": m.relation,
        "risk_level": m.risk_level,
    }


def household_brief(h: Household) -> Dict[str, Any]:
    return {
        "id": h.id,
        "household_code": h.household_code,
        "head_name": h.head_name,
        "village": h.village,
        "hamlet": h.hamlet,
        "phone": h.phone,
    }


# ── Pregnancy ────────────────────────────────────────────────────────────────

def _done_keys(visits: List[CareVisit]) -> set:
    return {v.schedule_key for v in visits if v.schedule_key}


def _visits_in_pregnancy(p: Pregnancy, visits: List[CareVisit]) -> List[CareVisit]:
    end = p.outcome_date or date.max
    return [v for v in visits if v.pregnancy_id == p.id or (p.lmp_date <= v.visit_date <= end and v.visit_type == "ANC")]


def pregnancy_summary(p: Pregnancy, visits: List[CareVisit], today: date) -> Dict[str, Any]:
    ga_days = (today - p.lmp_date).days
    weeks = max(ga_days, 0) // 7
    done = _done_keys(_visits_in_pregnancy(p, visits))
    anc = []
    for n, start, end in ref.ANC_SCHEDULE:
        anc.append({
            "number": n,
            "from_week": start,
            "to_week": end,
            "done": f"ANC_{n}" in done,
            "window_start": (p.lmp_date + timedelta(weeks=start)).isoformat(),
            "window_end": (p.lmp_date + timedelta(weeks=end)).isoformat(),
        })
    return {
        "id": p.id,
        "member_id": p.member_id,
        "lmp_date": p.lmp_date.isoformat(),
        "edd": p.edd.isoformat(),
        "registered_on": p.registered_on.isoformat(),
        "gravida": p.gravida,
        "parity": p.parity,
        "rch_id": p.rch_id,
        "status": p.status,
        "high_risk": p.high_risk,
        "risk_factors": p.risk_factors or [],
        "outcome": p.outcome,
        "outcome_date": p.outcome_date.isoformat() if p.outcome_date else None,
        "delivery_place": p.delivery_place,
        "facility_name": p.facility_name,
        "gestation_weeks": weeks if p.status == "ACTIVE" else None,
        "gestation_days": ga_days % 7 if p.status == "ACTIVE" else None,
        "trimester": (1 if weeks < 13 else 2 if weeks < 28 else 3) if p.status == "ACTIVE" else None,
        "days_to_edd": (p.edd - today).days if p.status == "ACTIVE" else None,
        "anc": anc,
        "anc_done": sum(1 for a in anc if a["done"]),
    }


def _status_for_window(today: date, start: date, overdue_after: date) -> str:
    if today < start:
        return "upcoming"
    if today > overdue_after:
        return "overdue"
    return "due"


def _pregnancy_tasks(m: FamilyMember, p: Pregnancy, ctx: FamilyContext, today: date) -> List[Dict]:
    tasks: List[Dict] = []
    done = _done_keys(_visits_in_pregnancy(p, ctx.visits.get(m.id, [])))
    ga_weeks = (today - p.lmp_date).days / 7
    priority = 1 if p.high_risk else 2

    # ANC: earliest pending contact that has not been superseded by a later one
    done_numbers = {n for n, _, _ in ref.ANC_SCHEDULE if f"ANC_{n}" in done}
    for n, start, end in ref.ANC_SCHEDULE:
        if n in done_numbers or any(d > n for d in done_numbers):
            continue
        start_date = max(p.lmp_date + timedelta(weeks=start), p.registered_on)
        end_date = p.lmp_date + timedelta(weeks=end)
        if ga_weeks > end and n < 4:
            # Window passed without this contact; allow two weeks to catch up
            # before moving on to the next contact.
            if today > end_date + timedelta(days=14):
                continue
        status = _status_for_window(today, start_date, end_date)
        if status == "upcoming" and (start_date - today).days > 14:
            break
        tasks.append(_task("ANC", m, ctx, status, start_date, priority, {"number": n},
                           {"type": "visit", "visit_type": "ANC", "schedule_key": f"ANC_{n}"},
                           high_risk=p.high_risk))
        break

    # Td for the pregnant woman
    doses = {i.vaccine_code: i for i in ctx.immunizations.get(m.id, []) if i.given_on >= p.lmp_date}
    if "TD1_PW" not in doses and "TDB_PW" not in doses:
        tasks.append(_task("PW_TD", m, ctx, "overdue" if ga_weeks > 20 else "due",
                           p.registered_on, priority, {"dose": "TD1_PW"},
                           {"type": "immunization", "vaccines": ["TD1_PW"]}, high_risk=p.high_risk))
    elif "TD1_PW" in doses and "TD2_PW" not in doses:
        due = doses["TD1_PW"].given_on + timedelta(days=28)
        status = _status_for_window(today, due, due + timedelta(days=14))
        if status != "upcoming" or (due - today).days <= 7:
            tasks.append(_task("PW_TD", m, ctx, status, due, priority, {"dose": "TD2_PW"},
                               {"type": "immunization", "vaccines": ["TD2_PW"]}, high_risk=p.high_risk))

    # Birth preparedness from 34 weeks
    if ga_weeks >= 34 and "BIRTH_PREP" not in done:
        tasks.append(_task("BIRTH_PREP", m, ctx, "due", p.lmp_date + timedelta(weeks=34), priority, {},
                           {"type": "visit", "visit_type": "ANC", "schedule_key": "BIRTH_PREP"},
                           high_risk=p.high_risk))

    # Delivery outcome around the EDD
    if today >= p.edd - timedelta(days=14):
        status = "upcoming" if today < p.edd else ("overdue" if today > p.edd + timedelta(days=7) else "due")
        tasks.append(_task("DELIVERY", m, ctx, status, p.edd, 1, {"edd": p.edd.isoformat()},
                           {"type": "delivery", "pregnancy_id": p.id}, high_risk=p.high_risk))
    return tasks


# ── Newborn & child ──────────────────────────────────────────────────────────

def _scheduled_contact(m, ctx, today, *, kind, visit_type, offsets_days, key_fmt, labels, priority):
    """Shared logic for HBNC (days) and HBYC (months) home-visit schedules."""
    age = age_in_days(m, today)
    done = _done_keys([v for v in ctx.visits.get(m.id, []) if v.visit_type == visit_type])
    keys = [key_fmt.format(x) for x in labels]
    for i, offset in enumerate(offsets_days):
        key = keys[i]
        if key in done or any(k in done for k in keys[i + 1:]):
            continue
        next_offset = offsets_days[i + 1] if i + 1 < len(offsets_days) else offset + 14
        if age >= next_offset:
            continue  # missed; the next contact takes over
        due_date = m.dob + timedelta(days=offset)
        grace = 1 if visit_type == "HBNC" else 14
        if age < offset:
            if offset - age > (3 if visit_type == "HBNC" else 7):
                return []
            status = "upcoming"
        else:
            status = "overdue" if age > offset + grace else "due"
        return [_task(kind, m, ctx, status, due_date, priority, {"label": labels[i]},
                      {"type": "visit", "visit_type": visit_type, "schedule_key": key})]
    return []


def vaccine_card(m: FamilyMember, ctx: FamilyContext, today: date) -> List[Dict[str, Any]]:
    age = age_in_days(m, today)
    given = {i.vaccine_code: i for i in ctx.immunizations.get(m.id, [])}
    card = []
    for v in ref.VACCINES:
        rec = given.get(v["code"])
        due_date = m.dob + timedelta(days=v["due"])
        if rec:
            status = "given"
        elif age < v["due"]:
            status = "upcoming"
        elif age > v["max"]:
            status = "missed"
        elif age > v["due"] + ref.VACCINE_GRACE_DAYS:
            status = "overdue"
        else:
            status = "due"
        card.append({
            "code": v["code"],
            "label": v["label"],
            "group": v["group"],
            "due_date": due_date.isoformat(),
            "status": status,
            "given_on": rec.given_on.isoformat() if rec else None,
            "immunization_id": rec.id if rec else None,
        })
    return card


def _immunization_tasks(m: FamilyMember, ctx: FamilyContext, today: date) -> List[Dict]:
    if age_in_days(m, today) > 17 * 365:
        return []
    card = vaccine_card(m, ctx, today)
    pending = [c for c in card if c["status"] in ("due", "overdue")]
    soon = [c for c in card if c["status"] == "upcoming"
            and (date.fromisoformat(c["due_date"]) - today).days <= 7]
    items = pending or soon
    if not items:
        return []
    status = "overdue" if any(c["status"] == "overdue" for c in items) else ("due" if pending else "upcoming")
    due_date = min(date.fromisoformat(c["due_date"]) for c in items)
    codes = [c["code"] for c in items]
    return [_task("IMMUNIZATION", m, ctx, status, due_date, 2, {"vaccines": codes},
                  {"type": "immunization", "vaccines": codes})]


# ── Adults, follow-ups, referrals ────────────────────────────────────────────

def _ncd_tasks(m: FamilyMember, ctx: FamilyContext, today: date) -> List[Dict]:
    if age_in_days(m, today) < ref.NCD_SCREENING_AGE * 365:
        return []
    if ctx.active_pregnancy(m.id):
        return []
    last = next((v for v in ctx.visits.get(m.id, []) if v.visit_type == "NCD"), None)
    if last and (today - last.visit_date).days < ref.NCD_RESCREEN_DAYS:
        return []
    due = last.visit_date + timedelta(days=ref.NCD_RESCREEN_DAYS) if last else today
    return [_task("NCD", m, ctx, "due", due, 3, {"rescreen": bool(last)},
                  {"type": "visit", "visit_type": "NCD", "schedule_key": None})]


def _followup_tasks(m: FamilyMember, ctx: FamilyContext, today: date) -> List[Dict]:
    visits = ctx.visits.get(m.id, [])
    if not visits:
        return []
    latest = visits[0]
    if not latest.next_followup_date:
        return []
    due = latest.next_followup_date
    if (due - today).days > 3:
        return []
    status = "upcoming" if due > today else ("overdue" if (today - due).days > 2 else "due")
    priority = 1 if latest.risk_level == "HIGH" else 2
    return [_task("FOLLOW_UP", m, ctx, status, due, priority,
                  {"after_visit_type": latest.visit_type, "visit_id": latest.id},
                  {"type": "visit", "visit_type": "FOLLOW_UP", "schedule_key": None})]


REFERRAL_CONFIRM_AFTER = {"EMERGENCY": 0, "URGENT": 1, "ROUTINE": 3}


def _referral_tasks(m: FamilyMember, ctx: FamilyContext, today: date) -> List[Dict]:
    tasks = []
    for r in ctx.referrals.get(m.id, []):
        if r.status != "PENDING":
            continue
        due = r.referred_on + timedelta(days=REFERRAL_CONFIRM_AFTER.get(r.urgency, 3))
        status = "upcoming" if today < due else ("overdue" if (today - due).days > 2 else "due")
        tasks.append(_task("REFERRAL", m, ctx, status, due, 1 if r.urgency != "ROUTINE" else 2,
                           {"reason": r.reason, "urgency": r.urgency, "facility": r.facility_name},
                           {"type": "referral", "referral_id": r.id}))
    return tasks


# ── Assembly ─────────────────────────────────────────────────────────────────

def _task(kind, m, ctx, status, due_date, priority, params, action, high_risk=False) -> Dict[str, Any]:
    hh = ctx.households.get(m.household_id)
    key = action.get("schedule_key") or action.get("referral_id") or ",".join(action.get("vaccines", [])) or ""
    return {
        "id": f"{kind}:{m.id}:{key}",
        "kind": kind,
        "status": status,
        "due_date": due_date.isoformat(),
        "priority": 1 if (high_risk or m.risk_level == "HIGH") else priority,
        "high_risk": bool(high_risk or m.risk_level == "HIGH"),
        "params": params,
        "action": action,
        "member": member_brief(m),
        "household": household_brief(hh) if hh else None,
    }


def member_tasks(m: FamilyMember, ctx: FamilyContext, today: date) -> List[Dict]:
    if m.status != "ACTIVE":
        return []
    tasks: List[Dict] = []
    preg = ctx.active_pregnancy(m.id)
    if preg:
        tasks += _pregnancy_tasks(m, preg, ctx, today)

    age = age_in_days(m, today)
    if age <= 44:
        home = m.birth_place == "HOME"
        days = ref.HBNC_DAYS_HOME if home else ref.HBNC_DAYS_INSTITUTIONAL
        tasks += _scheduled_contact(m, ctx, today, kind="HBNC", visit_type="HBNC", offsets_days=days,
                                    key_fmt="HBNC_D{}", labels=days, priority=1)
    elif age <= int(15 * 30.4) + 45:
        offsets = [int(mo * 30.4) for mo in ref.HBYC_MONTHS]
        tasks += _scheduled_contact(m, ctx, today, kind="HBYC", visit_type="HBYC", offsets_days=offsets,
                                    key_fmt="HBYC_M{}", labels=ref.HBYC_MONTHS, priority=2)
    tasks += _immunization_tasks(m, ctx, today)
    tasks += _ncd_tasks(m, ctx, today)
    tasks += _followup_tasks(m, ctx, today)
    tasks += _referral_tasks(m, ctx, today)
    return tasks


def sort_tasks(tasks: List[Dict]) -> List[Dict]:
    return sorted(tasks, key=lambda t: (STATUS_ORDER[t["status"]], t["priority"], t["due_date"]))


def all_tasks(ctx: FamilyContext, today: date) -> List[Dict]:
    tasks: List[Dict] = []
    for m in ctx.members.values():
        tasks += member_tasks(m, ctx, today)
    return sort_tasks(tasks)


def next_schedule_key(m: FamilyMember, ctx: FamilyContext, today: date, visit_type: str) -> Optional[str]:
    """Which scheduled contact an ad-hoc visit of this type most likely fulfils."""
    for t in member_tasks(m, ctx, today):
        a = t["action"]
        if a.get("type") == "visit" and a.get("visit_type") == visit_type and a.get("schedule_key"):
            return a["schedule_key"]
    return None


# ── Tags & schemes ───────────────────────────────────────────────────────────

def member_tags(m: FamilyMember, ctx: FamilyContext, today: date, tasks: Optional[List[Dict]] = None) -> List[Dict]:
    tags: List[Dict] = []
    if m.status != "ACTIVE":
        return [{"code": m.status}]
    age = age_in_days(m, today)
    preg = ctx.active_pregnancy(m.id)
    if preg:
        tags.append({"code": "PREGNANT", "value": (today - preg.lmp_date).days // 7})
        if preg.high_risk:
            tags.append({"code": "HIGH_RISK_PREGNANCY"})
    elif _is_lactating(m, ctx, today):
        tags.append({"code": "LACTATING"})
    elif m.gender == "F" and m.marital_status == "MARRIED" and 15 * 365 <= age < 50 * 365:
        tags.append({"code": "ELIGIBLE_COUPLE"})

    if age <= 28:
        tags.append({"code": "NEWBORN"})
    elif age < 365:
        tags.append({"code": "INFANT"})
    elif age < 5 * 365:
        tags.append({"code": "CHILD_U5"})
    elif age >= 60 * 365:
        tags.append({"code": "SENIOR"})

    if m.risk_level == "HIGH" and not (preg and preg.high_risk):
        tags.append({"code": "HIGH_RISK"})
    for c in m.chronic_conditions or []:
        tags.append({"code": "CONDITION", "value": c})

    tasks = tasks if tasks is not None else member_tasks(m, ctx, today)
    if any(t["kind"] == "IMMUNIZATION" and t["status"] == "overdue" for t in tasks):
        tags.append({"code": "VACCINE_OVERDUE"})
    if any(r.status == "PENDING" for r in ctx.referrals.get(m.id, [])):
        tags.append({"code": "REFERRAL_PENDING"})
    return tags


def _is_lactating(m: FamilyMember, ctx: FamilyContext, today: date) -> bool:
    for p in ctx.pregnancies.get(m.id, []):
        if p.outcome == "LIVE_BIRTH" and p.outcome_date and (today - p.outcome_date).days <= 180:
            return True
    return False


def scheme_suggestions(m: FamilyMember, hh: Household, ctx: FamilyContext, today: date) -> List[Dict]:
    codes: List[str] = []
    age = age_in_days(m, today)
    preg = ctx.active_pregnancy(m.id)
    if preg:
        codes += ["JSSK", "PMSMA"]
        if hh.is_bpl or hh.social_category in ("SC", "ST"):
            codes.append("JSY")
        if not preg.gravida or preg.gravida <= 2:
            codes.append("PMMVY")
        codes.append("POSHAN")
    elif _is_lactating(m, ctx, today):
        codes.append("POSHAN")
    if age < 365:
        codes.append("JSSK")
    if 180 <= age < 6 * 365:
        codes.append("POSHAN")
    if age < 18 * 365:
        codes.append("RBSK")
    if age >= 70 * 365:
        codes.append("PMJAY_70")
    elif hh.is_bpl:
        codes.append("PMJAY")
    if "TB" in (m.chronic_conditions or []):
        codes.append("NIKSHAY_POSHAN")
    enrolled = set(m.enrolled_schemes or [])
    seen, out = set(), []
    for c in codes:
        if c not in seen:
            seen.add(c)
            out.append({"code": c, "enrolled": c in enrolled})
    return out


# ── Summary counts ───────────────────────────────────────────────────────────

def summary_counts(ctx: FamilyContext, tasks: List[Dict], today: date) -> Dict[str, int]:
    active = [m for m in ctx.members.values() if m.status == "ACTIVE"]
    pregnant = [m for m in active if ctx.active_pregnancy(m.id)]
    # Routine yearly NCD screening is counted separately so it doesn't drown out
    # time-critical maternal, newborn and vaccination work.
    care = [t for t in tasks if t["kind"] != "NCD"]
    return {
        "households": len(ctx.households),
        "population": len(active),
        "overdue": sum(1 for t in care if t["status"] == "overdue"),
        "due": sum(1 for t in care if t["status"] == "due"),
        "upcoming": sum(1 for t in care if t["status"] == "upcoming"),
        "screening_due": len(tasks) - len(care),
        "pregnant": len(pregnant),
        "high_risk_pregnancies": sum(1 for m in pregnant if ctx.active_pregnancy(m.id).high_risk),
        "high_risk_members": sum(1 for m in active if m.risk_level == "HIGH"),
        "newborns": sum(1 for m in active if age_in_days(m, today) <= 42),
        "children_u5": sum(1 for m in active if age_in_days(m, today) < 5 * 365),
        "vaccines_overdue": len({t["member"]["id"] for t in tasks
                                 if t["kind"] == "IMMUNIZATION" and t["status"] == "overdue"}),
        "referrals_pending": sum(1 for rs in ctx.referrals.values() for r in rs if r.status == "PENDING"),
    }
