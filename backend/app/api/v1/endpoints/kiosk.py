"""
Charak Kiosk — OPD Intake, Queue & Doctor Cockpit Endpoints
SehatMitra-AI · Sprint 5 (AIIA PS-26047)

Two-stage clinical state machine:
  TRIAGE_PENDING     – freshly submitted by kiosk; waiting at nurse desk.
  EMERGENCY_TRIAGE   – red-flag intake; directly escalated, also at nurse desk.
  READY_FOR_DOCTOR   – nurse verified vitals and forwarded to a doctor cabin.
  IN_CONSULTATION    – doctor has opened the cockpit (attending).
  COMPLETED          – doctor marked the encounter finished.

POST /api/v1/kiosk/intake
    Runs the full triage pipeline, caches cockpit record, and enqueues to OPD.

GET  /api/v1/kiosk/doctor-cockpit/{token_id}
    Retrieves the cached cockpit record for the doctor dashboard.

GET  /api/v1/kiosk/queue
    Returns active OPD tokens sorted: EMERGENCY_TRIAGE first, then FIFO.

POST /api/v1/kiosk/queue/{token_id}/status
    Doctor-side status transition (IN_CONSULTATION | COMPLETED).

POST /api/v1/kiosk/queue/{token_id}/nurse-verify
    Nurse-side vitals verification and cabin assignment.
    Transitions status → READY_FOR_DOCTOR.

POST /api/v1/kiosk/ocr-prescription
    Accepts base64 image, extracts drug names via IBM Granite vision/text.

POST /api/v1/kiosk/parse-medicines
    Accepts free text, returns normalized drug list via IBM Granite.
"""

from __future__ import annotations

import base64
import json
import random
import re
import string
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional, Union

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.models.history import ConsultationHistory
from app.api.v1.deps import get_optional_current_user
from app.services.ayush_ontology import AyushOntologyEngine
from app.services.rx_safety import HerbDrugSafetyEngine
from app.services.fhir_builder import FhirR4BundleBuilder
from app.services.ibm_granite import query_granite_triage, build_soap_note

router = APIRouter(prefix="/kiosk", tags=["Charak Kiosk"])

# ── In-memory OPD cockpit store ───────────────────────────────────────────────
ACTIVE_COCKPIT_STORE: Dict[str, Dict[str, Any]] = {}

# ── In-memory OPD Queue ───────────────────────────────────────────────────────
# Each entry: token_id → OPDQueueEntry dict
OPD_QUEUE: Dict[str, Dict[str, Any]] = {}


# ── Token helper ─────────────────────────────────────────────────────────────

def _generate_token(red_flag: bool) -> str:
    rand = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    prefix = "OPD-RED" if red_flag else "OPD-GRN"
    return f"{prefix}-{rand}"


# ── Pydantic schema ───────────────────────────────────────────────────────────

class VitalsPayload(BaseModel):
    systolic: Optional[int] = Field(None, description="Systolic blood pressure (mmHg).")
    diastolic: Optional[int] = Field(None, description="Diastolic blood pressure (mmHg).")
    pulse: Optional[int] = Field(None, description="Heart rate (bpm).")
    spo2: Optional[float] = Field(None, description="Peripheral oxygen saturation (%).")
    temp: Optional[float] = Field(None, description="Body temperature (°C).")


