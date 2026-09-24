"""
Programme reference data for the ASHA portal.

Sources: MoHFW Universal Immunization Programme schedule, NHM ASHA
modules (HBNC, HBYC), MoHFW ANC guidelines (4 ANC contacts) and the
NPCDCS / NP-NCD Community Based Assessment Checklist (CBAC).

Everything that encodes programme rules lives here so it can be reviewed
(or localised per state) in one place. English labels are fallbacks; the
frontend translates by code.
"""
from typing import Dict, List

# ── Visit types ──────────────────────────────────────────────────────────────

VISIT_TYPES: Dict[str, str] = {
    "GENERAL": "Home visit",
    "ANC": "Pregnancy (ANC) visit",
    "HBNC": "Newborn & mother (HBNC) visit",
    "HBYC": "Young child (HBYC) visit",
    "NCD": "NCD screening (CBAC)",
    "FOLLOW_UP": "Follow-up visit",
}

# ── Immunization (UIP) ───────────────────────────────────────────────────────
# due: age in days when the dose becomes due; max: last age (days) it may be given.

VACCINES: List[Dict] = [
    {"code": "BCG",    "label": "BCG",                 "due": 0,    "max": 365,  "group": "BIRTH"},
    {"code": "OPV0",   "label": "OPV-0",               "due": 0,    "max": 15,   "group": "BIRTH"},
    {"code": "HEPB0",  "label": "Hepatitis B (birth)", "due": 0,    "max": 1,    "group": "BIRTH"},
    {"code": "OPV1",   "label": "OPV-1",               "due": 42,   "max": 1825, "group": "W6"},
    {"code": "PENTA1", "label": "Pentavalent-1",       "due": 42,   "max": 365,  "group": "W6"},
    {"code": "RVV1",   "label": "Rotavirus-1",         "due": 42,   "max": 365,  "group": "W6"},
    {"code": "FIPV1",  "label": "fIPV-1",              "due": 42,   "max": 365,  "group": "W6"},
    {"code": "PCV1",   "label": "PCV-1",               "due": 42,   "max": 365,  "group": "W6"},
    {"code": "OPV2",   "label": "OPV-2",               "due": 70,   "max": 1825, "group": "W10"},
    {"code": "PENTA2", "label": "Pentavalent-2",       "due": 70,   "max": 365,  "group": "W10"},
    {"code": "RVV2",   "label": "Rotavirus-2",         "due": 70,   "max": 365,  "group": "W10"},
    {"code": "OPV3",   "label": "OPV-3",               "due": 98,   "max": 1825, "group": "W14"},
    {"code": "PENTA3", "label": "Pentavalent-3",       "due": 98,   "max": 365,  "group": "W14"},
    {"code": "RVV3",   "label": "Rotavirus-3",         "due": 98,   "max": 365,  "group": "W14"},
    {"code": "FIPV2",  "label": "fIPV-2",              "due": 98,   "max": 365,  "group": "W14"},
    {"code": "PCV2",   "label": "PCV-2",               "due": 98,   "max": 365,  "group": "W14"},
    {"code": "MR1",    "label": "Measles-Rubella-1",   "due": 270,  "max": 1825, "group": "M9"},
    {"code": "FIPV3",  "label": "fIPV-3",              "due": 270,  "max": 365,  "group": "M9"},
    {"code": "PCVB",   "label": "PCV booster",         "due": 270,  "max": 730,  "group": "M9"},
    {"code": "VITA1",  "label": "Vitamin A (1st)",     "due": 270,  "max": 1825, "group": "M9"},
    {"code": "MR2",    "label": "Measles-Rubella-2",   "due": 480,  "max": 1825, "group": "M16"},
    {"code": "DPTB1",  "label": "DPT booster-1",       "due": 480,  "max": 2555, "group": "M16"},
    {"code": "OPVB",   "label": "OPV booster",         "due": 480,  "max": 1825, "group": "M16"},
    {"code": "VITA2",  "label": "Vitamin A (2nd)",     "due": 480,  "max": 1825, "group": "M16"},
    {"code": "DPTB2",  "label": "DPT booster-2",       "due": 1825, "max": 2555, "group": "Y5"},
    {"code": "TD10",   "label": "Td (10 years)",       "due": 3650, "max": 4380, "group": "Y10"},
    {"code": "TD16",   "label": "Td (16 years)",       "due": 5840, "max": 6570, "group": "Y16"},
]
VACCINE_BY_CODE = {v["code"]: v for v in VACCINES}

