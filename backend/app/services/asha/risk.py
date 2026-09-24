"""
Rule-based risk assessment for an ASHA home visit.

Deliberately simple and explainable: every flag carries a reason code the
ASHA can see, and the thresholds follow NHM field guidance. This is decision
support for referral, not a diagnosis.
"""
from typing import Any, Dict, List, Optional, Tuple

from app.services.asha.reference import DANGER_SIGNS

LEVELS = ["LOW", "MODERATE", "HIGH"]


def _bump(level: str, to: str) -> str:
    return to if LEVELS.index(to) > LEVELS.index(level) else level


def cbac_score(age_years: int, cbac: Dict[str, Any], gender: str) -> int:
    """NP-NCD Community Based Assessment Checklist, Part A (score > 4 => at risk)."""
    score = 0
    if age_years >= 60:
        score += 3
    elif age_years >= 50:
        score += 2
    elif age_years >= 40:
        score += 1

    tobacco = cbac.get("tobacco")  # NEVER | PAST | DAILY
    if tobacco == "DAILY":
        score += 2
    elif tobacco == "PAST":
        score += 1

    if cbac.get("alcohol_daily"):
        score += 1

    waist = cbac.get("waist_cm")
    if waist:
        waist = float(waist)
        if gender == "F":
            score += 2 if waist > 90 else 1 if waist > 80 else 0
        else:
            score += 2 if waist > 100 else 1 if waist > 90 else 0

    if cbac.get("inactive"):          # < 150 minutes of activity a week
        score += 1
    if cbac.get("family_history"):    # parent/sibling with HTN, diabetes or heart disease
        score += 2
    return score


def assess_visit(
    *,
    visit_type: str,
    age_days: int,
    gender: str,
    is_pregnant: bool,
    vitals: Dict[str, Any],
    danger_signs: List[str],
    findings: Optional[Dict[str, Any]] = None,
) -> Tuple[str, List[Dict[str, Any]], Dict[str, Any]]:
    """
    Returns (risk_level, reasons, extra) where extra may carry derived
    values such as the CBAC score and a suggested referral urgency.
    """
    level = "LOW"
    reasons: List[Dict[str, Any]] = []
    extra: Dict[str, Any] = {}
    findings = findings or {}

    def flag(code: str, severity: str, value: Any = None):
        nonlocal level
        reasons.append({"code": code, "severity": severity, "value": value})
        level = _bump(level, severity)

    # Danger signs (mother's PNC signs arrive in the same list during HBNC)
    for sign in danger_signs or []:
        meta = DANGER_SIGNS.get(sign)
        if meta:
            flag(sign, meta["severity"])

    sys_bp, dia_bp = vitals.get("bp_systolic"), vitals.get("bp_diastolic")
    if sys_bp and dia_bp:
        bp = f"{sys_bp}/{dia_bp}"
        if sys_bp >= 160 or dia_bp >= 110:
            flag("BP_SEVERE", "HIGH", bp)
        elif sys_bp >= 140 or dia_bp >= 90:
            # Raised BP in pregnancy is a pre-eclampsia warning sign
            flag("BP_HIGH", "HIGH" if is_pregnant else "MODERATE", bp)

    spo2 = vitals.get("spo2")
    if spo2:
        if spo2 < 90:
            flag("SPO2_CRITICAL", "HIGH", spo2)
        elif spo2 < 94:
            flag("SPO2_LOW", "MODERATE", spo2)

    temp = vitals.get("temperature_c")
    if temp:
        if age_days <= 60:
            if temp >= 37.5 or temp < 35.5:
                flag("NEWBORN_TEMPERATURE", "HIGH", temp)
        elif temp >= 39.5:
            flag("FEVER_HIGH", "HIGH", temp)
        elif temp >= 38.0:
            flag("FEVER", "MODERATE", temp)

    hb = vitals.get("hb")
    if hb:
        if hb < 7:
            flag("HB_SEVERE", "HIGH", hb)
        elif hb < (11 if is_pregnant else 10):
            flag("HB_LOW", "MODERATE", hb)

    sugar = vitals.get("blood_sugar")
    if sugar:
        if sugar < 70:
            flag("SUGAR_LOW", "HIGH", sugar)
        elif sugar >= 300:
            flag("SUGAR_VERY_HIGH", "HIGH", sugar)
        elif sugar >= 200:
            flag("SUGAR_HIGH", "MODERATE", sugar)

    pulse = vitals.get("pulse")
    if pulse and age_days > 365 and (pulse > 120 or pulse < 50):
        flag("PULSE_ABNORMAL", "MODERATE", pulse)

    weight = vitals.get("weight_kg")
    if weight and visit_type == "HBNC":
        if weight < 1.8:
            flag("LBW_VERY", "HIGH", weight)
        elif weight < 2.5:
            flag("LBW", "MODERATE", weight)

    muac = vitals.get("muac_cm")
    if muac and 180 <= age_days <= 1825:
        if muac < 11.5:
            flag("MUAC_SAM", "HIGH", muac)
        elif muac < 12.5:
            flag("MUAC_MAM", "MODERATE", muac)

    if visit_type == "NCD" and isinstance(findings.get("cbac"), dict):
        score = cbac_score(age_days // 365, findings["cbac"], gender)
        extra["cbac_score"] = score
        if score > 4:
            flag("CBAC_HIGH", "MODERATE", score)

    if level == "HIGH":
        extra["suggested_urgency"] = "EMERGENCY" if any(
            r["severity"] == "HIGH" and r["code"] in DANGER_SIGNS for r in reasons
        ) else "URGENT"
    elif level == "MODERATE":
        extra["suggested_urgency"] = "ROUTINE"

    return level, reasons, extra
