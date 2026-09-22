"""
Herb–Drug Interaction Safety Engine
SehatMitra-AI · Charak-Kiosk (AIIA PS-26047)

Cross-checks allopathic prescriptions against patient-reported Ayurvedic
herb / formulation intake using a curated safety knowledge graph derived
from:
  - WHO Collaborating Centre for Drug Statistics (DDD index)
  - National Formulary of India (NFI) Ayurvedic section
  - Published pharmacokinetic interaction studies (PubMed / Cochrane)
  - CDSCO cautionary advisories

No external HTTP calls — pure in-process evaluation.
"""

from __future__ import annotations

from typing import Dict, List, Optional, Tuple

from pydantic import BaseModel, Field


# ── Output model ──────────────────────────────────────────────────────────────

class InteractionWarning(BaseModel):
    """Single identified herb–drug interaction event."""

    allopathic_drug: str = Field(..., description="Generic name of the allopathic drug.")
    ayurvedic_herb: str = Field(..., description="Ayurvedic herb or classical formulation name.")
    severity: str = Field(
        ...,
        description="Severity tier: SEVERE | MODERATE | MILD.",
    )
    mechanism: str = Field(..., description="Pharmacokinetic or pharmacodynamic mechanism.")
    clinical_advisory: str = Field(
        ..., description="Plain-language guidance for the clinician."
    )


# ── Safety knowledge graph ────────────────────────────────────────────────────

# Schema per edge:
#   (allopathic_drug_lower, herb_lower) ->
#       (severity, mechanism, clinical_advisory)
_KGEdge = Tuple[str, str, str]

# Keys are stored as lowercase for case-insensitive lookup
_SAFETY_KNOWLEDGE_GRAPH_RAW: List[Tuple[str, str, _KGEdge]] = [
    # ── Hypoglycemia cluster ──────────────────────────────────────────────
    (
        "metformin", "haridra",
        (
            "MODERATE",
            "Curcumin in Haridra potentiates insulin sensitisation via AMPK pathway, "
            "increasing risk of additive hypoglycaemia.",
            "Monitor blood glucose closely. Advise patient to report dizziness, "
            "sweating, or palpitations. Dose adjustment of Metformin may be required.",
        ),
    ),
    (
        "metformin", "arogyavardhini vati",
        (
            "MODERATE",
            "Arogyavardhini Vati contains Kutki (Picrorhiza kurroa) and Guggulu which "
            "can independently lower blood glucose, compounding Metformin's action.",
            "Assess combined hypoglycaemic burden before concurrent use. Educate patient "
            "on hypoglycaemia symptoms. Consider reducing Metformin dose under physician review.",
        ),
    ),
    (
        "metformin", "karela",
        (
            "MODERATE",
            "Bitter melon (Momordica charantia / Karela) contains polypeptide-p and "
            "charantin with insulin-mimetic activity; additive glucose lowering with Metformin.",
            "Avoid concurrent high-dose Karela supplementation while on Metformin. "
            "If used, increase frequency of blood glucose self-monitoring.",
        ),
    ),
    (
        "glimepiride", "haridra",
        (
            "MODERATE",
            "Sulphonylurea-class insulin secretagogue combined with curcumin-mediated "
            "insulin sensitisation — dual mechanism increases hypoglycaemia probability.",
            "Monitor fasting and post-prandial glucose. Patients on Glimepiride should "
            "avoid therapeutic doses of Haridra without medical supervision.",
        ),
    ),
    (
        "glimepiride", "karela",
        (
            "MODERATE",
            "Karela plant compounds (charantin, vicine) lower blood glucose via "
            "mechanisms independent of sulphonylurea action — additive hypoglycaemia risk.",
            "Use with caution. Educate patient; advise against using Karela juice "
            "as a home remedy while taking Glimepiride.",
        ),
    ),
    # ── Anticoagulant / antiplatelet + haemostasis-altering herbs ────────
    (
        "warfarin", "guggulu",
        (
            "SEVERE",
            "Guggulsterones in Guggulu induce CYP2C9, the primary enzyme responsible "
            "for S-warfarin metabolism, leading to reduced warfarin plasma levels and "
            "subtherapeutic INR — rebound thrombosis risk.",
            "CONTRAINDICATED as concurrent therapy. INR must be monitored intensively if "
            "Guggulu is started or stopped. Consider therapeutic substitution of Guggulu.",
        ),
    ),
    (
        "warfarin", "lasuna",
        (
            "SEVERE",
            "Garlic (Allium sativum / Lasuna) has antiplatelet and mild anticoagulant "
            "properties via ajoene-mediated platelet inhibition, significantly potentiating "
            "warfarin-induced bleeding risk.",
            "Avoid concurrent use of therapeutic Lasuna formulations with Warfarin. "
            "If patient insists, INR must be checked every 3–5 days. Report any unusual "
            "bruising or bleeding immediately.",
        ),
    ),
    (
        "warfarin", "shilajit",
        (
            "SEVERE",
            "Shilajit contains fulvic acid and trace minerals that may alter platelet "
            "aggregation and potentiate anticoagulation; exact mechanism incompletely "
            "characterised — precautionary SEVERE classification.",
            "Avoid concurrent use. Counsel patient to disclose all Shilajit use to prescriber. "
            "INR should be monitored if inadvertent co-administration occurs.",
        ),
    ),
    (
        "aspirin", "guggulu",
        (
            "MODERATE",
            "CYP2C9 induction by guggulsterones may reduce salicylate exposure. "
            "Additionally, both agents have antiplatelet activity — combined bleeding risk.",
            "Use caution; avoid high-dose Guggulu supplementation alongside therapeutic Aspirin. "
            "Monitor for signs of gastrointestinal bleeding.",
        ),
    ),
    (
        "aspirin", "lasuna",
        (
            "MODERATE",
            "Dual antiplatelet mechanism — ajoene (Lasuna) + COX-1 inhibition (Aspirin) — "
            "increases bleeding time.",
            "Avoid combined therapeutic doses. Culinary use of garlic is generally acceptable. "
            "Patients should report unusual bruising.",
        ),
    ),
    # ── Cardiac glycoside + potassium-depleting herbs ─────────────────────
    (
        "digoxin", "yashtimadhu",
        (
            "SEVERE",
            "Glycyrrhizin in Yashtimadhu (Glycyrrhiza glabra / Licorice) causes "
            "pseudo-hyperaldosteronism — sodium retention, potassium wasting. "
            "Hypokalaemia dramatically increases Digoxin toxicity and arrhythmia risk.",
            "CONTRAINDICATED. Do not use Yashtimadhu / Licorice-containing formulations "
            "concurrently with Digoxin. Ensure potassium ≥ 3.5 mEq/L before each Digoxin dose. "
            "If inadvertent exposure, ECG monitoring is mandatory.",
        ),
    ),
    (
        "digoxin", "licorice",
        (
            "SEVERE",
            "Glycyrrhizin-induced hypokalaemia sensitises myocardial cells to Digoxin, "
            "narrowing the therapeutic window and precipitating ventricular arrhythmias.",
            "CONTRAINDICATED — same advisory as Yashtimadhu. Serum electrolytes and ECG "
            "monitoring mandatory if concurrent use is discovered post-hoc.",
        ),
    ),
    # ── Statin + CYP3A4-modulating herbs ─────────────────────────────────
    (
        "atorvastatin", "guggulu",
        (
            "MODERATE",
            "Guggulsterones are ligands for the pregnane X receptor (PXR) and activate "
            "CYP3A4 transcription. Atorvastatin is a CYP3A4 substrate — induction "
            "accelerates its clearance, potentially reducing statin efficacy and lipid control.",
            "Monitor LDL-C and total cholesterol at 4–6 weeks if Guggulu is added to "
            "Atorvastatin therapy. Dose adjustment of Atorvastatin may be warranted. "
            "Prefer Shallaki (Boswellia) as an alternative anti-inflammatory if available.",
        ),
    ),
]

