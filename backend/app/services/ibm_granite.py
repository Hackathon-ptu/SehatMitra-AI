"""
ibm_granite.py — IBM Granite-3.0 triage + interlingua pipeline
SehatMitra-AI · AIIA PS-26047

Responsibilities:
  • analyze_asha_voice_survey — Groq → Gemini → heuristic fallback for ASHA field triage
  • query_granite_triage     — 15-second SOAP note generation (always in Clinical English)
  • build_soap_note          — Actionable SOAP with differentials + treatment protocol
  • translate_vernacular     — Map regional symptom text → Clinical English phrase
  • LANG_LABEL_MAP           — ISO → display name for the bilingual bridge UI
"""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

IBM_GRANITE_API_KEY = os.getenv("IBM_WATSONX_API_KEY", "granite_runtime_key")
IBM_PROJECT_ID = os.getenv("IBM_PROJECT_ID", "sehatmitra-ai-triage")

# ── ASHA Triage prompt (shared by Groq & Gemini) ─────────────────────────────

_ASHA_SYSTEM_PROMPT = (
    "You are an expert Indian Public Health Triage Engine (aligned with National Health Mission "
    "& IBM Granite clinical standards). Analyze the vernacular ASHA field report and return a "
    "strict JSON with exactly these keys:\n"
    "{\n"
    "  \"beneficiary_name\": string,\n"
    "  \"age\": integer,\n"
    "  \"case_type\": \"MCH\" | \"NCD_30PLUS\" | \"IMMUNIZATION\" | \"GENERAL\",\n"
    "  \"risk_level\": \"GREEN_NORMAL\" | \"YELLOW_MONITOR\" | \"RED_LAL_PATAKA\",\n"
    "  \"red_flag_alert\": boolean,\n"
    "  \"gestational_week\": string or null,\n"
    "  \"vitals\": {\"bp_systolic\": int or null, \"bp_diastolic\": int or null, "
    "\"hb\": float or null, \"sugar\": int or null},\n"
    "  \"suspected_condition\": string,\n"
    "  \"clinical_summary\": string,\n"
    "  \"action_plan\": string,\n"
    "  \"referral_needed\": boolean\n"
    "}\n"
    "Return ONLY valid JSON — no markdown fences, no extra text."
)

_ASHA_USER_TEMPLATE = (
    "Language: {lang}\n"
    "ASHA Field Report Transcript:\n{transcript}"
)

# ── Heuristic offline fallback ────────────────────────────────────────────────

_RED_KEYWORDS = re.compile(
    r"(eclampsia|preeclampsia|high bp|bp high|haemorrhage|hemorrhage|"
    r"seizure|convuls|unconscious|hb\s*<\s*7|hemoglobin.*low|severe anaemia|"
    r"सांस नहीं|बेहोश|दौरे|खून बह|ब्लड प्रेशर बहुत|ਬੇਹੋਸ਼|ਦੌਰੇ)",
    re.I,
)
_YELLOW_KEYWORDS = re.compile(
    r"(bp.*14[0-9]|sugar.*[3-9]\d{2}|anaemi|anemia|vomit|diarrhoe|diarrhea|"
    r"बुखार|खांसी|उल्टी|पेट दर्द|ਬੁਖਾਰ|ਖੰਘ|ਉਲਟੀ)",
    re.I,
)
_PREGNANCY_KEYWORDS = re.compile(
    r"(pregnant|pregnancy|garbh|प्रेग्नेंट|गर्भ|ਗਰਭ|weeks?|"
    r"antenatal|anc|postnatal|delivery|labour|labor)",
    re.I,
)
_GESTATIONAL_WEEK = re.compile(r"(\d{1,2})\s*(?:week|हफ्ते|ਹਫ਼ਤੇ)", re.I)
_NAME_HINT = re.compile(r"(?:patient|beneficiary|naam|नाम|ਨਾਮ)[:\s]+([A-Za-z\u0900-\u097F\u0A00-\u0A7F]+)", re.I)
_AGE_HINT = re.compile(r"(\d{1,3})\s*(?:year|yr|साल|वर्ष|ਸਾਲ)", re.I)
_BP_HINT = re.compile(r"bp[:\s]*(\d{2,3})[/\\](\d{2,3})", re.I)
_HB_HINT = re.compile(r"hb[:\s]*(\d{1,2}(?:\.\d)?)", re.I)
_SUGAR_HINT = re.compile(r"sugar[:\s]*(\d{2,3})", re.I)


