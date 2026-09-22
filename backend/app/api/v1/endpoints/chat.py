from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session import get_db
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.ai_service import AIService
from app.models.interview import HealthInterviewSession
from app.models.history import ConsultationHistory
from app.models.user import User
from app.api.v1.deps import get_optional_current_user

router = APIRouter()


@router.post("/", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    response_data = await AIService.generate_chat_reply(
        message=request.message,
        language=request.language,
        session_id=request.session_id,
    )

    # Persist the exchange to HealthInterviewSession when a session_id is provided
    if request.session_id:
        session_rec = (
            db.query(HealthInterviewSession)
            .filter(HealthInterviewSession.id == request.session_id)
            .first()
        )
        if session_rec:
            history = session_rec.conversation_history or []
            history.append({"sender": "user", "text": request.message})
            history.append({"sender": "ai", "text": response_data["reply"]})
            session_rec.conversation_history = history
            db.commit()
            db.refresh(session_rec)
            response_data["session_id"] = session_rec.id

    # ── Authenticated users: save to ConsultationHistory ────────────────────
    saved_to_history = False
    if current_user is not None:
        try:
            convo = [
                {"sender": "user", "text": request.message},
                {"sender": "ai", "text": response_data["reply"]},
            ]
            history_entry = ConsultationHistory(
                user_id=current_user.id,
                session_id=response_data.get("session_id"),
                language=request.language,
                conversation_history=convo,
            )
            db.add(history_entry)
            db.commit()
            db.refresh(history_entry)
            saved_to_history = True
        except Exception as db_err:
            db.rollback()
            print(f"[chat endpoint] Failed to save consultation history: {db_err}")

    response_data["saved_to_history"] = saved_to_history
    return response_data