# Build the runtime lookup dict: (drug_lower, herb_lower) -> KGEdge
SAFETY_KNOWLEDGE_GRAPH: Dict[Tuple[str, str], _KGEdge] = {
    (drug.lower(), herb.lower()): edge
    for drug, herb, edge in _SAFETY_KNOWLEDGE_GRAPH_RAW
}


# ── Engine ────────────────────────────────────────────────────────────────────

class HerbDrugSafetyEngine:
    """
    Stateless herb–drug interaction evaluator.

    Uses a curated SAFETY_KNOWLEDGE_GRAPH to detect clinically significant
    interactions between allopathic drugs and Ayurvedic herbs / formulations.
    """

    @staticmethod
    def evaluate_interactions(
        allopathic_drugs: List[str],
        herbal_inputs: List[str],
    ) -> List[InteractionWarning]:
        """
        Cross-reference all drug–herb pairs against the knowledge graph.

        Parameters
        ----------
        allopathic_drugs:
            List of generic allopathic drug names (case-insensitive).
            E.g. ``["Metformin", "Warfarin"]``.
        herbal_inputs:
            List of Ayurvedic herb or formulation names (case-insensitive).
            E.g. ``["Haridra", "Guggulu"]``.

        Returns
        -------
        List[InteractionWarning]
            All detected interactions, ordered SEVERE → MODERATE → MILD.
        """
        warnings: List[InteractionWarning] = []
        severity_order = {"SEVERE": 0, "MODERATE": 1, "MILD": 2}

        for drug in allopathic_drugs:
            # Normalise: strip dosage/form suffixes (e.g. "Metformin 500mg" → "metformin")
            drug_key = drug.lower().strip().split()[0]
            for herb in herbal_inputs:
                key = (drug_key, herb.lower().strip())
                edge = SAFETY_KNOWLEDGE_GRAPH.get(key)
                if edge is not None:
                    severity, mechanism, advisory = edge
                    warnings.append(
                        InteractionWarning(
                            allopathic_drug=drug,
                            ayurvedic_herb=herb,
                            severity=severity,
                            mechanism=mechanism,
                            clinical_advisory=advisory,
                        )
                    )

        # Sort by severity (SEVERE first)
        warnings.sort(key=lambda w: severity_order.get(w.severity, 99))
        return warnings