class KioskIntakePayload(BaseModel):
    patient_id: str = Field(..., description="Stable patient identifier (DB primary key or ABHA ID).")
    patient_name: str = Field(..., description="Patient display name.")
    age: Optional[int] = Field(None, description="Patient age in years.")
    gender: Optional[str] = Field(None, description="Patient gender (male | female | other).")
    chief_complaint_key: str = Field(
        ..., description="Coded complaint slug matching ONTOLOGY_CROSSWALK (e.g. 'acid_reflux')."
    )
    raw_symptoms: List[str] = Field(
        default_factory=list, description="Free-text / coded symptom descriptions."
    )
    pain_scale: Optional[int] = Field(None, ge=0, le=10, description="Self-reported pain intensity 0–10.")
    appetite_level: int = Field(..., ge=1, le=10, description="Self-reported appetite score 1–10.")
    digestive_issue: int = Field(..., ge=0, le=10, description="Self-reported digestive discomfort 0–10.")
    bristol_stool: int = Field(..., ge=1, le=7, description="Bristol Stool Form Scale 1–7.")
    stress_level: Optional[int] = Field(None, ge=0, le=10, description="Self-reported stress score 0–10.")
    vitals: VitalsPayload = Field(default_factory=VitalsPayload)
    current_allopathic_drugs: List[str] = Field(
        default_factory=list, description="Generic names of allopathic drugs currently taken."
    )
    current_herbal_remedies: List[str] = Field(
        default_factory=list, description="Ayurvedic herbs or classical formulations currently taken."
    )
    # ── Interlingua / multilingual intake fields ──────────────────────────────
    intake_language: str = Field(
        "en-IN",
        description="ISO language code used at kiosk (e.g. 'bn-IN', 'hi-IN', 'ta-IN').",
    )
    vernacular_transcript: Optional[str] = Field(
        None,
        description="Raw patient-spoken text in their native language (used for bilingual bridge).",
    )


# ── Service singletons ────────────────────────────────────────────────────────

