"""
ABDM FHIR R4 Bundle Builder
SehatMitra-AI · Charak-Kiosk (AIIA PS-26047)

Builds a minimal but standards-compliant FHIR R4 Bundle containing:
  - Patient resource  (with ABHA identifier if present)
  - Condition resource (ICD-11 primary diagnosis)
  - Condition resource (NAMASTE Ayush diagnosis)
  - Observation resource (Tridosha Vikriti vector)
  - MedicationStatement resources (past medications)
  - Composition resource (SOAP note)

No external HTTP calls — pure in-process construction.
Compatible with ABDM PHR sandbox ingestion schema.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _uuid() -> str:
    return str(uuid.uuid4())


def build_fhir_bundle(
    *,
    opd_token: str,
    patient_name: str,
    age: Optional[int],
    gender: Optional[str],
    abha_id: Optional[str],
    chief_complaint: str,
    icd11_code: str,
    icd11_label: str,
    namaste_code: str,
    namaste_label: str,
    vikriti: Dict[str, int],
    prakriti: Dict[str, int],
    past_medications: List[str],
    soap_note: str,
    herb_drug_alerts: List[Dict[str, Any]],
    red_flags: List[str],
    doctor_room: int,
    created_at: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Returns a FHIR R4 Bundle (type=document) as a plain Python dict.
    Caller may JSON-serialise it directly via json.dumps / FastAPI response.
    """

    bundle_id = _uuid()
    patient_id = _uuid()
    timestamp = created_at or _now_iso()
    composition_id = _uuid()

    # ── Patient ─────────────────────────────────────────────────────────────
    fhir_gender = {"male": "male", "female": "female"}.get((gender or "").lower(), "unknown")

    patient: Dict[str, Any] = {
        "resourceType": "Patient",
        "id": patient_id,
        "meta": {"profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/Patient"]},
        "name": [{"use": "official", "text": patient_name}],
        "gender": fhir_gender,
    }
    if age:
        # FHIR stores birthDate; we compute approximate year from age
        birth_year = datetime.now().year - age
        patient["birthDate"] = str(birth_year)
    if abha_id:
        patient["identifier"] = [
            {
                "use": "official",
                "type": {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/v2-0203",
                            "code": "MR",
                            "display": "ABHA Health ID",
                        }
                    ]
                },
                "system": "https://healthid.ndhm.gov.in",
                "value": abha_id,
            }
        ]

    # ── ICD-11 Condition ─────────────────────────────────────────────────────
    condition_icd: Dict[str, Any] = {
        "resourceType": "Condition",
        "id": _uuid(),
        "clinicalStatus": {
            "coding": [{"system": "http://terminology.hl7.org/CodeSystem/condition-clinical", "code": "active"}]
        },
        "verificationStatus": {
            "coding": [{"system": "http://terminology.hl7.org/CodeSystem/condition-ver-status", "code": "provisional"}]
        },
        "category": [
            {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/condition-category",
                        "code": "encounter-diagnosis",
                        "display": "Encounter Diagnosis",
                    }
                ]
            }
        ],
        "code": {
            "coding": [
                {
                    "system": "http://id.who.int/icd/release/11/mms",
                    "code": icd11_code,
                    "display": icd11_label,
                }
            ],
            "text": icd11_label,
        },
        "subject": {"reference": f"Patient/{patient_id}"},
        "recordedDate": timestamp,
        "note": [{"text": f"Chief Complaint: {chief_complaint}"}],
    }

    # ── NAMASTE Condition (Ayush) ─────────────────────────────────────────────
    condition_namaste: Dict[str, Any] = {
        "resourceType": "Condition",
        "id": _uuid(),
        "clinicalStatus": {
            "coding": [{"system": "http://terminology.hl7.org/CodeSystem/condition-clinical", "code": "active"}]
        },
        "verificationStatus": {
            "coding": [{"system": "http://terminology.hl7.org/CodeSystem/condition-ver-status", "code": "provisional"}]
        },
        "code": {
            "coding": [
                {
                    "system": "https://namaste.ayush.gov.in/CodeSystem/ayush-conditions",
                    "code": namaste_code,
                    "display": namaste_label,
                }
            ],
            "text": namaste_label,
        },
        "subject": {"reference": f"Patient/{patient_id}"},
        "recordedDate": timestamp,
    }

    # ── Vikriti Observation (Tridosha) ────────────────────────────────────────
    observation_vikriti: Dict[str, Any] = {
        "resourceType": "Observation",
        "id": _uuid(),
        "status": "final",
        "code": {
            "coding": [
                {
                    "system": "https://namaste.ayush.gov.in/CodeSystem/tridosha",
                    "code": "TRIDOSHA-VIKRITI",
                    "display": "Tridosha Vikriti Vector",
                }
            ]
        },
        "subject": {"reference": f"Patient/{patient_id}"},
        "effectiveDateTime": timestamp,
        "component": [
            {
                "code": {"text": "Vata (%)"},
                "valueQuantity": {"value": vikriti.get("vata", 33), "unit": "%"},
            },
            {
                "code": {"text": "Pitta (%)"},
                "valueQuantity": {"value": vikriti.get("pitta", 34), "unit": "%"},
            },
            {
                "code": {"text": "Kapha (%)"},
                "valueQuantity": {"value": vikriti.get("kapha", 33), "unit": "%"},
            },
        ],
        "note": [
            {"text": f"Prakriti baseline — Vata:{prakriti.get('vata',33)}% Pitta:{prakriti.get('pitta',34)}% Kapha:{prakriti.get('kapha',33)}%"}
        ],
    }

    # ── MedicationStatement resources ─────────────────────────────────────────
    med_statements: List[Dict[str, Any]] = [
        {
            "resourceType": "MedicationStatement",
            "id": _uuid(),
            "status": "active",
            "medicationCodeableConcept": {"text": med},
            "subject": {"reference": f"Patient/{patient_id}"},
            "note": [{"text": "Self-reported at kiosk intake"}],
        }
        for med in past_medications
    ]

    # ── Red-flag extensions ────────────────────────────────────────────────────
    flag_notes = "; ".join(red_flags) if red_flags else "No red flags identified"
    herb_alert_notes = (
        "; ".join(f"{a['herb']} + {a['drug']}: {a['risk']} [{a['severity']}]" for a in herb_drug_alerts)
        if herb_drug_alerts
        else "No herb-drug interactions detected"
    )

    # ── Composition (SOAP wrapper) ────────────────────────────────────────────
    composition: Dict[str, Any] = {
        "resourceType": "Composition",
        "id": composition_id,
        "meta": {"profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/OPConsultRecord"]},
        "status": "preliminary",
        "type": {
            "coding": [
                {
                    "system": "http://snomed.info/sct",
                    "code": "371530004",
                    "display": "Clinical consultation report",
                }
            ]
        },
        "subject": {"reference": f"Patient/{patient_id}"},
        "date": timestamp,
        "author": [{"display": f"Charak-Kiosk AI Engine · Room {doctor_room} · Token {opd_token}"}],
        "title": f"OPD Intake Record — {opd_token}",
        "section": [
            {
                "title": "Clinical Assessment",
                "text": {"status": "generated", "div": f"<div>{soap_note}</div>"},
            },
            {
                "title": "Red Flags",
                "text": {"status": "generated", "div": f"<div>{flag_notes}</div>"},
            },
            {
                "title": "Herb-Drug Safety Alerts (NFI + API)",
                "text": {"status": "generated", "div": f"<div>{herb_alert_notes}</div>"},
            },
        ],
    }

    # ── Bundle Assembly ────────────────────────────────────────────────────────
    entries: List[Dict[str, Any]] = [
        {"fullUrl": f"urn:uuid:{patient_id}", "resource": patient},
        {"fullUrl": f"urn:uuid:{composition['id']}", "resource": composition},
        {"fullUrl": f"urn:uuid:{condition_icd['id']}", "resource": condition_icd},
        {"fullUrl": f"urn:uuid:{condition_namaste['id']}", "resource": condition_namaste},
        {"fullUrl": f"urn:uuid:{observation_vikriti['id']}", "resource": observation_vikriti},
    ]
    for stmt in med_statements:
        entries.append({"fullUrl": f"urn:uuid:{stmt['id']}", "resource": stmt})

    return {
        "resourceType": "Bundle",
        "id": bundle_id,
        "meta": {
            "profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle"],
            "tag": [
                {"system": "http://terminology.hl7.org/CodeSystem/v3-ActReason", "code": "HTEST"},
                {"system": "https://sehatmitra.ai/tags", "code": "charak-kiosk"},
            ],
        },
        "identifier": {
            "system": "https://sehatmitra.ai/opd-tokens",
            "value": opd_token,
        },
        "type": "document",
        "timestamp": timestamp,
        "entry": entries,
    }


