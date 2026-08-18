from pydantic import BaseModel
from typing import Dict, Any

class ReportResponse(BaseModel):
    filename: str
    extracted_data: Dict[str, Any]
    explanation: str
    status: str
