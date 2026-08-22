from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.triage import TriageRequest, TriageResponse
from app.services.triage_service import TriageService
from app.api.v1.deps import get_current_user_optional
from app.models.user import User
from typing import Optional

router = APIRouter()

@router.post("/", response_model=TriageResponse)
async def perform_triage(
    request: TriageRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    patient_history = request.patient_history
    if not patient_history and current_user:
        patient_history = {
            "age": current_user.age,
            "gender": current_user.gender,
            "chronic_conditions": current_user.chronic_conditions or [],
            "allergies": current_user.allergies or []
        }
        
    triage_result = await TriageService.perform_triage(
        symptoms_data=request.symptoms_data,
        patient_history=patient_history,
        language=request.language or "en"
    )
    return triage_result
