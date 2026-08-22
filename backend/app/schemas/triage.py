from pydantic import BaseModel
from typing import Dict, Any, List, Optional

class TriageRequest(BaseModel):
    symptoms_data: Dict[str, Any]
    patient_history: Optional[Dict[str, Any]] = None
    language: Optional[str] = "en"

class TriageResponse(BaseModel):
    risk_level: str
    primary_diagnosis: str
    reasons: List[str]
    remedies: List[str]
    red_flags: List[str]
    recommendation: str
    disclaimer: str
    doctor_reply: Optional[str] = ""
    doctor_message: Optional[str] = ""
    is_interview_complete: Optional[bool] = False
