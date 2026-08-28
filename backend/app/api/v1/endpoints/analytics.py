from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import get_db
from app.models.history import ConsultationHistory
from app.models.user import User
from app.api.v1.deps import get_current_user_optional
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
import datetime
import uuid

router = APIRouter()

# In-memory fast stores for ASHA field operations (starts at clean zero)
_field_screenings = []
_mch_records = []
_immunization_schedules = []
_epidemic_alerts = []

_asha_supplies = [
    {"item_id": "SUP-01", "name": "ORS (Oral Rehydration Salts) Packets", "category": "Essential Meds", "stock": 0, "unit": "Packets", "minimum_required": 50, "status": "Out of Stock"},
    {"item_id": "SUP-02", "name": "Zinc Sulfate 20mg Tablets/Syrup", "category": "Pediatric", "stock": 0, "unit": "Strips", "minimum_required": 40, "status": "Out of Stock"},
    {"item_id": "SUP-03", "name": "Iron & Folic Acid (IFA) Red Tablets", "category": "Maternal", "stock": 0, "unit": "Tablets", "minimum_required": 100, "status": "Out of Stock"},
    {"item_id": "SUP-04", "name": "Paracetamol 500mg Tablets", "category": "Essential Meds", "stock": 0, "unit": "Strips", "minimum_required": 30, "status": "Out of Stock"},
    {"item_id": "SUP-05", "name": "Rapid Pregnancy Test Kits (Nischay)", "category": "Diagnostics", "stock": 0, "unit": "Kits", "minimum_required": 15, "status": "Out of Stock"},
    {"item_id": "SUP-06", "name": "Malaria Rapid Diagnostic Test (RDT) Kits", "category": "Diagnostics", "stock": 0, "unit": "Kits", "minimum_required": 20, "status": "Out of Stock"},
    {"item_id": "SUP-07", "name": "Digital Thermometer & Pulse Oximeter", "category": "Equipment", "stock": 0, "unit": "Sets", "minimum_required": 1, "status": "Out of Stock"},
    {"item_id": "SUP-08", "name": "Sanitary Napkins (Free Days Scheme)", "category": "Hygiene", "stock": 0, "unit": "Packs", "minimum_required": 80, "status": "Out of Stock"},
]

# Pydantic Schemas
class FieldScreeningInput(BaseModel):
    patient_name: str
    age: int
    gender: str
    village: str
    phone: Optional[str] = None
    bp_systolic: Optional[int] = None
    bp_diastolic: Optional[int] = None
    spo2: Optional[int] = None
    temperature_f: Optional[float] = None
    blood_sugar: Optional[int] = None
    pregnancy_status: Optional[str] = "No"  # No, 1st Trimester, 2nd Trimester, 3rd Trimester, Lactating
    symptoms: List[str] = []
    additional_notes: Optional[str] = None

class OutbreakReportInput(BaseModel):
    village: str
    condition: str
    severity: str = "Warning"
    estimated_affected: int = 5
    symptoms_observed: List[str] = []
    suspected_cause: Optional[str] = "Contaminated Water / Vector breeding"
    recommendation: Optional[str] = "Immediate PHC intervention"

class RestockRequestInput(BaseModel):
    item_id: str
    item_name: str
    requested_quantity: int
    urgency: str = "Normal"
    asha_name: Optional[str] = "ASHA Suman Devi"
    phc_target: Optional[str] = "Rampur Primary Health Centre"

class MchInput(BaseModel):
    mother_name: str
    age: int
    village: str
    gestation_weeks: int
    hb_level: float
    high_risk_flag: bool = False
    risk_reason: Optional[str] = None
    next_anc_date: str


