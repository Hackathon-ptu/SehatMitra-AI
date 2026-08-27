from pydantic import BaseModel
from typing import Dict, Any, Union, List

class ReportResponse(BaseModel):
    filename: str
    extracted_data: Union[Dict[str, Any], List[Any]]
    explanation: str
    status: str

class ReportAnalysisRequest(BaseModel):
    language: str = "en"