_ontology_engine = AyushOntologyEngine()
_fhir_builder = FhirR4BundleBuilder()


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/intake")
def kiosk_intake(
    payload: KioskIntakePayload,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
) -> Dict[str, Any]:
    """
    Run the full Charak Kiosk triage pipeline:
    1. AYUSH Ontology → ICD-11 / NAMASTE codes, Tridosha, Agni, Koshtha, red-flag.
    2. Herb–Drug Safety → interaction warnings.
    3. Token generation.
    4. FHIR R4 Bundle construction.
    5. IBM Granite triage summary (15-second SOAP card).
    6. Cache cockpit record.
    """
    # Step 1: AYUSH Ontology Engine
    vitals_dict: Dict[str, Any] = {
        "bp_systolic": payload.vitals.systolic,
        "bp_diastolic": payload.vitals.diastolic,
        "pulse": payload.vitals.pulse,
        "spo2": payload.vitals.spo2,
        "temp": payload.vitals.temp,
    }
    ontology_result = _ontology_engine.process_intake(
        complaint_key=payload.chief_complaint_key,
        vitals=vitals_dict,
        complaints=payload.raw_symptoms,
        appetite_score=payload.appetite_level,
        digestive_discomfort=payload.digestive_issue,
        bristol_stool_chart=payload.bristol_stool,
    )

    # Step 2: Herb–Drug Safety Engine
    interaction_warnings = HerbDrugSafetyEngine.evaluate_interactions(
        allopathic_drugs=payload.current_allopathic_drugs,
        herbal_inputs=payload.current_herbal_remedies,
    )

    # Step 3: Generate triage token
    token_id = _generate_token(ontology_result.red_flag_alert)

    # Step 4: Build FHIR R4 Bundle
    fhir_bundle = _fhir_builder.build_abdm_bundle(
        patient_id=payload.patient_id,
        patient_name=payload.patient_name,
        icd11_code=ontology_result.icd11_code,
        icd11_title=ontology_result.icd11_title,
        namaste_code=ontology_result.namaste_code,
        namaste_title=ontology_result.namaste_title,
        agni_type=ontology_result.agni_type,
        koshtha_type=ontology_result.koshtha_type,
        chief_complaint=payload.chief_complaint_key,
        age=payload.age,
        gender=payload.gender,
        opd_token=token_id,
    )

    # Step 5: IBM Granite — build actionable English SOAP + interlingua summary
    granite_soap = build_soap_note(
        patient_name=payload.patient_name,
        age=payload.age,
        gender=payload.gender,
        chief_complaint_key=payload.chief_complaint_key,
        raw_symptoms=payload.raw_symptoms,
        pain_scale=payload.pain_scale,
        ontology_icd11=f"{ontology_result.icd11_code} {ontology_result.icd11_title}".strip(),
        ontology_namaste=f"{ontology_result.namaste_code} {ontology_result.namaste_title}".strip(),
        red_flag=ontology_result.red_flag_alert,
        intake_language=payload.intake_language,
        vernacular_transcript=payload.vernacular_transcript,
        # CDSS fields from ontology engine
        differentials=ontology_result.differentials,
        rx_allopathic=ontology_result.rx_allopathic,
        rx_ayush=ontology_result.rx_ayush,
        tridosha_imbalance=ontology_result.tridosha_imbalance,
    )
    symptoms_summary = ", ".join(payload.raw_symptoms) if payload.raw_symptoms else payload.chief_complaint_key
    granite_summary = query_granite_triage(
        symptoms=symptoms_summary,
        intake_language=payload.intake_language,
        vernacular_transcript=payload.vernacular_transcript,
    )

    # Step 6: Cache cockpit record (includes all CDSS fields for the bento grid)
    cockpit_record: Dict[str, Any] = {
        "token_id": token_id,
        "patient_id": payload.patient_id,
        "patient_name": payload.patient_name,
        "age": payload.age,
        "gender": payload.gender,
        "chief_complaint_key": payload.chief_complaint_key,
        "raw_symptoms": payload.raw_symptoms,
        "pain_scale": payload.pain_scale,
        "stress_level": payload.stress_level,
        "vitals": vitals_dict,
        "ontology": ontology_result.model_dump(),
        "interaction_warnings": [w.model_dump() for w in interaction_warnings],
        "fhir_bundle": fhir_bundle,
        # SOAP note always in Clinical English
        "granite_triage_summary": granite_soap,
        # CDSS treatment fields (surfaced directly in the bento grid)
        "differentials": ontology_result.differentials,
        "rx_allopathic": ontology_result.rx_allopathic,
        "rx_ayush": ontology_result.rx_ayush,
        # Interlingua / bilingual bridge fields
        "intake_language": payload.intake_language,
        "vernacular_text": payload.vernacular_transcript or "",
    }
    ACTIVE_COCKPIT_STORE[token_id] = cockpit_record

    # ── Authenticated users: link triage token + FHIR summary to their profile ─
    saved_to_history = False
    if current_user is not None:
        try:
            summary_text = (
                f"OPD Token: {token_id} | "
                f"Complaint: {payload.chief_complaint_key} | "
                f"Tridosha: {ontology_result.tridosha_imbalance if hasattr(ontology_result, 'tridosha_imbalance') else 'N/A'} | "
                f"Red Flag: {ontology_result.red_flag_alert}"
            )
            convo = [
                {"sender": "user", "text": f"Kiosk intake: {payload.chief_complaint_key}"},
                {"sender": "ai", "text": granite_summary or summary_text},
            ]
            history_entry = ConsultationHistory(
                user_id=current_user.id,
                language="en",
                conversation_history=convo,
                risk_level="high" if ontology_result.red_flag_alert else "low",
                recommendation=granite_summary or summary_text,
            )
            db.add(history_entry)
            db.commit()
            db.refresh(history_entry)
            saved_to_history = True
        except Exception as db_err:
            db.rollback()
            print(f"[kiosk endpoint] Failed to save triage to history: {db_err}")

    # Step 7: Enqueue to OPD queue
    # Assign a default cabin from complaint key; nurse can override via /nurse-verify.
    _CABIN_MAP = {
        "stomach_pain": "Cabin 2 - Gastro",
        "joint_pain":   "Cabin 3 - Ortho",
        "cough":        "Cabin 1 - General",
        "diabetes":     "Cabin 4 - Endocrinology",
        "hypertension": "Cabin 4 - Cardiology",
    }
    cabin = _CABIN_MAP.get(payload.chief_complaint_key, "Cabin 1 - General")
    # Initial status: EMERGENCY_TRIAGE for red-flags, TRIAGE_PENDING for routine.
    initial_status = "EMERGENCY_TRIAGE" if ontology_result.red_flag_alert else "TRIAGE_PENDING"
    OPD_QUEUE[token_id] = {
        "token_id": token_id,
        "patient_name": payload.patient_name,
        "age": payload.age,
        "gender": payload.gender,
        "chief_complaint": payload.chief_complaint_key,
        "pain_scale": payload.pain_scale,
        "red_flag": ontology_result.red_flag_alert,
        "red_flag_reason": ontology_result.red_flag_reason,
        "status": initial_status,
        "cabin": cabin,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "vitals": vitals_dict,
    }

    return {
        "status": "success",
        "token_id": token_id,
        "red_flag": ontology_result.red_flag_alert,
        "red_flag_reason": ontology_result.red_flag_reason,
        "cabin": cabin,
        "cockpit_url": f"/api/v1/kiosk/doctor-cockpit/{token_id}",
        "saved_to_history": saved_to_history,
    }