# Doses for pregnant women (recorded against the mother, tied to a pregnancy by date)
PREGNANCY_VACCINES: List[Dict] = [
    {"code": "TD1_PW", "label": "Td-1 (pregnancy)"},
    {"code": "TD2_PW", "label": "Td-2 (pregnancy)"},
    {"code": "TDB_PW", "label": "Td booster (pregnancy)"},
]
ALL_VACCINE_CODES = set(VACCINE_BY_CODE) | {v["code"] for v in PREGNANCY_VACCINES}

# Grace period after the due age before a dose counts as overdue
VACCINE_GRACE_DAYS = 28

# Full immunization (by 1 year): every primary dose up to and including MR-1
FULL_IMMUNIZATION_SET = {
    "BCG", "OPV1", "OPV2", "OPV3", "PENTA1", "PENTA2", "PENTA3", "MR1",
}

# ── Maternal & child visit schedules ─────────────────────────────────────────

# (anc number, window start week, window end week) — MoHFW: 4 ANC contacts
ANC_SCHEDULE = [(1, 0, 12), (2, 14, 26), (3, 28, 34), (4, 36, 40)]

# Home Based Newborn Care: day of life. Day 1 is added for home deliveries.
HBNC_DAYS_INSTITUTIONAL = [3, 7, 14, 21, 28, 42]
HBNC_DAYS_HOME = [1, 3, 7, 14, 21, 28, 42]

# Home Based care for Young Child: month of life
HBYC_MONTHS = [3, 6, 9, 12, 15]

NCD_SCREENING_AGE = 30
NCD_RESCREEN_DAYS = 365

# ── Danger signs ─────────────────────────────────────────────────────────────
# severity HIGH => immediate referral; MODERATE => refer / close follow-up

DANGER_SIGNS: Dict[str, Dict[str, str]] = {
    # Pregnancy
    "SEVERE_HEADACHE_BLURRED_VISION": {"label": "Severe headache / blurred vision", "severity": "HIGH"},
    "CONVULSIONS": {"label": "Convulsions / fits", "severity": "HIGH"},
    "VAGINAL_BLEEDING": {"label": "Bleeding from vagina", "severity": "HIGH"},
    "SEVERE_ABDOMINAL_PAIN": {"label": "Severe abdominal pain", "severity": "HIGH"},
    "SWELLING_FACE_HANDS": {"label": "Swelling of face / hands", "severity": "MODERATE"},
    "HIGH_FEVER": {"label": "High fever", "severity": "HIGH"},
    "REDUCED_FETAL_MOVEMENT": {"label": "Baby moving less / not moving", "severity": "HIGH"},
    "LEAKING_WATER": {"label": "Leaking water before labour", "severity": "HIGH"},
    "BREATHLESSNESS": {"label": "Breathlessness", "severity": "HIGH"},
    "SEVERE_PALLOR": {"label": "Severe paleness / weakness", "severity": "MODERATE"},
    # Postnatal mother
    "HEAVY_BLEEDING": {"label": "Heavy bleeding after delivery", "severity": "HIGH"},
    "FOUL_DISCHARGE": {"label": "Foul-smelling discharge", "severity": "HIGH"},
    "BREAST_PROBLEM": {"label": "Painful / swollen breasts", "severity": "MODERATE"},
    "LOW_MOOD": {"label": "Very sad / not caring for baby", "severity": "MODERATE"},
    # Newborn
    "NOT_FEEDING_WELL": {"label": "Not feeding well", "severity": "HIGH"},
    "FAST_BREATHING": {"label": "Fast breathing", "severity": "HIGH"},
    "CHEST_INDRAWING": {"label": "Chest in-drawing", "severity": "HIGH"},
    "TOO_COLD_OR_HOT": {"label": "Body too cold or too hot", "severity": "HIGH"},
    "LETHARGIC": {"label": "Lethargic / unconscious", "severity": "HIGH"},
    "JAUNDICE_PALMS_SOLES": {"label": "Yellow palms / soles", "severity": "HIGH"},
    "UMBILICUS_INFECTED": {"label": "Red or pus at cord", "severity": "MODERATE"},
    "SKIN_PUSTULES": {"label": "Skin boils / pustules", "severity": "MODERATE"},
    # Child
    "UNABLE_TO_DRINK": {"label": "Unable to drink / breastfeed", "severity": "HIGH"},
    "VOMITS_EVERYTHING": {"label": "Vomits everything", "severity": "HIGH"},
    "DIARRHOEA_DEHYDRATION": {"label": "Diarrhoea with dehydration", "severity": "HIGH"},
    "BLOOD_IN_STOOL": {"label": "Blood in stool", "severity": "MODERATE"},
    "FEVER_7_DAYS": {"label": "Fever for 7+ days", "severity": "MODERATE"},
    "SEVERE_WASTING": {"label": "Visible severe wasting", "severity": "HIGH"},
    "OEDEMA_BOTH_FEET": {"label": "Swelling of both feet", "severity": "HIGH"},
    "DEVELOPMENT_DELAY": {"label": "Not reaching milestones", "severity": "MODERATE"},
    # Adult / NCD / TB
    "CHEST_PAIN": {"label": "Chest pain", "severity": "HIGH"},
    "WEAKNESS_ONE_SIDE": {"label": "Sudden weakness on one side", "severity": "HIGH"},
    "COUGH_2_WEEKS": {"label": "Cough for 2+ weeks", "severity": "MODERATE"},
    "BLOOD_IN_SPUTUM": {"label": "Blood in sputum", "severity": "HIGH"},
    "FEVER_WITH_CHILLS": {"label": "Fever with chills", "severity": "MODERATE"},
    "WEIGHT_LOSS": {"label": "Unexplained weight loss", "severity": "MODERATE"},
    "NIGHT_SWEATS": {"label": "Night sweats", "severity": "MODERATE"},
    "BREAST_LUMP": {"label": "Lump in breast", "severity": "MODERATE"},
    "MOUTH_ULCER_2_WEEKS": {"label": "Mouth ulcer / patch for 2+ weeks", "severity": "MODERATE"},
}

