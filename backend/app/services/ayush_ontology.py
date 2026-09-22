"""
AYUSH Clinical Ontology Engine
SehatMitra-AI · Charak-Kiosk (AIIA PS-26047)

Maps colloquial patient complaints to:
  - WHO ICD-11 codes
  - NAMASTE Ayush morbidity codes
  - Tridosha Vikriti vectors (Vata / Pitta / Kapha proportions)
  - Agni (digestive fire) classification
  - Koshtha (bowel type) classification
  - Red-flag detection for emergency triage
  - Ranked differentials list
  - Treatment protocol (allopathic + AYUSH)
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ── Output model ─────────────────────────────────────────────────────────────

class ClinicalOntologyResult(BaseModel):
    """Structured result from the AYUSH ontology processing pipeline."""

    icd11_code: str = Field(..., description="WHO ICD-11 alphanumeric code.")
    icd11_title: str = Field(..., description="ICD-11 condition display title.")
    namaste_code: str = Field(..., description="NAMASTE Ayush morbidity code.")
    namaste_title: str = Field(..., description="Ayurvedic condition name in NAMASTE taxonomy.")
    agni_type: str = Field(..., description="Digestive-fire classification: Samagni | Mandagni | Tikshnagni | Vishamagni.")
    koshtha_type: str = Field(..., description="Bowel-type classification: Krura | Madhyama | Mridu.")
    vikriti_vector: Dict[str, float] = Field(
        ..., description="Normalised Tridosha disturbance proportions (vata + pitta + kapha = 1.0)."
    )
    red_flag_alert: bool = Field(default=False, description="True if any life-threatening sign is detected.")
    red_flag_reason: Optional[str] = Field(default=None, description="Human-readable reason for the red flag, if any.")
    # ── Enhanced CDSS fields ──────────────────────────────────────────────────
    differentials: List[str] = Field(
        default_factory=list,
        description="Ranked probable differential diagnoses (top 3).",
    )
    rx_allopathic: List[str] = Field(
        default_factory=list,
        description="Conventional first-line generic drug recommendations with dose.",
    )
    rx_ayush: List[str] = Field(
        default_factory=list,
        description="Classical AYUSH formulation recommendations.",
    )
    tridosha_imbalance: Optional[str] = Field(
        default=None,
        description="Dominant dosha imbalance string (e.g. 'Pitta-Vata Pradhana').",
    )


# ── Ontology crosswalk ────────────────────────────────────────────────────────

# Each entry: icd11_code, icd11_title, namaste_code, namaste_title, vikriti_vector,
#             differentials, rx_allopathic, rx_ayush
_OntologyEntry = Dict[str, Any]

ONTOLOGY_CROSSWALK: Dict[str, _OntologyEntry] = {
    # ── Respiratory / Cough ──────────────────────────────────────────────────
    "cough": {
        "icd11_code": "CA23",
        "icd11_title": "Acute bronchitis / Productive cough",
        "namaste_code": "AYU-RS-02",
        "namaste_title": "Kasa Roga (Bronchial Disorder)",
        "vikriti_vector": {"vata": 0.45, "pitta": 0.15, "kapha": 0.40},
        "differentials": [
            "1. Viral Acute Bronchitis (most likely)",
            "2. Allergic / Post-nasal Drip Cough",
            "3. Early Pulmonary Tuberculosis (rule out if > 3 weeks)",
        ],
        "rx_allopathic": [
            "Ambroxol HCl Syrup 30 mg TDS × 5 days",
            "Levocetirizine 5 mg OD at night (if allergic component)",
            "Salbutamol Inhaler 100 mcg PRN (if wheeze present)",
        ],
        "rx_ayush": [
            "Sitopaladi Churna 3 g with honey BD",
            "Vasavaleha 10 g BD × 7 days",
            "Trikatu Churna 500 mg with warm water TDS",
        ],
    },
    "chronic_cough": {
        "icd11_code": "CA22",
        "icd11_title": "Chronic obstructive pulmonary disease (COPD)",
        "namaste_code": "AYU-RS-01",
        "namaste_title": "Tamaka Shvasa (COPD equivalent)",
        "vikriti_vector": {"vata": 0.50, "pitta": 0.10, "kapha": 0.40},
        "differentials": [
            "1. COPD exacerbation",
            "2. Bronchial Asthma",
            "3. Chronic Bronchitis",
        ],
        "rx_allopathic": [
            "Salbutamol + Ipratropium Inhaler (Combivent) BD",
            "Prednisolone 20 mg OD × 5 days (acute exacerbation)",
            "Azithromycin 500 mg OD × 3 days (if bacterial)",
        ],
        "rx_ayush": [
            "Vasavaleha 10 g BD",
            "Kanakasava 10 ml BD after food",
            "Haridra Khand 5 g with warm milk OD",
        ],
    },
    # ── Gastrointestinal / Acid Reflux ───────────────────────────────────────
    "acid_reflux": {
        "icd11_code": "MD90.0",
        "icd11_title": "Gastro-oesophageal reflux disease (GERD)",
        "namaste_code": "AYU-GI-04",
        "namaste_title": "Amlapitta (Acid Peptic Disorder)",
        "vikriti_vector": {"vata": 0.10, "pitta": 0.80, "kapha": 0.10},
        "differentials": [
            "1. Gastro-oesophageal Reflux Disease (GERD)",
            "2. Peptic Ulcer Disease",
            "3. Functional Dyspepsia",
        ],
        "rx_allopathic": [
            "Pantoprazole 40 mg OD before breakfast × 4 weeks",
            "Domperidone 10 mg TDS before meals",
            "Antacid (Aluminium Hydroxide) suspension 15 ml PRN",
        ],
        "rx_ayush": [
            "Avipattikar Churna 3 g with water BD before food",
            "Sutshekhar Rasa 250 mg BD",
            "Yashtimadhu (Licorice) 500 mg TDS with milk",
        ],
    },
    "stomach_pain": {
        "icd11_code": "DA91",
        "icd11_title": "Functional abdominal pain syndrome",
        "namaste_code": "AYU-GI-02",
        "namaste_title": "Shoola (Abdominal Colic)",
        "vikriti_vector": {"vata": 0.60, "pitta": 0.25, "kapha": 0.15},
        "differentials": [
            "1. Functional / IBS-related Abdominal Pain",
            "2. Acute Gastritis",
            "3. Biliary Colic (if right hypochondrium)",
        ],
        "rx_allopathic": [
            "Drotaverine (No-Spa) 40 mg TDS (antispasmodic)",
            "Pantoprazole 40 mg OD",
            "Metronidazole 400 mg TDS × 5 days (if infective aetiology)",
        ],
        "rx_ayush": [
            "Hingvastak Churna 3 g with ghee before food",
            "Chitrakadi Vati 2 tabs BD",
            "Ajwain (Carom seed) decoction warm BD",
        ],
    },
    # ── Musculoskeletal ───────────────────────────────────────────────────────
    "joint_pain": {
        "icd11_code": "FA00",
        "icd11_title": "Osteoarthritis",
        "namaste_code": "AYU-MS-02",
        "namaste_title": "Sandhigata Vata (Osteoarthritis equivalent)",
        "vikriti_vector": {"vata": 0.70, "pitta": 0.20, "kapha": 0.10},
        "differentials": [
            "1. Primary Osteoarthritis (most likely)",
            "2. Rheumatoid Arthritis (bilateral symmetric — rule out)",
            "3. Gout / Hyperuricaemia",
        ],
        "rx_allopathic": [
            "Aceclofenac 100 mg + Paracetamol 325 mg BD × 5 days",
            "Glucosamine 1500 mg + Chondroitin 1200 mg OD",
            "Physiotherapy referral",
        ],
        "rx_ayush": [
            "Yograj Guggulu 2 tabs TDS",
            "Mahayogaraj Guggulu (if severe) 1 tab BD",
            "Dashmoola Taila local massage BD",
        ],
    },
    # ── Metabolic ─────────────────────────────────────────────────────────────
    "diabetes": {
        "icd11_code": "5A11",
        "icd11_title": "Type 2 diabetes mellitus",
        "namaste_code": "AYU-PR-01",
        "namaste_title": "Madhumeha (Prameha — Diabetes)",
        "vikriti_vector": {"vata": 0.30, "pitta": 0.20, "kapha": 0.50},
        "differentials": [
            "1. Type 2 Diabetes Mellitus",
            "2. Impaired Glucose Tolerance (pre-diabetes)",
            "3. Metabolic Syndrome",
        ],
        "rx_allopathic": [
            "Metformin 500 mg BD with meals (titrate to 1000 mg BD)",
            "HbA1c target < 7% — re-evaluate in 3 months",
            "ACE inhibitor if microalbuminuria present",
        ],
        "rx_ayush": [
            "Nishamalaki (Turmeric + Amalaki) 500 mg BD",
            "Gurmar (Gymnema sylvestre) 400 mg BD before meals",
            "Chandraprabha Vati 2 tabs BD",
        ],
    },
    "frequent_urination": {
        "icd11_code": "5A11",
        "icd11_title": "Type 2 diabetes mellitus",
        "namaste_code": "AYU-PR-01",
        "namaste_title": "Madhumeha",
        "vikriti_vector": {"vata": 0.30, "pitta": 0.20, "kapha": 0.50},
        "differentials": [
            "1. Diabetes Mellitus — polyuria",
            "2. Urinary Tract Infection",
            "3. Benign Prostatic Hyperplasia (males > 50)",
        ],
        "rx_allopathic": [
            "FBS / PPBS / HbA1c (order investigations)",
            "Urine R/E + culture/sensitivity",
            "Nitrofurantoin 100 mg BD × 5 days if UTI confirmed",
        ],
        "rx_ayush": [
            "Chandraprabha Vati 2 tabs BD",
            "Gokshuradi Guggulu 2 tabs TDS",
            "Varuna (Crataeva nurvala) 500 mg BD",
        ],
    },
    # ── Cardiovascular ────────────────────────────────────────────────────────
    "hypertension": {
        "icd11_code": "BA00",
        "icd11_title": "Essential (primary) hypertension",
        "namaste_code": "AYU-CV-01",
        "namaste_title": "Rakta Vata (Hypertension equivalent)",
        "vikriti_vector": {"vata": 0.40, "pitta": 0.50, "kapha": 0.10},
        "differentials": [
            "1. Essential (primary) Hypertension (most common)",
            "2. Secondary Hypertension — renal / endocrine (rule out)",
            "3. White-Coat Hypertension",
        ],
        "rx_allopathic": [
            "Amlodipine 5 mg OD (CCB — first line)",
            "Losartan 50 mg OD (ARB — if ACE cough)",
            "Low-sodium diet + DASH dietary counselling",
        ],
        "rx_ayush": [
            "Sarpagandha (Rauwolfia) 250 mg BD (caution: drowsiness)",
            "Arjuna Ksheerpaka 20 ml BD",
            "Brahmi Vati 250 mg BD (anxiolytic)",
        ],
    },
    # ── Fever / Infection ─────────────────────────────────────────────────────
    "fever": {
        "icd11_code": "MG26",
        "icd11_title": "Fever of unknown origin",
        "namaste_code": "AYU-JW-01",
        "namaste_title": "Jwara (Fever)",
        "vikriti_vector": {"vata": 0.20, "pitta": 0.65, "kapha": 0.15},
        "differentials": [
            "1. Viral Fever (most common in outpatient setting)",
            "2. Malaria / Dengue (if endemic area — do NAAT/NS1)",
            "3. Typhoid Enteric Fever (Widal / Blood Culture)",
        ],
        "rx_allopathic": [
            "Paracetamol 500 mg TDS (antipyretic)",
            "ORS and oral hydration",
            "CBC + Peripheral Smear + NS1 Ag if tropical fever suspected",
        ],
        "rx_ayush": [
            "Sudarshana Ghanvati 500 mg TDS",
            "Guduchi (Tinospora) 400 mg TDS",
            "Trikatu Churna 500 mg with honey BD",
        ],
    },
    # ── Headache / Neurological ───────────────────────────────────────────────
    "headache": {
        "icd11_code": "8A80",
        "icd11_title": "Migraine / Tension-type headache",
        "namaste_code": "AYU-NR-01",
        "namaste_title": "Shirashoola (Headache)",
        "vikriti_vector": {"vata": 0.50, "pitta": 0.35, "kapha": 0.15},
        "differentials": [
            "1. Tension-type Headache (most common)",
            "2. Migraine without Aura",
            "3. Sinusitis-related Headache",
        ],
        "rx_allopathic": [
            "Ibuprofen 400 mg TDS PRN with food",
            "Sumatriptan 50 mg at onset (if migraine confirmed)",
            "Amitriptyline 10 mg OD at night (prophylaxis if > 4/month)",
        ],
        "rx_ayush": [
            "Shirashooladi Vajra Rasa 250 mg BD",
            "Pathyakshadhatryadi Kashayam 15 ml BD",
            "Brahmi Ghrita 5 ml with warm water BD",
        ],
    },
}

# ── Vernacular keyword aliases → canonical crosswalk keys ─────────────────────
# Allows free-text complaints (regional + transliterated) to resolve to the
# correct ontology entry WITHOUT returning QQ9Z / AYU-XX-00.

_KEYWORD_ALIAS_MAP: Dict[str, str] = {
    # Respiratory / Cough
    "cough": "cough",
    "khansi": "cough",
    "khanshi": "cough",
    "khaansi": "cough",
    "shvasa": "cough",
    "swas": "cough",
    "wheeze": "cough",
    "wheezing": "cough",
    "bronchitis": "cough",
    "kasa": "cough",
    "kasa roga": "cough",
    # Punjabi / Gurmukhi romanised
    "ਖੰਘ": "cough",
    "khanggh": "cough",
    # Bengali
    "কাসি": "cough",
    "kashi": "cough",
    # Tamil
    "இருமல்": "cough",
    "irumal": "cough",
    # Telugu
    "దగ్గు": "cough",
    "daggu": "cough",
    # Hindi
    "खांसी": "cough",
    "khansi hi": "cough",
    "saas": "cough",
    # Marathi
    "खोकला": "cough",
    "khokla": "cough",

    # Acid Reflux / GI
    "acid reflux": "acid_reflux",
    "acid_reflux": "acid_reflux",
    "acidity": "acid_reflux",
    "heartburn": "acid_reflux",
    "gas": "acid_reflux",
    "gerd": "acid_reflux",
    "amlapitta": "acid_reflux",
    "ਐਸਿਡਿਟੀ": "acid_reflux",
    "পেট জ্বালা": "acid_reflux",
    "জ্বালা": "acid_reflux",
    "سینے میں جلن": "acid_reflux",
    # Hindi
    "सीने में जलन": "acid_reflux",
    "पेट में जलन": "acid_reflux",
    "एसिडिटी": "acid_reflux",
    # Tamil
    "நெஞ்செரிச்சல்": "acid_reflux",

    # Stomach pain
    "stomach": "stomach_pain",
    "stomach pain": "stomach_pain",
    "abdominal pain": "stomach_pain",
    "pet dard": "stomach_pain",
    "pait dard": "stomach_pain",
    "পেট ব্যথা": "stomach_pain",
    "ਪੇਟ ਦਰਦ": "stomach_pain",
    "పొట్ట నొప్పి": "stomach_pain",

    # Joint pain / musculoskeletal
    "joint pain": "joint_pain",
    "knee pain": "joint_pain",
    "arthritis": "joint_pain",
    "jodo ka dard": "joint_pain",
    "ghutne ka dard": "joint_pain",
    "sandhishool": "joint_pain",
    "ਜੋੜਾਂ ਦਾ ਦਰਦ": "joint_pain",

    # Hypertension
    "high bp": "hypertension",
    "high blood pressure": "hypertension",
    "hypertension": "hypertension",
    "bp high": "hypertension",
    "uchch rakhtaap": "hypertension",

    # Diabetes / Urination
    "diabetes": "diabetes",
    "sugar": "diabetes",
    "madhumeha": "diabetes",
    "frequent urination": "frequent_urination",
    "polyuria": "frequent_urination",

    # Fever
    "fever": "fever",
    "bukhar": "fever",
    "bukhaar": "fever",
    "jwara": "fever",
    "jwar": "fever",
    "বুখার": "fever",
    "ਬੁਖਾਰ": "fever",
    "జ్వరం": "fever",
    "காய்ச்சல்": "fever",
    "तापमान": "fever",

    # Headache
    "headache": "headache",
    "sir dard": "headache",
    "sar dard": "headache",
    "shirashoola": "headache",
    "माथे में दर्द": "headache",
    "সিরদর্দ": "headache",
    "ਸਿਰ ਦਰਦ": "headache",
    "తలనొప్పి": "headache",
    "தலைவலி": "headache",
}

# Fallback used when a complaint key is not in the crosswalk even after alias lookup
_UNKNOWN_ENTRY: _OntologyEntry = {
    "icd11_code": "QQ9Z",
    "icd11_title": "Unspecified / not elsewhere classified",
    "namaste_code": "AYU-XX-00",
    "namaste_title": "Avyakta (Unclassified)",
    "vikriti_vector": {"vata": 0.33, "pitta": 0.34, "kapha": 0.33},
    "differentials": [
        "1. Requires detailed clinical examination for classification",
        "2. Consider specialist referral",
        "3. Symptom diary recommended",
    ],
    "rx_allopathic": ["Clinical examination required before prescribing"],
    "rx_ayush": ["Trikatu Churna 500 mg BD (general metabolic support)"],
}


def _resolve_complaint(complaint_key: str, complaints: List[str]) -> _OntologyEntry:
    """
    Resolve a complaint key → ontology entry using:
    1. Direct crosswalk lookup (exact key match).
    2. Alias map lookup on complaint_key.
    3. Keyword scan over the complaints list (handles vernacular text).
    4. Fallback to _UNKNOWN_ENTRY.

    This ensures QQ9Z / AYU-XX-00 is NEVER returned when a recognisable
    symptom keyword is present in any language.
    """
    # 1. Direct crosswalk hit
    if complaint_key in ONTOLOGY_CROSSWALK:
        return ONTOLOGY_CROSSWALK[complaint_key]

    # 2. Alias lookup on the complaint key
    canonical = _KEYWORD_ALIAS_MAP.get(complaint_key.lower().strip())
    if canonical and canonical in ONTOLOGY_CROSSWALK:
        return ONTOLOGY_CROSSWALK[canonical]

    # 3. Keyword scan over free-text complaints (any language)
    merged_text = " ".join(complaints).lower()
    # Also check the raw complaint_key as a substring
    merged_text += " " + complaint_key.lower()

    for alias_key, canonical_key in _KEYWORD_ALIAS_MAP.items():
        # Use .lower() for ASCII; keep unicode keys as-is for exact substring match
        if alias_key in merged_text or alias_key.lower() in merged_text:
            if canonical_key in ONTOLOGY_CROSSWALK:
                return ONTOLOGY_CROSSWALK[canonical_key]

    # 4. Last resort fallback
    return _UNKNOWN_ENTRY


# ── Engine ────────────────────────────────────────────────────────────────────

class AyushOntologyEngine:
    """
    Stateless clinical ontology processor for the Charak-Kiosk.

    All methods are pure functions (no I/O, no side effects).
    """

    # ------------------------------------------------------------------
    # Red-flag detection
    # ------------------------------------------------------------------

    @staticmethod
    def inspect_red_flags(
        vitals: Dict[str, Any],
        complaints: List[str],
    ) -> tuple[bool, Optional[str]]:
        """
        Screen vitals and complaint keywords for life-threatening signs.
        """
        reasons: List[str] = []

        complaint_text = " ".join(complaints).lower()
        if any(kw in complaint_text for kw in ("chest pain", "chest_pain", "angina", "chest tightness")):
            reasons.append("Chest pain / possible angina — cardiac rule-out required.")

        if any(kw in complaint_text for kw in (
            "facial droop", "face droop", "arm weakness", "speech difficulty",
            "sudden confusion", "slurred speech", "stroke", "fast sign",
        )):
            reasons.append("FAST stroke signs detected — immediate neurological assessment required.")

        spo2 = vitals.get("spo2")
        if spo2 is not None and float(spo2) < 90:
            reasons.append(f"SpO2 critically low: {spo2}% (threshold <90%) — oxygen support needed.")

        sys_bp = vitals.get("bp_systolic")
        dia_bp = vitals.get("bp_diastolic")
        if sys_bp is not None and int(sys_bp) >= 180:
            reasons.append(f"Hypertensive crisis — systolic BP {sys_bp} mmHg ≥ 180.")
        if dia_bp is not None and int(dia_bp) >= 110:
            reasons.append(f"Hypertensive crisis — diastolic BP {dia_bp} mmHg ≥ 110.")

        pulse = vitals.get("pulse")
        if pulse is not None:
            pulse_int = int(pulse)
            if pulse_int < 40:
                reasons.append(f"Severe bradycardia — pulse {pulse_int} bpm < 40.")
            elif pulse_int > 140:
                reasons.append(f"Severe tachycardia — pulse {pulse_int} bpm > 140.")

        if reasons:
            return True, " | ".join(reasons)
        return False, None

    # ------------------------------------------------------------------
    # Agni (digestive fire) classification
    # ------------------------------------------------------------------

    @staticmethod
    def map_agni(appetite_score: int, digestive_discomfort: int) -> str:
        if appetite_score >= 8 and digestive_discomfort <= 2:
            return "Tikshnagni"
        if appetite_score >= 7 and digestive_discomfort <= 3:
            return "Samagni"
        if appetite_score <= 4 and digestive_discomfort >= 6:
            return "Mandagni"
        return "Vishamagni"

    # ------------------------------------------------------------------
    # Koshtha (bowel) classification
    # ------------------------------------------------------------------

    @staticmethod
    def map_koshtha(bristol_stool_chart: int) -> str:
        if bristol_stool_chart <= 2:
            return "Krura"
        if bristol_stool_chart <= 4:
            return "Madhyama"
        return "Mridu"

    # ------------------------------------------------------------------
    # Tridosha label helper
    # ------------------------------------------------------------------

    @staticmethod
    def _vikriti_label(v: Dict[str, float]) -> str:
        """Return a human-readable dominant dosha label from the vector."""
        vata, pitta, kapha = v.get("vata", 0), v.get("pitta", 0), v.get("kapha", 0)
        sorted_doshas = sorted(
            [("Vata", vata), ("Pitta", pitta), ("Kapha", kapha)],
            key=lambda x: x[1], reverse=True
        )
        primary, secondary = sorted_doshas[0], sorted_doshas[1]
        if primary[1] >= 0.60:
            return f"{primary[0]} Pradhana"
        return f"{primary[0]}-{secondary[0]} Pradhana"

    # ------------------------------------------------------------------
    # Main pipeline
    # ------------------------------------------------------------------

    def process_intake(
        self,
        *,
        complaint_key: str,
        vitals: Dict[str, Any],
        complaints: List[str],
        appetite_score: int,
        digestive_discomfort: int,
        bristol_stool_chart: int,
    ) -> ClinicalOntologyResult:
        """
        Full intake processing pipeline.
        """
        # Resolve entry using multi-pass lookup (never returns QQ9Z if a keyword matches)
        entry = _resolve_complaint(complaint_key, complaints)

        red_flag_alert, red_flag_reason = self.inspect_red_flags(vitals, complaints)
        agni_type = self.map_agni(appetite_score, digestive_discomfort)
        koshtha_type = self.map_koshtha(bristol_stool_chart)
        vikriti = entry["vikriti_vector"]
        tridosha_imbalance = self._vikriti_label(vikriti)

        return ClinicalOntologyResult(
            icd11_code=entry["icd11_code"],
            icd11_title=entry["icd11_title"],
            namaste_code=entry["namaste_code"],
            namaste_title=entry["namaste_title"],
            agni_type=agni_type,
            koshtha_type=koshtha_type,
            vikriti_vector=vikriti,
            red_flag_alert=red_flag_alert,
            red_flag_reason=red_flag_reason,
            differentials=entry.get("differentials", []),
            rx_allopathic=entry.get("rx_allopathic", []),
            rx_ayush=entry.get("rx_ayush", []),
            tridosha_imbalance=tridosha_imbalance,
        )
