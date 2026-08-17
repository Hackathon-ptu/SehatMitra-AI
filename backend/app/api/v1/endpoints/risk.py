from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.risk import RiskRequest, RiskResponse
from app.services.ai_service import AIService
from app.models.risk import RiskAssessment, RiskLevel
from app.models.interview import HealthInterviewSession

router = APIRouter()

@router.post("/", response_model=RiskResponse)
async def evaluate_risk(request: RiskRequest, db: Session = Depends(get_db)):
    session_rec = db.query(HealthInterviewSession).filter(HealthInterviewSession.id == request.session_id).first()
    if not session_rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session ID not found"
        )
        
    ai_risk = await AIService.evaluate_risk(
        session_id=request.session_id,
        symptoms_data=request.symptoms_data
    )
    
    assessment = RiskAssessment(
        session_id=request.session_id,
        risk_level=RiskLevel(ai_risk["risk_level"]),
        reasons=ai_risk["reasons"],
        recommendation=ai_risk["recommendation"],
        disclaimer=ai_risk["disclaimer"]
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    
    return {
        "risk_level": assessment.risk_level,
        "reasons": assessment.reasons,
        "recommendation": assessment.recommendation,
        "disclaimer": assessment.disclaimer
    }
