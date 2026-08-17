from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.ai_service import AIService
from app.models.interview import HealthInterviewSession

router = APIRouter()

@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    response_data = await AIService.generate_chat_reply(
        message=request.message,
        language=request.language,
        session_id=request.session_id
    )
    
    if request.session_id:
        session_rec = db.query(HealthInterviewSession).filter(HealthInterviewSession.id == request.session_id).first()
        if session_rec:
            history = session_rec.conversation_history or []
            history.append({"sender": "user", "text": request.message})
            history.append({"sender": "ai", "text": response_data["reply"]})
            session_rec.conversation_history = history
            db.commit()
            db.refresh(session_rec)
            response_data["session_id"] = session_rec.id
            
    return response_data