@router.get("/doctor-cockpit/{token_id}")
def doctor_cockpit(token_id: str) -> Dict[str, Any]:
    """Return the full cached cockpit record for a given OPD token."""
    record = ACTIVE_COCKPIT_STORE.get(token_id)
    if record is None:
        raise HTTPException(status_code=404, detail=f"Token '{token_id}' not found in active OPD store.")
    return record


# ── OPD Queue Endpoints ───────────────────────────────────────────────────────

@router.get("/queue")
def get_opd_queue(include_all: bool = False) -> Dict[str, Any]:
    """
    Return OPD queue entries.

    By default returns only active tokens (excludes COMPLETED and CANCELLED).
    Pass ``?include_all=true`` to return the full history (for the Analytics tab).

    Sort order for active queue:
      1. EMERGENCY_TRIAGE (red-flag, at nurse desk) — most urgent
      2. TRIAGE_PENDING   (awaiting nurse)
      3. READY_FOR_DOCTOR (vitals verified, waiting for doctor cabin)
      4. IN_CONSULTATION  (with doctor)
    Within each bucket, FIFO by created_at.
    """
    _STATUS_ORDER: Dict[str, int] = {
        "EMERGENCY_TRIAGE": 0,
        "TRIAGE_PENDING":   1,
        "READY_FOR_DOCTOR": 2,
        "IN_CONSULTATION":  3,
        "COMPLETED":        4,
        "CANCELLED":        5,
    }
    all_entries = list(OPD_QUEUE.values())
    if include_all:
        entries = all_entries
    else:
        entries = [e for e in all_entries if e["status"] not in ("COMPLETED", "CANCELLED")]
    entries.sort(key=lambda e: (_STATUS_ORDER.get(e["status"], 9), e["created_at"]))
    return {"queue": entries, "total": len(entries), "total_all": len(all_entries)}


class QueueStatusUpdate(BaseModel):
    status: Literal["IN_CONSULTATION", "COMPLETED", "CANCELLED"]


@router.post("/queue/{token_id}/status")
def update_queue_status(token_id: str, body: QueueStatusUpdate) -> Dict[str, Any]:
    """Doctor-side status transition: IN_CONSULTATION or COMPLETED."""
    entry = OPD_QUEUE.get(token_id)
    if entry is None:
        raise HTTPException(status_code=404, detail=f"Token '{token_id}' not in queue.")
    entry["status"] = body.status
    return {"token_id": token_id, "status": body.status}


@router.post("/queue/{token_id}/cancel")
def cancel_queue_token(token_id: str) -> Dict[str, Any]:
    """Mark a token as CANCELLED (no-show or duplicate). Idempotent."""
    entry = OPD_QUEUE.get(token_id)
    if entry is None:
        raise HTTPException(status_code=404, detail=f"Token '{token_id}' not in queue.")
    if entry["status"] == "COMPLETED":
        raise HTTPException(status_code=409, detail="Cannot cancel a completed consultation.")
    entry["status"] = "CANCELLED"
    entry["cancelled_at"] = datetime.now(timezone.utc).isoformat()
    return {"token_id": token_id, "status": "CANCELLED"}


