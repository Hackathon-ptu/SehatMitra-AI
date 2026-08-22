from pydantic import BaseModel
from typing import Optional, Dict, Any

class InterviewRequest(BaseModel):
    session_id: Optional[int] = None
    user_message: str
    language: str = "hi"
    language_code: Optional[str] = "hi-IN"
    language_name: Optional[str] = "Hindi"
    language_native_name: Optional[str] = "हिन्दी"

class InterviewResponse(BaseModel):
    session_id: int
    next_question: str
    is_completed: bool
    collected_symptoms: Dict[str, Any]
