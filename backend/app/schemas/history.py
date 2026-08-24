from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Any, Optional, Union

class ConsultationHistoryResponse(BaseModel):
    id: int
    user_id: int
    session_id: Optional[int] = None
    language: str
    conversation_history: Optional[list[Any]] = None
    risk_level: Optional[str] = None
    reasons: Optional[list[str]] = None
    recommendation: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ReportHistoryResponse(BaseModel):
    id: int
    user_id: int
    filename: str
    extracted_data: Optional[Union[dict[str, Any], list[Any]]] = None
    explanation: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
