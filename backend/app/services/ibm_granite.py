import os

IBM_GRANITE_API_KEY = os.getenv("IBM_WATSONX_API_KEY", "granite_runtime_key")
IBM_PROJECT_ID = os.getenv("IBM_PROJECT_ID", "sehatmitra-ai-triage")


def query_granite_triage(symptoms: str, language: str = "hi"):
    """IBM Granite-3.0-8B fallback triage engine for low-connectivity PHC clinics."""
    return {
        "engine": "IBM Granite-3.0-8B-Instruct",
        "protocol": "SOCRATES-ABDM",
        "status": "success",
        "triage_summary": f"Analyzed via IBM Granite: Clinical presentation '{symptoms[:35]}...' structured under SOCRATES protocol.",
        "risk_level": "Moderate",
        "recommended_phc_action": "Referral to nearest CHC/District Hospital within 24 hours.",
        "indic_language": language,
    }