DANGER_SIGN_SETS: Dict[str, List[str]] = {
    "ANC": [
        "SEVERE_HEADACHE_BLURRED_VISION", "CONVULSIONS", "VAGINAL_BLEEDING", "SEVERE_ABDOMINAL_PAIN",
        "SWELLING_FACE_HANDS", "HIGH_FEVER", "REDUCED_FETAL_MOVEMENT", "LEAKING_WATER",
        "BREATHLESSNESS", "SEVERE_PALLOR",
    ],
    "PNC": ["HEAVY_BLEEDING", "FOUL_DISCHARGE", "HIGH_FEVER", "CONVULSIONS", "BREAST_PROBLEM", "LOW_MOOD"],
    "HBNC": [
        "NOT_FEEDING_WELL", "CONVULSIONS", "FAST_BREATHING", "CHEST_INDRAWING", "TOO_COLD_OR_HOT",
        "LETHARGIC", "JAUNDICE_PALMS_SOLES", "UMBILICUS_INFECTED", "SKIN_PUSTULES",
    ],
    "HBYC": [
        "UNABLE_TO_DRINK", "VOMITS_EVERYTHING", "CONVULSIONS", "LETHARGIC", "FAST_BREATHING",
        "DIARRHOEA_DEHYDRATION", "BLOOD_IN_STOOL", "FEVER_7_DAYS", "SEVERE_WASTING",
        "OEDEMA_BOTH_FEET", "DEVELOPMENT_DELAY",
    ],
    "NCD": [
        "COUGH_2_WEEKS", "BLOOD_IN_SPUTUM", "FEVER_WITH_CHILLS", "WEIGHT_LOSS", "NIGHT_SWEATS",
        "BREAST_LUMP", "MOUTH_ULCER_2_WEEKS", "CHEST_PAIN", "BREATHLESSNESS",
    ],
    "GENERAL": [
        "HIGH_FEVER", "CHEST_PAIN", "BREATHLESSNESS", "CONVULSIONS", "WEAKNESS_ONE_SIDE",
        "COUGH_2_WEEKS", "BLOOD_IN_SPUTUM", "FEVER_WITH_CHILLS", "DIARRHOEA_DEHYDRATION", "WEIGHT_LOSS",
    ],
}
DANGER_SIGN_SETS["FOLLOW_UP"] = DANGER_SIGN_SETS["GENERAL"]

# ── Counselling topics ───────────────────────────────────────────────────────

COUNSELLING_TOPICS: Dict[str, str] = {
    "IFA_CALCIUM": "Iron-folic acid & calcium tablets",
    "NUTRITION": "Diet & nutrition",
    "BIRTH_PREPAREDNESS": "Birth preparedness & transport",
    "INSTITUTIONAL_DELIVERY": "Delivery at hospital",
    "EXCLUSIVE_BREASTFEEDING": "Exclusive breastfeeding (6 months)",
    "KANGAROO_CARE": "Keeping baby warm / skin-to-skin",
    "COMPLEMENTARY_FEEDING": "Complementary feeding (after 6 months)",
    "IMMUNIZATION": "Vaccination schedule",
    "HANDWASHING": "Handwashing & hygiene",
    "FAMILY_PLANNING": "Family planning & spacing",
    "ORS_ZINC": "ORS & zinc for diarrhoea",
    "DANGER_SIGNS": "Danger signs & when to seek care",
    "TB_ADHERENCE": "TB treatment adherence",
    "NCD_LIFESTYLE": "Tobacco, alcohol, activity & salt",
    "MENSTRUAL_HYGIENE": "Menstrual hygiene",
}