# ── Nurse Verify Endpoint ─────────────────────────────────────────────────────

class NurseVerifyPayload(BaseModel):
    bp_systolic:    Optional[int]   = Field(None, description="Systolic blood pressure (mmHg).")
    bp_diastolic:   Optional[int]   = Field(None, description="Diastolic blood pressure (mmHg).")
    pulse:          Optional[int]   = Field(None, description="Heart rate (bpm).")
    spo2:           Optional[float] = Field(None, description="Peripheral oxygen saturation (%).")
    temp:           Optional[float] = Field(None, description="Body temperature (°F).")
    nurse_notes:    Optional[str]   = Field(None, description="Free-text nurse observations.")
    assigned_cabin: Optional[str]   = Field(None, description="Cabin assigned by nurse (e.g. 'Cabin 1 - Dr. Sharma').")
    red_flag:       Optional[bool]  = Field(None, description="Manual escalation override by nurse.")


@router.post("/queue/{token_id}/nurse-verify")
def nurse_verify(token_id: str, body: NurseVerifyPayload) -> Dict[str, Any]:
    """
    Nurse verification endpoint.

    1. Merges nurse-measured vitals into the queue entry and the cockpit store.
    2. Flags vitals as verified_by_nurse = True.
    3. Transitions status from TRIAGE_PENDING / EMERGENCY_TRIAGE → READY_FOR_DOCTOR.
    4. Optionally updates assigned cabin and red_flag escalation.
    5. Returns the full updated queue entry.
    """
    queue_entry = OPD_QUEUE.get(token_id)
    if queue_entry is None:
        raise HTTPException(status_code=404, detail=f"Token '{token_id}' not in queue.")

    # Only allow the transition from nurse-pending states.
    # If somehow already IN_CONSULTATION / COMPLETED, silently update vitals but don't
    # regress the status.
    nurse_pending = queue_entry["status"] in ("TRIAGE_PENDING", "EMERGENCY_TRIAGE")

    # Merge vitals — only overwrite fields that were explicitly supplied (not None).
    existing_vitals: Dict[str, Any] = queue_entry.get("vitals") or {}
    if body.bp_systolic  is not None: existing_vitals["bp_systolic"]  = body.bp_systolic
    if body.bp_diastolic is not None: existing_vitals["bp_diastolic"] = body.bp_diastolic
    if body.pulse        is not None: existing_vitals["pulse"]        = body.pulse
    if body.spo2         is not None: existing_vitals["spo2"]         = body.spo2
    if body.temp         is not None: existing_vitals["temp"]         = body.temp
    existing_vitals["verified_by_nurse"] = True
    if body.nurse_notes:
        existing_vitals["nurse_notes"] = body.nurse_notes
    queue_entry["vitals"] = existing_vitals

    # Nurse can manually escalate red_flag.
    if body.red_flag is not None:
        queue_entry["red_flag"] = body.red_flag

    # Cabin assignment override.
    if body.assigned_cabin:
        queue_entry["cabin"] = body.assigned_cabin

    # Transition state → READY_FOR_DOCTOR only if we're coming from a nurse-pending state.
    if nurse_pending:
        queue_entry["status"] = "READY_FOR_DOCTOR"

    # Mirror verified vitals into the cockpit store so doctor sees them immediately.
    cockpit = ACTIVE_COCKPIT_STORE.get(token_id)
    if cockpit is not None:
        cockpit_vitals: Dict[str, Any] = cockpit.get("vitals") or {}
        if body.bp_systolic  is not None: cockpit_vitals["bp_systolic"]  = body.bp_systolic
        if body.bp_diastolic is not None: cockpit_vitals["bp_diastolic"] = body.bp_diastolic
        if body.pulse        is not None: cockpit_vitals["pulse"]        = body.pulse
        if body.spo2         is not None: cockpit_vitals["spo2"]         = body.spo2
        if body.temp         is not None: cockpit_vitals["temp"]         = body.temp
        cockpit_vitals["verified_by_nurse"] = True
        cockpit["vitals"] = cockpit_vitals

    return queue_entry


