from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.v1.deps import get_current_user, get_current_user_optional
from app.models.user import User
from app.models.history import ConsultationHistory, ReportHistory
from app.schemas.history import ConsultationHistoryResponse, ReportHistoryResponse, ConsultationHistoryCreate
from typing import Optional

router = APIRouter()

@router.post("/consultations/save", response_model=ConsultationHistoryResponse)
def save_consultation(
    request: ConsultationHistoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        history_entry = ConsultationHistory(
            user_id=current_user.id,
            session_id=request.session_id,
            language=request.language,
            conversation_history=request.conversation_history,
            risk_level=request.risk_level,
            reasons=request.reasons,
            recommendation=request.recommendation
        )
        db.add(history_entry)
        db.commit()
        db.refresh(history_entry)
        return history_entry
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save consultation history: {str(e)}"
        )

@router.get("/consultations", response_model=list[ConsultationHistoryResponse])
def get_consultations(
    user_email: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    target_user_id = None
    if user_email:
        user = db.query(User).filter(User.email == user_email).first()
        if user:
            target_user_id = user.id
    elif current_user:
        target_user_id = current_user.id

    if not target_user_id:
        return []

    consultations = (
        db.query(ConsultationHistory)
        .filter(ConsultationHistory.user_id == target_user_id)
        .order_by(ConsultationHistory.created_at.desc())
        .all()
    )
    return consultations

@router.get("/reports", response_model=list[ReportHistoryResponse])
def get_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    reports = (
        db.query(ReportHistory)
        .filter(ReportHistory.user_id == current_user.id)
        .order_by(ReportHistory.created_at.desc())
        .all()
    )
    return reports
