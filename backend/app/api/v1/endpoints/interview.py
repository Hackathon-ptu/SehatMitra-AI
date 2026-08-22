from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
import jwt
from typing import Optional
from app.core.config import settings
from app.db.session import get_db
from app.schemas.interview import InterviewRequest, InterviewResponse
from app.services.ai_service import AIService
from app.models.interview import HealthInterviewSession
from app.models.user import User

router = APIRouter()

def get_optional_user(request: Request, db: Session) -> Optional[User]:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        sub = payload.get("sub")
        if not sub:
            return None
        if "@" in sub:
            return db.query(User).filter(User.email == sub).first()
        else:
            try:
                user_id = int(sub)
                return db.query(User).filter(User.id == user_id).first()
            except ValueError:
                return db.query(User).filter(User.email == sub).first()
    except Exception:
        return None

@router.post("/", response_model=InterviewResponse)
async def interview(
    request: InterviewRequest,
    fastapi_req: Request,
    db: Session = Depends(get_db)
):
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

    patient_history = None
    current_user = get_optional_user(fastapi_req, db)
    if current_user:
        patient_history = {
            "age": current_user.age,
            "gender": current_user.gender,
            "chronic_conditions": current_user.chronic_conditions or [],
            "allergies": current_user.allergies or []
        }

    ai_response = await AIService.process_health_interview(
        session_id=session_rec.id,
        user_message=request.user_message,
        language=request.language,
        existing_collected_data=session_rec.collected_data,
        language_code=request.language_code,
        language_name=request.language_name,
        language_native_name=request.language_native_name,
        patient_history=patient_history
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
