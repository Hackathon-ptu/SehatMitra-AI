from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.interview import InterviewRequest, InterviewResponse
from app.services.ai_service import AIService
from app.models.interview import HealthInterviewSession

router = APIRouter()

@router.post("/", response_model=InterviewResponse)
async def interview(request: InterviewRequest, db: Session = Depends(get_db)):
    session_rec = None
    if request.session_id and request.session_id != 0:
        session_rec = db.query(HealthInterviewSession).filter(HealthInterviewSession.id == request.session_id).first()
    
    if not session_rec:
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
        language=request.language,
        existing_collected_data=session_rec.collected_data
    )

    from sqlalchemy.orm.attributes import flag_modified

    history = list(session_rec.conversation_history or [])
    history.append({"sender": "user", "text": request.user_message})
    history.append({"sender": "ai", "text": ai_response["next_question"]})
    session_rec.conversation_history = history
    flag_modified(session_rec, "conversation_history")

    collected_data = dict(session_rec.collected_data or {})
    collected_data.update(ai_response["collected_symptoms"])
    session_rec.collected_data = collected_data
    flag_modified(session_rec, "collected_data")

    db.commit()
    db.refresh(session_rec)

    return {
        "session_id": session_rec.id,
        "next_question": ai_response["next_question"],
        "is_completed": ai_response["is_completed"],
        "collected_symptoms": session_rec.collected_data
    }