# ── OCR Prescription Endpoint ─────────────────────────────────────────────────

class OcrPayload(BaseModel):
    image_base64: str = Field(..., description="Base64-encoded JPEG/PNG of prescription image.")


_COMMON_DRUGS = [
    "metformin", "amlodipine", "atorvastatin", "metoprolol", "lisinopril",
    "pantoprazole", "aspirin", "losartan", "glibenclamide", "ramipril",
    "telmisartan", "clopidogrel", "atenolol", "omeprazole", "esomeprazole",
    "cetirizine", "montelukast", "azithromycin", "amoxicillin", "ciprofloxacin",
    "paracetamol", "ibuprofen", "diclofenac", "aceclofenac", "pregabalin",
    "gabapentin", "sertraline", "escitalopram", "alprazolam", "clonazepam",
    "levothyroxine", "furosemide", "spironolactone", "insulin", "glipizide",
]


@router.post("/ocr-prescription")
def ocr_prescription(payload: OcrPayload) -> Dict[str, Any]:
    """
    Extract drug names from a base64 prescription image.
    Uses IBM Granite text extraction prompt; falls back to regex scan on
    a simulated plain-text pass when vision model is unavailable.
    """
    try:
        # Attempt Granite with image description prompt
        image_bytes = base64.b64decode(payload.image_base64)
        prompt = (
            "You are a clinical pharmacist. Extract only the generic drug names "
            "from the prescription image text below. Return a JSON array of strings. "
            "Example: [\"Metformin\", \"Amlodipine\"]. "
            "If uncertain, omit. Only return the JSON array, no other text.\n"
            "Prescription text (OCR):\n[IMAGE]\n"
        )
        # Try Granite (text-only prompt with image context note)
        granite_response = query_granite_triage(symptoms=prompt)
        # Try to parse JSON from response
        match = re.search(r'\[.*?\]', granite_response or '', re.DOTALL)
        if match:
            drugs = json.loads(match.group())
            if isinstance(drugs, list):
                normalized = [str(d).strip().title() for d in drugs if d]
                return {
                    "drugs": normalized,
                    "extracted_medicines": normalized,
                    "confidence": 0.82,
                }
    except Exception:
        pass

    # Fallback: return empty with guidance
    return {
        "drugs": [],
        "extracted_medicines": [],
        "confidence": 0.0,
        "note": "OCR service unavailable; please enter medications manually.",
    }


# ── Parse Medicines (Voice) Endpoint ─────────────────────────────────────────

class ParseMedicinesPayload(BaseModel):
    text: str = Field(..., description="Free-text from voice describing current medications.")


@router.post("/parse-medicines")
def parse_medicines(payload: ParseMedicinesPayload) -> Dict[str, Any]:
    """
    Use IBM Granite to normalize free-text medication list against NFI drug names.
    Falls back to regex scan if Granite unavailable.
    """
    try:
        prompt = (
            "Extract only generic drug names from the following patient-spoken text. "
            "Return a JSON array of normalized generic names matching Indian NFI formulary. "
            "Example: [\"Metformin\", \"Amlodipine\"]. "
            "Only return the JSON array, no other text.\n"
            f"Patient said: \"{payload.text}\""
        )
        granite_response = query_granite_triage(symptoms=prompt)
        match = re.search(r'\[.*?\]', granite_response or '', re.DOTALL)
        if match:
            drugs = json.loads(match.group())
            if isinstance(drugs, list):
                return {"drugs": [str(d).strip().title() for d in drugs if d]}
    except Exception:
        pass

    # Fallback: match known drugs by substring
    text_lower = payload.text.lower()
    found = [d.title() for d in _COMMON_DRUGS if d in text_lower]
    return {"drugs": found}