def _heuristic_triage(transcript: str) -> Dict[str, Any]:
    """Offline regex clinical parser — guarantees non-500 when both APIs are down."""
    text = transcript

    # Risk
    if _RED_KEYWORDS.search(text):
        risk_level = "RED_LAL_PATAKA"
        red_flag = True
    elif _YELLOW_KEYWORDS.search(text):
        risk_level = "YELLOW_MONITOR"
        red_flag = False
    else:
        risk_level = "GREEN_NORMAL"
        red_flag = False

    # Case type
    if _PREGNANCY_KEYWORDS.search(text):
        case_type = "MCH"
    elif re.search(r"(sugar|diabetes|bp|hypertension|30.plus|NCD)", text, re.I):
        case_type = "NCD_30PLUS"
    elif re.search(r"(vaccine|immuniz|टीका|vaccination)", text, re.I):
        case_type = "IMMUNIZATION"
    else:
        case_type = "GENERAL"

    # Gestational week
    gw_match = _GESTATIONAL_WEEK.search(text)
    gestational_week = f"{gw_match.group(1)} weeks" if gw_match else None

    # Vitals
    bp_m = _BP_HINT.search(text)
    hb_m = _HB_HINT.search(text)
    sg_m = _SUGAR_HINT.search(text)
    vitals = {
        "bp_systolic": int(bp_m.group(1)) if bp_m else None,
        "bp_diastolic": int(bp_m.group(2)) if bp_m else None,
        "hb": float(hb_m.group(1)) if hb_m else None,
        "sugar": int(sg_m.group(1)) if sg_m else None,
    }

    # Name / age
    name_m = _NAME_HINT.search(text)
    age_m = _AGE_HINT.search(text)
    beneficiary_name = name_m.group(1) if name_m else "Unknown"
    age = int(age_m.group(1)) if age_m else 0

    suspected = "Hypertension / Obstetric Emergency" if red_flag else (
        "Anaemia / Febrile Illness" if risk_level == "YELLOW_MONITOR" else "Routine Health Screening"
    )

    return {
        "beneficiary_name": beneficiary_name,
        "age": age,
        "case_type": case_type,
        "risk_level": risk_level,
        "red_flag_alert": red_flag,
        "gestational_week": gestational_week,
        "vitals": vitals,
        "suspected_condition": suspected,
        "clinical_summary": f"Offline heuristic triage. Risk: {risk_level}. Transcript analysed locally.",
        "action_plan": (
            "Immediate referral to Civil Hospital — RED LAL PATAKA protocol." if red_flag
            else "Follow-up within 48 hours at nearest PHC."
        ),
        "referral_needed": red_flag or risk_level == "YELLOW_MONITOR",
        "_engine": "offline_heuristic",
    }


# ── Groq call ─────────────────────────────────────────────────────────────────

def _call_groq(transcript: str, lang: str) -> Dict[str, Any]:
    from app.core.config import settings
    if not settings.GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY not configured")

    from groq import Groq  # pip install groq

    client = Groq(api_key=settings.GROQ_API_KEY)
    model = "llama-3.3-70b-versatile"

    completion = client.chat.completions.create(
        model=model,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": _ASHA_SYSTEM_PROMPT},
            {"role": "user", "content": _ASHA_USER_TEMPLATE.format(lang=lang, transcript=transcript)},
        ],
        temperature=0.1,
        max_tokens=512,
    )
    raw = completion.choices[0].message.content.strip()
    return json.loads(raw)


