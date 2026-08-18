from pydantic import BaseModel
from typing import Dict, Any, List
from app.models.risk import RiskLevel

class RiskRequest(BaseModel):
    session_id: int
    symptoms_data: Dict[str, Any]

class RiskResponse(BaseModel):
    risk_level: RiskLevel
    reasons: List[str]
    recommendation: str
    disclaimer: str
