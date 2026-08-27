from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.triage import TriageRequest, TriageResponse
from app.services.triage_service import TriageService

router = APIRouter()

@router.post("/chat", response_model=TriageResponse)
async def perform_dual_triage(request: TriageRequest):
    try:
        triage_result = await TriageService.perform_dual_ai_triage(request)
        return triage_result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Triage processing error: {str(e)}"
        )
