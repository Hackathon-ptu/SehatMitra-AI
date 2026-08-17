from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.interview import InterviewRequest, InterviewResponse
from app.services.ai_service import AIService
from app.models.interview import HealthInterviewSession

router = APIRouter()

@router.post("/", response_model=InterviewResponse)
async def interview(request: InterviewRequest, db: Session = Depends(get_db)):
    if request.session_id:
        session_rec = db.query(HealthInterviewSession).filter(HealthInterviewSession.id == request.session_id).first()
        if not session_rec:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Health interview session not found"
            )
    else:
        session_rec = HealthInterviewSession(
            language=request.language,
            conversation_history=[],
            collected_data={}
        )
        db.add(session_rec)
        db.commit()
        db.refresh(session_rec)

    ai_response = await AIService.process_health_interview(
        session_id=session_rec.id,
        user_message=request.user_message,
        language=request.language
    )

    history = session_rec.conversation_history or []
    history.append({"sender": "user", "text": request.user_message})
    history.append({"sender": "ai", "text": ai_response["next_question"]})
    session_rec.conversation_history = history

    collected_data = session_rec.collected_data or {}
    collected_data.update(ai_response["collected_symptoms"])
    session_rec.collected_data = collected_data

    db.commit()
    db.refresh(session_rec)

    return {
        "session_id": session_rec.id,
        "next_question": ai_response["next_question"],
        "is_completed": ai_response["is_completed"],
        "collected_symptoms": session_rec.collected_data
    }
