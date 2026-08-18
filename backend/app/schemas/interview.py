from pydantic import BaseModel
from typing import Optional, Dict, Any

class InterviewRequest(BaseModel):
    session_id: Optional[int] = None
    user_message: str
    language: str = "hi"

class InterviewResponse(BaseModel):
    session_id: int
    next_question: str
    is_completed: bool
    collected_symptoms: Dict[str, Any]
