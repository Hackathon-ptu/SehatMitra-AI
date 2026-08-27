from pydantic import BaseModel
from typing import Dict, Any, List, Optional

class ChatMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str

class TriageRequest(BaseModel):
    message: str
    language: str = "en"
    history: Optional[List[ChatMessage]] = None

class TriageResponse(BaseModel):
    clinical_summary: str
    risk_level: str  # 'Low', 'Medium', 'High', 'Emergency'
    doctor_checklist: List[str]
    recommended_specialist: str
    disclaimer: str
    engine_used: str  # 'groq' | 'gemini_fallback'
    message: Optional[str] = ""
    has_symptoms: Optional[bool] = False
    reply: Optional[str] = ""
    is_clinical_triage: Optional[bool] = False
    reasons: Optional[List[str]] = None
    recommendation: Optional[str] = ""
    interview_status: Optional[str] = "in_progress"
    current_step: Optional[int] = 1
    total_steps: Optional[int] = 6
    collected_points: Optional[List[str]] = None
    is_interview_complete: Optional[bool] = False

# Legacy schemas for backward compatibility with the old /triage/ endpoint
class LegacyTriageRequest(BaseModel):
    symptoms_data: Dict[str, Any]
    patient_history: Optional[Dict[str, Any]] = None
    language: Optional[str] = "en"

class LegacyTriageResponse(BaseModel):
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