# ── FhirR4BundleBuilder ───────────────────────────────────────────────────────

class FhirR4BundleBuilder:
    """
    Object-oriented FHIR R4 Bundle builder for ABDM-compliant documents.

    Produces a ``Bundle`` (type=document) containing the mandatory resources
    for a Charak-Kiosk OPD intake record:

    * ``Composition``  — document wrapper (LOINC 34133-9: Summarisation of episode)
    * ``Condition``    — WHO ICD-11 primary diagnosis
    * ``Condition``    — NAMASTE Ayush morbidity code
    * ``Observation``  — Agni and Koshtha clinical markers

    Usage::

        builder = FhirR4BundleBuilder()
        bundle  = builder.build_abdm_bundle(
            patient_id="pt-001",
            patient_name="Ramesh Kumar",
            icd11_code="MD90.0",
            icd11_title="Gastro-oesophageal reflux disease",
            namaste_code="AYU-GI-04",
            namaste_title="Amlapitta",
            agni_type="Mandagni",
            koshtha_type="Krura",
            chief_complaint="acid reflux",
        )
    """

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def build_abdm_bundle(
        self,
        *,
        patient_id: str,
        patient_name: str,
        icd11_code: str,
        icd11_title: str,
        namaste_code: str,
        namaste_title: str,
        agni_type: str,
        koshtha_type: str,
        chief_complaint: str,
        abha_id: Optional[str] = None,
        age: Optional[int] = None,
        gender: Optional[str] = None,
        opd_token: Optional[str] = None,
        created_at: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Build and return a FHIR R4 Bundle as a plain Python ``dict``.

        The ``dict`` is directly JSON-serialisable via ``json.dumps`` or
        FastAPI's ``JSONResponse``.

        Parameters
        ----------
        patient_id:
            Caller-supplied stable patient identifier (e.g. DB primary key).
        patient_name:
            Display name for the Patient resource.
        icd11_code / icd11_title:
            WHO ICD-11 code and display label for the primary Condition.
        namaste_code / namaste_title:
            NAMASTE Ayush morbidity code and label for the secondary Condition.
        agni_type:
            Digestive-fire classification string (from ``AyushOntologyEngine``).
        koshtha_type:
            Bowel-type classification string (from ``AyushOntologyEngine``).
        chief_complaint:
            Free-text primary complaint as narrated by the patient.
        abha_id:
            Optional ABHA Health ID for the Patient identifier block.
        age / gender:
            Optional demographic fields; gender normalised to FHIR vocabulary.
        opd_token:
            Optional OPD queue token used as the Bundle identifier value.
        created_at:
            Optional ISO-8601 timestamp; defaults to current UTC time.
        """
        timestamp = created_at or _now_iso()
        bundle_id = _uuid()
        composition_id = _uuid()
        condition_icd_id = _uuid()
        condition_namaste_id = _uuid()
        observation_id = _uuid()

        patient_resource = self._build_patient(
            patient_id=patient_id,
            patient_name=patient_name,
            age=age,
            gender=gender,
            abha_id=abha_id,
        )

        composition = self._build_composition(
            composition_id=composition_id,
            patient_id=patient_id,
            condition_icd_id=condition_icd_id,
            condition_namaste_id=condition_namaste_id,
            observation_id=observation_id,
            timestamp=timestamp,
            opd_token=opd_token or bundle_id,
            chief_complaint=chief_complaint,
        )

        condition_icd = self._build_condition_icd11(
            resource_id=condition_icd_id,
            patient_id=patient_id,
            icd11_code=icd11_code,
            icd11_title=icd11_title,
            chief_complaint=chief_complaint,
            timestamp=timestamp,
        )

        condition_namaste = self._build_condition_namaste(
            resource_id=condition_namaste_id,
            patient_id=patient_id,
            namaste_code=namaste_code,
            namaste_title=namaste_title,
            timestamp=timestamp,
        )

        observation_agni_koshtha = self._build_observation_agni_koshtha(
            resource_id=observation_id,
            patient_id=patient_id,
            agni_type=agni_type,
            koshtha_type=koshtha_type,
            timestamp=timestamp,
        )

        entries: List[Dict[str, Any]] = [
            {"fullUrl": f"urn:uuid:{patient_id}", "resource": patient_resource},
            {"fullUrl": f"urn:uuid:{composition_id}", "resource": composition},
            {"fullUrl": f"urn:uuid:{condition_icd_id}", "resource": condition_icd},
            {"fullUrl": f"urn:uuid:{condition_namaste_id}", "resource": condition_namaste},
            {"fullUrl": f"urn:uuid:{observation_id}", "resource": observation_agni_koshtha},
        ]

        return {
            "resourceType": "Bundle",
            "id": bundle_id,
            "meta": {
                "profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle"],
                "tag": [
                    {"system": "http://terminology.hl7.org/CodeSystem/v3-ActReason", "code": "HTEST"},
                    {"system": "https://sehatmitra.ai/tags", "code": "charak-kiosk"},
                ],
            },
            "identifier": {
                "system": "https://sehatmitra.ai/opd-tokens",
                "value": opd_token or bundle_id,
            },
            "type": "document",
            "timestamp": timestamp,
            "entry": entries,
        }

    # ------------------------------------------------------------------
    # Private resource builders
    # ------------------------------------------------------------------

    @staticmethod
    def _build_patient(
        *,
        patient_id: str,
        patient_name: str,
        age: Optional[int],
        gender: Optional[str],
        abha_id: Optional[str],
    ) -> Dict[str, Any]:
        fhir_gender = {"male": "male", "female": "female"}.get(
            (gender or "").lower(), "unknown"
        )
        resource: Dict[str, Any] = {
            "resourceType": "Patient",
            "id": patient_id,
            "meta": {
                "profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/Patient"]
            },
            "name": [{"use": "official", "text": patient_name}],
            "gender": fhir_gender,
        }
        if age:
            birth_year = datetime.now().year - age
            resource["birthDate"] = str(birth_year)
        if abha_id:
            resource["identifier"] = [
                {
                    "use": "official",
                    "type": {
                        "coding": [
                            {
                                "system": "http://terminology.hl7.org/CodeSystem/v2-0203",
                                "code": "MR",
                                "display": "ABHA Health ID",
                            }
                        ]
                    },
                    "system": "https://healthid.ndhm.gov.in",
                    "value": abha_id,
                }
            ]
        return resource

    @staticmethod
    def _build_composition(
        *,
        composition_id: str,
        patient_id: str,
        condition_icd_id: str,
        condition_namaste_id: str,
        observation_id: str,
        timestamp: str,
        opd_token: str,
        chief_complaint: str,
    ) -> Dict[str, Any]:
        """Composition resource — LOINC 34133-9 (Summarisation of episode note)."""
        return {
            "resourceType": "Composition",
            "id": composition_id,
            "meta": {
                "profile": [
                    "https://nrces.in/ndhm/fhir/r4/StructureDefinition/OPConsultRecord"
                ]
            },
            "status": "preliminary",
            "type": {
                "coding": [
                    {
                        "system": "http://loinc.org",
                        "code": "34133-9",
                        "display": "Summarisation of episode note",
                    }
                ]
            },
            "subject": {"reference": f"Patient/{patient_id}"},
            "date": timestamp,
            "author": [{"display": "Charak-Kiosk AI Engine · SehatMitra-AI"}],
            "title": f"ABDM OPD Intake Record — Token {opd_token}",
            "section": [
                {
                    "title": "Chief Complaint",
                    "text": {
                        "status": "generated",
                        "div": f"<div xmlns='http://www.w3.org/1999/xhtml'>{chief_complaint}</div>",
                    },
                    "entry": [{"reference": f"Condition/{condition_icd_id}"}],
                },
                {
                    "title": "Ayush Morbidity (NAMASTE)",
                    "text": {
                        "status": "generated",
                        "div": (
                            "<div xmlns='http://www.w3.org/1999/xhtml'>"
                            "NAMASTE Ayush morbidity classification.</div>"
                        ),
                    },
                    "entry": [{"reference": f"Condition/{condition_namaste_id}"}],
                },
                {
                    "title": "Agni and Koshtha Assessment",
                    "text": {
                        "status": "generated",
                        "div": (
                            "<div xmlns='http://www.w3.org/1999/xhtml'>"
                            "Ayurvedic functional markers — Agni and Koshtha.</div>"
                        ),
                    },
                    "entry": [{"reference": f"Observation/{observation_id}"}],
                },
            ],
        }

    @staticmethod
    def _build_condition_icd11(
        *,
        resource_id: str,
        patient_id: str,
        icd11_code: str,
        icd11_title: str,
        chief_complaint: str,
        timestamp: str,
    ) -> Dict[str, Any]:
        """Condition resource coded with WHO ICD-11 MMS."""
        return {
            "resourceType": "Condition",
            "id": resource_id,
            "clinicalStatus": {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                        "code": "active",
                    }
                ]
            },
            "verificationStatus": {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/condition-ver-status",
                        "code": "provisional",
                    }
                ]
            },
            "category": [
                {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/condition-category",
                            "code": "encounter-diagnosis",
                            "display": "Encounter Diagnosis",
                        }
                    ]
                }
            ],
            "code": {
                "coding": [
                    {
                        "system": "http://id.who.int/icd/release/11/mms",
                        "code": icd11_code,
                        "display": icd11_title,
                    }
                ],
                "text": icd11_title,
            },
            "subject": {"reference": f"Patient/{patient_id}"},
            "recordedDate": timestamp,
            "note": [{"text": f"Chief complaint: {chief_complaint}"}],
        }

    @staticmethod
    def _build_condition_namaste(
        *,
        resource_id: str,
        patient_id: str,
        namaste_code: str,
        namaste_title: str,
        timestamp: str,
    ) -> Dict[str, Any]:
        """Condition resource coded with NAMASTE Ayush morbidity taxonomy."""
        return {
            "resourceType": "Condition",
            "id": resource_id,
            "clinicalStatus": {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                        "code": "active",
                    }
                ]
            },
            "verificationStatus": {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/condition-ver-status",
                        "code": "provisional",
                    }
                ]
            },
            "category": [
                {
                    "coding": [
                        {
                            "system": "https://namaste.ayush.gov.in/CodeSystem/category",
                            "code": "ayush-diagnosis",
                            "display": "Ayush Diagnosis",
                        }
                    ]
                }
            ],
            "code": {
                "coding": [
                    {
                        "system": "https://namaste.ayush.gov.in/CodeSystem/ayush-conditions",
                        "code": namaste_code,
                        "display": namaste_title,
                    }
                ],
                "text": namaste_title,
            },
            "subject": {"reference": f"Patient/{patient_id}"},
            "recordedDate": timestamp,
        }

    @staticmethod
    def _build_observation_agni_koshtha(
        *,
        resource_id: str,
        patient_id: str,
        agni_type: str,
        koshtha_type: str,
        timestamp: str,
    ) -> Dict[str, Any]:
        """
        Observation resource capturing Ayurvedic functional markers.

        Two components are recorded:
        * Agni  — digestive-fire classification (NAMASTE code AGNI-CLASS)
        * Koshtha — bowel-type classification  (NAMASTE code KOSHTHA-CLASS)
        """
        return {
            "resourceType": "Observation",
            "id": resource_id,
            "status": "final",
            "category": [
                {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                            "code": "exam",
                            "display": "Exam",
                        }
                    ]
                }
            ],
            "code": {
                "coding": [
                    {
                        "system": "https://namaste.ayush.gov.in/CodeSystem/functional-markers",
                        "code": "AGNI-KOSHTHA-PANEL",
                        "display": "Ayurvedic Agni-Koshtha Assessment Panel",
                    }
                ],
                "text": "Agni and Koshtha Markers",
            },
            "subject": {"reference": f"Patient/{patient_id}"},
            "effectiveDateTime": timestamp,
            "component": [
                {
                    "code": {
                        "coding": [
                            {
                                "system": "https://namaste.ayush.gov.in/CodeSystem/functional-markers",
                                "code": "AGNI-CLASS",
                                "display": "Agni Classification",
                            }
                        ]
                    },
                    "valueCodeableConcept": {
                        "coding": [
                            {
                                "system": "https://namaste.ayush.gov.in/CodeSystem/agni-types",
                                "code": agni_type,
                                "display": agni_type,
                            }
                        ],
                        "text": agni_type,
                    },
                },
                {
                    "code": {
                        "coding": [
                            {
                                "system": "https://namaste.ayush.gov.in/CodeSystem/functional-markers",
                                "code": "KOSHTHA-CLASS",
                                "display": "Koshtha Classification",
                            }
                        ]
                    },
                    "valueCodeableConcept": {
                        "coding": [
                            {
                                "system": "https://namaste.ayush.gov.in/CodeSystem/koshtha-types",
                                "code": koshtha_type,
                                "display": koshtha_type,
                            }
                        ],
                        "text": koshtha_type,
                    },
                },
            ],
        }
