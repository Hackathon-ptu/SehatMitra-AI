"""
Sprint 4 — Charak Kiosk Pipeline Verification Script
SehatMitra-AI · AIIA PS-26047

Runs a full end-to-end smoke-test against a locally running backend instance:
  POST /api/v1/kiosk/intake   → validates token_id and 200 OK
  GET  /api/v1/kiosk/doctor-cockpit/{token_id}
       → validates drug_warnings ≥ 1 and FHIR Bundle resourceType

Usage
-----
  # Start the backend first (from the backend/ directory):
  #   uvicorn app.main:app --reload --port 8000
  #
  # Then run this script:
  #   python backend/test_kiosk_pipeline.py

Dependencies: httpx (pip install httpx) — falls back to requests if available.
"""

from __future__ import annotations

import sys
import json

# ── HTTP client selection ─────────────────────────────────────────────────────
try:
    import httpx as _http_lib
    _USE_HTTPX = True
except ImportError:
    try:
        import requests as _http_lib  # type: ignore[no-redef]
        _USE_HTTPX = False
    except ImportError:
        print("[FATAL] Neither 'httpx' nor 'requests' is installed.")
        print("        Run: pip install httpx")
        sys.exit(1)


BASE_URL = "http://127.0.0.1:8000"

# ── Synthetic test payload (per Sprint 4 spec) ────────────────────────────────
INTAKE_PAYLOAD = {
    "patient_id": "TEST-PATIENT-001",
    "patient_name": "Arjun Sharma",
    "age": 45,
    "gender": "male",
    # Chief complaint: acid reflux (present in ONTOLOGY_CROSSWALK)
    "chief_complaint_key": "acid_reflux",
    "raw_symptoms": ["acid reflux", "heartburn"],
    # Pain: 6
    "pain_scale": 6,
    # Appetite: 3  → Mandagni (low appetite, maps to digestive discomfort)
    "appetite_level": 3,
    # digestive_issue: 7  → combined with appetite_level=3 → Mandagni
    "digestive_issue": 7,
    # Bristol Stool: 2 → Krura
    "bristol_stool": 2,
    "stress_level": 4,
    "vitals": {
        "systolic": 130,
        "diastolic": 85,
        "pulse": 78,
        "spo2": 97.5,
        "temp": 37.1,
    },
    # Allopathic — dosage suffix deliberately included to exercise normalization
    "current_allopathic_drugs": ["Metformin 500mg"],
    # Ayurvedic herbs — both present in SAFETY_KNOWLEDGE_GRAPH
    "current_herbal_remedies": ["Haridra", "Arogyavardhini Vati"],
}


def _post(url: str, payload: dict) -> tuple[int, dict]:
    if _USE_HTTPX:
        resp = _http_lib.post(url, json=payload, timeout=30)
        return resp.status_code, resp.json()
    resp = _http_lib.post(url, json=payload, timeout=30)
    return resp.status_code, resp.json()


def _get(url: str) -> tuple[int, dict]:
    if _USE_HTTPX:
        resp = _http_lib.get(url, timeout=30)
        return resp.status_code, resp.json()
    resp = _http_lib.get(url, timeout=30)
    return resp.status_code, resp.json()


def run_tests() -> None:
    print("=" * 60)
    print("  SehatMitra-AI · Sprint 4 Kiosk Pipeline Verification")
    print("=" * 60)

    # ── Test 1: POST /api/v1/kiosk/intake ─────────────────────────────────────
    print("\n[TEST 1] POST /api/v1/kiosk/intake ...")
    intake_url = f"{BASE_URL}/api/v1/kiosk/intake"
    status, body = _post(intake_url, INTAKE_PAYLOAD)

    assert status == 200, (
        f"Expected 200 OK from /intake, got {status}.\n"
        f"Response body: {json.dumps(body, indent=2)}"
    )
    print(f"  ✓ status_code == 200")

    token_id: str = body.get("token_id", "")
    assert token_id.startswith("OPD-"), (
        f"Expected token_id to start with 'OPD-', got: {token_id!r}"
    )
    print(f"  ✓ token_id starts with 'OPD-'  →  {token_id}")

    # ── Test 2: GET /api/v1/kiosk/doctor-cockpit/{token_id} ──────────────────
    print(f"\n[TEST 2] GET /api/v1/kiosk/doctor-cockpit/{token_id} ...")
    cockpit_url = f"{BASE_URL}/api/v1/kiosk/doctor-cockpit/{token_id}"
    ck_status, cockpit = _get(cockpit_url)

    assert ck_status == 200, (
        f"Expected 200 OK from /doctor-cockpit, got {ck_status}.\n"
        f"Response body: {json.dumps(cockpit, indent=2)}"
    )
    print(f"  ✓ status_code == 200")

    drug_warnings: list = cockpit.get("interaction_warnings", [])
    assert len(drug_warnings) >= 1, (
        f"Expected at least 1 drug_warning, got {len(drug_warnings)}.\n"
        f"Warnings: {json.dumps(drug_warnings, indent=2)}"
    )
    print(f"  ✓ drug_warnings length == {len(drug_warnings)}  (≥ 1)")
    for w in drug_warnings:
        print(f"      [{w['severity']}] {w['allopathic_drug']} ↔ {w['ayurvedic_herb']}")

    fhir_bundle: dict = cockpit.get("fhir_bundle", {})
    assert fhir_bundle.get("resourceType") == "Bundle", (
        f"Expected fhir_bundle.resourceType == 'Bundle', "
        f"got: {fhir_bundle.get('resourceType')!r}"
    )
    print(f"  ✓ fhir_bundle['resourceType'] == 'Bundle'")

    # ── Summary ───────────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("  ALL ASSERTIONS PASSED ✓")
    print("=" * 60)
    print(f"\n  Token  : {token_id}")
    print(f"  Red-flag: {body.get('red_flag')}  ({body.get('red_flag_reason') or 'none'})")
    print(f"  Warnings: {len(drug_warnings)}")
    print(f"  FHIR entries: {len(fhir_bundle.get('entry', []))}")
    print()


if __name__ == "__main__":
    run_tests()
