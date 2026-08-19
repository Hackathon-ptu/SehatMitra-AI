from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.risk import RiskRequest, RiskResponse
from app.services.ai_service import AIService
from app.models.risk import RiskAssessment, RiskLevel
from app.models.interview import HealthInterviewSession
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.models.history import ConsultationHistory
from typing import Optional

router = APIRouter()

@router.post("/", response_model=RiskResponse)
async def evaluate_risk(
    request: RiskRequest, 
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
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
    
    # Save consultation to history if authenticated
    if current_user:
        history_rec = ConsultationHistory(
            user_id=current_user.id,
            session_id=session_rec.id,
            language=session_rec.language or "hi",
            conversation_history=session_rec.conversation_history,
            risk_level=assessment.risk_level,
            reasons=assessment.reasons,
            recommendation=assessment.recommendation
        )
        db.add(history_rec)
        db.commit()
        db.refresh(history_rec)
    
    return {
        "risk_level": assessment.risk_level,
        "reasons": assessment.reasons,
        "recommendation": assessment.recommendation,
        "disclaimer": assessment.disclaimer
    }