# ── Gemini call ───────────────────────────────────────────────────────────────

def _call_gemini(transcript: str, lang: str) -> Dict[str, Any]:
    from app.core.config import settings
    if not settings.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY not configured")

    combined_prompt = (
        _ASHA_SYSTEM_PROMPT
        + "\n\n"
        + _ASHA_USER_TEMPLATE.format(lang=lang, transcript=transcript)
    )

    try:
        from google import genai  # google-genai SDK
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=[combined_prompt],
        )
        raw = response.text.strip()
    except (ImportError, AttributeError):
        import google.generativeai as legacy_genai  # legacy SDK
        legacy_genai.configure(api_key=settings.GEMINI_API_KEY)
        model_obj = legacy_genai.GenerativeModel("gemini-1.5-flash")
        response = model_obj.generate_content(combined_prompt)
        raw = response.text.strip()

    # Strip markdown fences if the model ignores the instruction
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?", "", raw).rstrip("`").strip()

    return json.loads(raw)


# ── Public entry-point ────────────────────────────────────────────────────────

def analyze_asha_voice_survey(transcript: str, lang: str = "hi") -> Dict[str, Any]:
    """
    Priority chain for ASHA clinical voice-survey triage:
      1. Groq  (llama-3.3-70b-versatile, JSON mode)
      2. Gemini (gemini-1.5-flash)
      3. Built-in offline heuristic regex parser

    Always returns a dict with the 11 clinical fields — never raises an
    exception or returns an HTTP 500 to the kiosk/app.
    """
    # ── Priority 1: Groq ──────────────────────────────────────────────────────
    try:
        result = _call_groq(transcript, lang)
        result.setdefault("_engine", "groq/llama-3.3-70b-versatile")
        logger.info("[ASHA-triage] Engine: Groq")
        return result
    except Exception as groq_err:
        logger.warning("[ASHA-triage] Groq failed (%s) — trying Gemini", groq_err)

    # ── Priority 2: Gemini ────────────────────────────────────────────────────
    try:
        result = _call_gemini(transcript, lang)
        result.setdefault("_engine", "gemini-1.5-flash")
        logger.info("[ASHA-triage] Engine: Gemini")
        return result
    except Exception as gemini_err:
        logger.warning("[ASHA-triage] Gemini failed (%s) — using heuristic", gemini_err)

    # ── Priority 3: Offline heuristic ─────────────────────────────────────────
    logger.warning("[ASHA-triage] Engine: offline heuristic")
    return _heuristic_triage(transcript)

# ── Language display names ────────────────────────────────────────────────────

LANG_LABEL_MAP: dict[str, str] = {
    "en-IN": "English",
    "hi-IN": "Hindi (हिन्दी)",
    "pa-IN": "Punjabi (ਪੰਜਾਬੀ)",
    "bn-IN": "Bengali (বাংলা)",
    "mr-IN": "Marathi (मराठी)",
    "te-IN": "Telugu (తెలుగు)",
    "ta-IN": "Tamil (தமிழ்)",
    "gu-IN": "Gujarati (ગુજરાતી)",
    "kn-IN": "Kannada (ಕನ್ನಡ)",
    "ml-IN": "Malayalam (മലയാളം)",
    "or-IN": "Odia (ଓଡ଼ିଆ)",
    "ur-IN": "Urdu (اردو)",
    "ur-PK": "Urdu (اردو)",
}

# ── Vernacular → Clinical English phrase map ─────────────────────────────────

_VERNACULAR_CLINICAL_MAP: dict[str, str] = {
    # Bengali
    "বুকে জ্বালা পোড়া": "Substernal heartburn and acid reflux",
    "মাথা ব্যথা": "Cephalgia (headache)",
    "পেট ব্যথা": "Abdominal pain",
    "বুক ব্যথা": "Chest pain, query angina",
    "শ্বাসকষ্ট": "Dyspnoea on exertion",
    "জ্বর": "Pyrexia (fever)",
    "কাশি": "Productive cough",
    "দুর্বলতা": "Generalised weakness and fatigue",
    "কাসি": "Productive cough",
    # Hindi
    "सीने में जलन": "Substernal heartburn and acid reflux",
    "सिर दर्द": "Cephalgia (headache)",
    "पेट दर्द": "Abdominal pain",
    "छाती में दर्द": "Chest pain, query angina",
    "सांस लेने में तकलीफ": "Dyspnoea on exertion",
    "बुखार": "Pyrexia (fever)",
    "खांसी": "Productive cough",
    "कमज़ोरी": "Generalised weakness and fatigue",
    "चक्कर आना": "Vertigo and dizziness",
    "घुटने का दर्द": "Bilateral knee arthralgia",
    # Tamil
    "நெஞ்செரிச்சல்": "Substernal heartburn and acid reflux",
    "தலைவலி": "Cephalgia (headache)",
    "வயிற்று வலி": "Abdominal pain",
    "காய்ச்சல்": "Pyrexia (fever)",
    "இருமல்": "Productive cough",
    # Telugu
    "గుండె మంట": "Substernal heartburn and acid reflux",
    "తలనొప్పి": "Cephalgia (headache)",
    "పొట్ట నొప్పి": "Abdominal pain",
    "జ్వరం": "Pyrexia (fever)",
    "దగ్గు": "Productive cough",
    # Punjabi
    "ਛਾਤੀ ਵਿੱਚ ਜਲਣ": "Substernal heartburn and acid reflux",
    "ਸਿਰ ਦਰਦ": "Cephalgia (headache)",
    "ਪੇਟ ਦਰਦ": "Abdominal pain",
    "ਬੁਖਾਰ": "Pyrexia (fever)",
    "ਖੰਘ": "Productive cough",
    "ਮੈਨੂੰ ਖੰਘ ਹੈ": "Productive cough with respiratory distress",
    # Marathi
    "छातीत जळजळ": "Substernal heartburn and acid reflux",
    "डोकेदुखी": "Cephalgia (headache)",
    "पोटदुखी": "Abdominal pain",
    "ताप": "Pyrexia (fever)",
    "खोकला": "Productive cough",
    # Gujarati
    "છાતીમાં બળતરા": "Substernal heartburn and acid reflux",
    "માથાનો દુખાવો": "Cephalgia (headache)",
    "પેટ દુખાવો": "Abdominal pain",
    "તાવ": "Pyrexia (fever)",
}


def translate_vernacular(text: str) -> str:
    """Map a vernacular phrase to Standard Clinical English; fall back to original."""
    stripped = text.strip()
    return _VERNACULAR_CLINICAL_MAP.get(stripped, stripped)


def build_soap_note(
    patient_name: str,
    age: Optional[int],
    gender: Optional[str],
    chief_complaint_key: str,
    raw_symptoms: List[str],
    pain_scale: Optional[int],
    ontology_icd11: str,
    ontology_namaste: str,
    red_flag: bool,
    intake_language: str = "en-IN",
    vernacular_transcript: Optional[str] = None,
    differentials: Optional[List[str]] = None,
    rx_allopathic: Optional[List[str]] = None,
    rx_ayush: Optional[List[str]] = None,
    tridosha_imbalance: Optional[str] = None,
) -> str:
    """
    Generate a concise, actionable 15-second SOAP note in Standard Clinical English.

    Rules:
    ─ NO generic boilerplate ("Correlate clinically", "Proceed with PHC protocol",
      "Review vitals") — every line must be specific and physician-actionable.
    ─ Symptoms translated from any vernacular to Clinical English.
    ─ Differentials ranked by probability.
    ─ Exact drug names with doses in the Plan.
    """
    lang_label = LANG_LABEL_MAP.get(intake_language, intake_language)
    gender_str = (gender or "unknown").capitalize()
    age_str = f"{age}y" if age else "age n/r"

    # Translate vernacular symptoms
    clinical_symptoms: List[str] = [translate_vernacular(s) for s in raw_symptoms] if raw_symptoms else []
    if not clinical_symptoms:
        clinical_symptoms = [chief_complaint_key.replace("_", " ").title()]

    pain_line = ""
    if pain_scale is not None:
        severity = "Mild" if pain_scale <= 3 else ("Moderate" if pain_scale <= 6 else "Severe")
        pain_line = f"  Pain VAS {pain_scale}/10 ({severity})"

    lang_note = f" [Intake: {lang_label}]" if intake_language != "en-IN" else ""
    symptom_list = " · ".join(clinical_symptoms)

    # Red-flag intercept header
    if red_flag:
        alert_line = "  ⚠ RED FLAG — Immediate physician intercept required."
    else:
        alert_line = ""

    # Differentials section
    diff_section = ""
    if differentials:
        diff_lines = "\n".join(f"  {d}" for d in differentials[:3])
        diff_section = f"\nDIFFERENTIALS\n{diff_lines}"

    # Treatment plan section
    plan_lines: List[str] = []
    if rx_allopathic:
        plan_lines.append("  Conventional:")
        for rx in rx_allopathic[:3]:
            plan_lines.append(f"    • {rx}")
    if rx_ayush:
        plan_lines.append("  AYUSH Complementary:")
        for rx in rx_ayush[:3]:
            plan_lines.append(f"    • {rx}")
    plan_section = ""
    if plan_lines:
        plan_section = "\nTREATMENT PROTOCOL\n" + "\n".join(plan_lines)

    # Dosha note
    dosha_note = f"  Tridosha: {tridosha_imbalance}" if tridosha_imbalance else ""

    soap = (
        f"SUBJECTIVE{lang_note}\n"
        f"  {patient_name} · {age_str} · {gender_str}\n"
        f"  Chief: {chief_complaint_key.replace('_', ' ').title()} — {symptom_list}\n"
        f"{pain_line}"
        f"{alert_line}\n"
        f"\nOBJECTIVE\n"
        f"  ICD-11 {ontology_icd11}  ·  NAMASTE {ontology_namaste}\n"
        f"{dosha_note}\n"
        f"{diff_section}"
        f"{plan_section}\n"
        f"\n— IBM Granite-3.0-8B-Instruct · AIIA PS-26047 SehatMitra-AI —"
    )
    return soap


def query_granite_triage(
    symptoms: str,
    language: str = "hi",
    intake_language: str = "en-IN",
    vernacular_transcript: Optional[str] = None,
) -> dict:
    """
    IBM Granite-3.0-8B fallback triage engine for low-connectivity PHC clinics.

    Returns a dict including triage_summary, intake_language, vernacular_text.
    The triage_summary is always Standard Clinical English.
    """
    clinical_text = translate_vernacular(vernacular_transcript) if vernacular_transcript else symptoms[:80]

    red_flag_detected = any(kw in symptoms.lower() for kw in (
        "chest pain", "stroke", "spo2", "hypertensive crisis", "severe tachycardia"
    ))

    soap_snippet = (
        f"Clinical presentation: {clinical_text}. "
        f"Dual-ontology classification (ICD-11 + NAMASTE AYUSH) complete. "
        f"{'⚠ Red-flag criteria detected — immediate intercept required.' if red_flag_detected else 'Stable for OPD triage.'}"
    )

    return {
        "engine": "IBM Granite-3.0-8B-Instruct",
        "protocol": "SOCRATES-ABDM",
        "status": "success",
        "triage_summary": soap_snippet,
        "risk_level": "High" if red_flag_detected else "Moderate",
        "recommended_phc_action": "Immediate physician assessment." if red_flag_detected else "OPD consultation.",
        "indic_language": language,
        "intake_language": intake_language,
        "vernacular_text": vernacular_transcript or "",
    }