# ── Chronic conditions ───────────────────────────────────────────────────────

CHRONIC_CONDITIONS: Dict[str, str] = {
    "HYPERTENSION": "Hypertension",
    "DIABETES": "Diabetes",
    "TB": "Tuberculosis (on treatment)",
    "ASTHMA_COPD": "Asthma / COPD",
    "HEART_DISEASE": "Heart disease",
    "DISABILITY": "Disability",
    "MENTAL_ILLNESS": "Mental illness",
    "LEPROSY": "Leprosy",
}

# ── Government schemes ───────────────────────────────────────────────────────

SCHEMES: Dict[str, Dict[str, str]] = {
    "JSY": {"label": "Janani Suraksha Yojana", "summary": "Cash assistance for institutional delivery"},
    "JSSK": {"label": "Janani Shishu Suraksha Karyakram", "summary": "Free delivery, drugs, diet & transport; free care for sick infants"},
    "PMSMA": {"label": "PM Surakshit Matritva Abhiyan", "summary": "Free specialist ANC check-up on the 9th of every month"},
    "PMMVY": {"label": "PM Matru Vandana Yojana", "summary": "Maternity benefit for the first child (and a second girl child)"},
    "POSHAN": {"label": "Anganwadi take-home ration (Poshan)", "summary": "Supplementary nutrition for pregnant/lactating women and children 6m–6y"},
    "RBSK": {"label": "Rashtriya Bal Swasthya Karyakram", "summary": "Free screening & treatment of defects, diseases and delays (0–18 y)"},
    "PMJAY": {"label": "Ayushman Bharat PM-JAY", "summary": "Health cover of ₹5 lakh per family per year for hospital care"},
    "PMJAY_70": {"label": "Ayushman Vay Vandana (70+)", "summary": "PM-JAY cover for every senior citizen aged 70 and above"},
    "NIKSHAY_POSHAN": {"label": "Ni-kshay Poshan Yojana", "summary": "Monthly nutrition support for people on TB treatment"},
}

# ── Referral facilities ──────────────────────────────────────────────────────

FACILITY_TYPES: Dict[str, str] = {
    "SC": "Sub-centre / Ayushman Arogya Mandir",
    "PHC": "Primary Health Centre",
    "CHC": "Community Health Centre",
    "DH": "District Hospital",
}

# ── Community activities ─────────────────────────────────────────────────────

ACTIVITY_TYPES: Dict[str, str] = {
    "VHSND": "Village Health, Sanitation & Nutrition Day",
    "MOTHERS_MEETING": "Mothers' group meeting",
    "VHSNC": "VHSNC meeting",
    "AWARENESS": "Awareness session",
    "OTHER": "Other activity",
}

# ── Activity-based incentives (indicative) ───────────────────────────────────
# Central NHM rates for common activities; states add top-ups and the fixed
# monthly honorarium is not included. Shown to the ASHA as an estimate only.

INCENTIVE_RATES: Dict[str, Dict] = {
    "INSTITUTIONAL_DELIVERY": {"label": "Institutional delivery (JSY)", "amount": 600},
    "HBNC_COMPLETE": {"label": "HBNC visits completed", "amount": 250},
    "HBYC_VISIT": {"label": "HBYC visit", "amount": 50},
    "FULL_IMMUNIZATION": {"label": "Full immunization (1 year)", "amount": 100},
    "COMPLETE_IMMUNIZATION": {"label": "Complete immunization (2 years)", "amount": 75},
    "CBAC_FORM": {"label": "CBAC form filled", "amount": 10},
}


def reference_payload() -> Dict:
    """Everything the portal UI needs to render forms, in one response."""
    return {
        "visit_types": VISIT_TYPES,
        "vaccines": VACCINES,
        "pregnancy_vaccines": PREGNANCY_VACCINES,
        "danger_signs": DANGER_SIGNS,
        "danger_sign_sets": DANGER_SIGN_SETS,
        "counselling_topics": COUNSELLING_TOPICS,
        "chronic_conditions": CHRONIC_CONDITIONS,
        "schemes": SCHEMES,
        "facility_types": FACILITY_TYPES,
        "activity_types": ACTIVITY_TYPES,
        "incentive_rates": INCENTIVE_RATES,
        "anc_schedule": [{"number": n, "from_week": a, "to_week": b} for n, a, b in ANC_SCHEDULE],
        "hbnc_days": HBNC_DAYS_INSTITUTIONAL,
        "hbyc_months": HBYC_MONTHS,
    }