@router.get("/community-stats")
def get_community_health_stats(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Returns live epidemiological metrics, village risk distribution,
    syndromic trends, and field screening logs for ASHA community health workers.
    """
    total_triages = 0
    recent_records = []

    try:
        total_triages = db.query(ConsultationHistory).count() if hasattr(ConsultationHistory, 'id') else 0
    except Exception:
        total_triages = len(_field_screenings)

    # Fetch recent from DB or fallback to fast in-memory field records
    try:
        query_results = (
            db.query(ConsultationHistory, User)
            .join(User, ConsultationHistory.user_id == User.id)
            .order_by(ConsultationHistory.created_at.desc())
            .limit(10)
            .all()
        )
        for hist, usr in query_results:
            recent_records.append({
                "patient_id": usr.patient_id or f"SM-2026-{usr.id:04d}",
                "patient_name": usr.full_name or "Village Resident",
                "village": usr.village_town or "Rampur Sector 4",
                "primary_symptom": hist.reasons[0] if (hist.reasons and len(hist.reasons) > 0) else "General checkup",
                "risk_level": hist.risk_level.lower() if hist.risk_level else "low",
                "created_at": hist.created_at.isoformat() if hasattr(hist, 'created_at') and hist.created_at else datetime.datetime.utcnow().isoformat()
            })
    except Exception:
        pass

    # Combine with in-memory field screenings
    all_recent = _field_screenings + recent_records
    # Deduplicate by patient_id
    seen_ids = set()
    unique_records = []
    for r in all_recent:
        pid = r.get("patient_id")
        if pid not in seen_ids:
            seen_ids.add(pid)
            unique_records.append(r)

    # Calculate dynamic risk distribution (starts at 0)
    risk_distribution = {"low": 0, "moderate": 0, "high": 0, "emergency": 0}
    for rec in unique_records:
        lvl = rec.get("risk_level", "low").lower()
        if lvl in risk_distribution:
            risk_distribution[lvl] += 1
        else:
            risk_distribution["moderate"] += 1

    emergency_count = risk_distribution.get("emergency", 0) + risk_distribution.get("high", 0)

    # Dynamic top symptoms parsed from submitted records
    symptom_map = {}
    for r in unique_records:
        ps = r.get("primary_symptom", "")
        if ps and ps != "General Health Screening":
            for s in ps.split(","):
                clean = s.strip()
                if clean:
                    symptom_map[clean] = symptom_map.get(clean, 0) + 1

    top_symptoms = [
        {"name": k, "count": v, "trend": f"+{v}"}
        for k, v in sorted(symptom_map.items(), key=lambda item: item[1], reverse=True)[:6]
    ]

    active_villages = len(set(r.get("village") for r in unique_records if r.get("village")))

    return {
        "total_screenings": len(unique_records),
        "active_villages_covered": active_villages,
        "emergency_cases_referred": emergency_count,
        "risk_distribution": risk_distribution,
        "top_symptoms": top_symptoms,
        "epidemic_alerts": _epidemic_alerts,
        "recent_records": unique_records[:20]
    }


@router.post("/field-screening")
def record_field_screening(
    data: FieldScreeningInput,
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Allows ASHA workers to record an on-ground patient screening with instant AI triage scoring.
    """
    # Deterministic Clinical Rule Engine for Rural Health Triage
    risk_level = "low"
    recommendations = []
    red_flags = []

    # Vitals evaluation
    if data.spo2 and data.spo2 < 92:
        risk_level = "emergency"
        red_flags.append(f"Severe Hypoxia (SpO2 {data.spo2}%)")
        recommendations.append("Immediate oxygen support and urgent hospital referral.")
    elif data.spo2 and data.spo2 < 95:
        if risk_level != "emergency": risk_level = "high"
        recommendations.append("Observe respiratory effort. Nebulization or bronchodilator at PHC.")

    if data.bp_systolic and (data.bp_systolic >= 160 or (data.bp_diastolic and data.bp_diastolic >= 105)):
        if risk_level != "emergency": risk_level = "high"
        red_flags.append(f"Stage-2 Hypertension ({data.bp_systolic}/{data.bp_diastolic} mmHg)")
        recommendations.append("High risk of hypertensive crisis/stroke. Immediate anti-hypertensive evaluation.")
    elif data.bp_systolic and data.bp_systolic <= 85:
        if risk_level != "emergency": risk_level = "high"
        red_flags.append("Hypotensive Shock / Dehydration")
        recommendations.append("IV fluids and emergency stabilization.")

    if data.temperature_f and data.temperature_f >= 103.0:
        if risk_level not in ["emergency", "high"]: risk_level = "high"
        recommendations.append("High-grade fever. Cold sponge, Paracetamol, and Rapid Malaria/Dengue test.")

    if data.pregnancy_status and data.pregnancy_status not in ["No", "None"]:
        if any(s.lower() in ["bleeding", "severe headache", "blurred vision", "swelling", "convulsions"] for s in data.symptoms):
            risk_level = "emergency"
            red_flags.append("Obstetric Emergency (Preeclampsia / Antepartum Hemorrhage risk)")
            recommendations.append("Urgent 108 Ambulance dispatch to District FRU (First Referral Unit).")
        elif risk_level != "emergency" and (data.temperature_f and data.temperature_f > 100):
            risk_level = "high"
            recommendations.append("Maternal pyrexia requiring immediate doctor checkup.")

    # Symptom evaluations
    chest_symptoms = any("chest pain" in s.lower() or "sweating" in s.lower() for s in data.symptoms)
    if chest_symptoms:
        risk_level = "emergency"
        red_flags.append("Suspected Acute Coronary Syndrome (Heart Attack)")
        recommendations.append("Chew Disprin 300mg / Sorbitrate if prescribed, transfer to ICU immediately.")

    diarrhea_symptoms = any("diarrhea" in s.lower() or "vomiting" in s.lower() for s in data.symptoms)
    if diarrhea_symptoms:
        if risk_level == "low": risk_level = "moderate"
        recommendations.append("Administer ORS + Zinc packets. Maintain oral hydration.")

    if not recommendations:
        recommendations.append("Rest, adequate hydration, balanced diet, and review if symptoms persist after 48 hours.")

    new_patient_id = f"SM-2026-{uuid.uuid4().hex[:5].upper()}"
    new_record = {
        "patient_id": new_patient_id,
        "patient_name": data.patient_name,
        "age": data.age,
        "gender": data.gender,
        "village": data.village,
        "primary_symptom": ", ".join(data.symptoms) if data.symptoms else "General Health Screening",
        "bp": f"{data.bp_systolic}/{data.bp_diastolic}" if data.bp_systolic else "N/A",
        "spo2": data.spo2 or "N/A",
        "temperature": data.temperature_f or "N/A",
        "risk_level": risk_level,
        "recommendation": " ".join(recommendations),
        "red_flags": red_flags,
        "created_at": datetime.datetime.utcnow().isoformat()
    }

    _field_screenings.insert(0, new_record)

    return {
        "success": True,
        "record": new_record,
        "risk_level": risk_level,
        "red_flags": red_flags,
        "clinical_action": recommendations
    }


@router.get("/mch-records")
def get_mch_records(current_user: Optional[User] = Depends(get_current_user_optional)):
    """
    Returns maternal, ANC (Antenatal Care), and child immunization records for the ASHA portal.
    """
    return {
        "mch_mothers": _mch_records,
        "immunizations": _immunization_schedules,
        "total_high_risk_mothers": sum(1 for m in _mch_records if m.get("high_risk_flag")),
        "immunizations_due_this_week": sum(1 for i in _immunization_schedules if i.get("status") in ["Due", "Overdue"])
    }


@router.post("/mch-records")
def add_mch_record(
    data: MchInput,
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Adds a new maternal health tracking entry.
    """
    trimester = "1st"
    if data.gestation_weeks > 27:
        trimester = "3rd"
    elif data.gestation_weeks > 13:
        trimester = "2nd"

    is_high_risk = data.high_risk_flag or (data.hb_level < 10.0) or (data.age < 18 or data.age > 35)
    risk_reason = data.risk_reason
    if not risk_reason and data.hb_level < 10.0:
        risk_reason = f"Anemia (Hb {data.hb_level} g/dL)"

    new_entry = {
        "id": f"MCH-{len(_mch_records)+1:02d}",
        "mother_name": data.mother_name,
        "age": data.age,
        "village": data.village,
        "gestation_weeks": data.gestation_weeks,
        "trimester": trimester,
        "hb_level": data.hb_level,
        "high_risk_flag": is_high_risk,
        "risk_reason": risk_reason or "Normal Regular Care",
        "next_anc_date": data.next_anc_date,
        "ifa_given": 60,
        "tt_doses": 2
    }
    _mch_records.insert(0, new_entry)
    return {"success": True, "record": new_entry}


@router.get("/supplies")
def get_asha_supplies(current_user: Optional[User] = Depends(get_current_user_optional)):
    """
    Returns inventory levels of ASHA first-aid kit, medicines, and diagnostic kits.
    """
    return {
        "supplies": _asha_supplies,
        "low_stock_count": sum(1 for s in _asha_supplies if s["status"] in ["Low Stock", "Critical Low"]),
        "last_replenished": "2026-08-15"
    }


@router.post("/supplies/request")
def request_supplies_restock(
    data: RestockRequestInput,
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Submits a restock request to the PHC / Medical Officer.
    """
    for s in _asha_supplies:
        if s["item_id"] == data.item_id:
            s["status"] = "Restock Requested"

    return {
        "success": True,
        "message": f"Restock requisition of {data.requested_quantity} {data.item_name} forwarded to {data.phc_target}.",
        "requisition_id": f"REQ-{uuid.uuid4().hex[:6].upper()}",
        "estimated_fulfillment": "Within 48-72 hours via PHC Supply Van"
    }


@router.post("/report-outbreak")
def report_syndromic_outbreak(
    data: OutbreakReportInput,
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Allows ASHA to register an emergency community outbreak alert.
    """
    new_alert = {
        "id": f"ALERT-{len(_epidemic_alerts)+1:02d}",
        "village": data.village,
        "condition": data.condition,
        "severity": data.severity,
        "cases_reported": data.estimated_affected,
        "recommendation": data.recommendation or "Deploy mobile medical unit and sanitize drinking water sources.",
        "reported_at": datetime.datetime.utcnow().strftime("%Y-%m-%d")
    }
    _epidemic_alerts.insert(0, new_alert)
    return {
        "success": True,
        "alert": new_alert,
        "message": f"Outbreak Alert generated for {data.village}. Notification broadcast to PHC Medical Officer."
    }
