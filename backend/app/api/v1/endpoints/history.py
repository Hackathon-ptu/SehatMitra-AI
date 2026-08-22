from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.models.history import ConsultationHistory, ReportHistory
from app.schemas.history import ConsultationHistoryResponse, ReportHistoryResponse

router = APIRouter()

@router.get("/consultations", response_model=list[ConsultationHistoryResponse])
def get_consultations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    consultations = (
        db.query(ConsultationHistory)
        .filter(ConsultationHistory.user_id == current_user.id)
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
