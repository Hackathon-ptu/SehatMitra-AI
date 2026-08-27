from fastapi import APIRouter
from app.api.v1.endpoints import auth, health, chat, interview, risk, hospital, report, history, bhashini, analytics, triage, reports, tts

api_router = APIRouter()
api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(chat.router, prefix="/chat", tags=["General Chat"])
api_router.include_router(interview.router, prefix="/health-interview", tags=["Health Interview"])
api_router.include_router(risk.router, prefix="/risk", tags=["Risk Assessment"])
api_router.include_router(hospital.router, prefix="/hospital", tags=["Nearby Hospitals"])
api_router.include_router(report.router, prefix="/report", tags=["Medical Reports (Deprecated)"])
api_router.include_router(history.router, prefix="/history", tags=["Consultation & Report History"])
api_router.include_router(bhashini.router, prefix="/bhashini", tags=["Bhashini Translation API"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Community Surveillance Analytics"])
api_router.include_router(triage.router, prefix="/triage", tags=["Clinical Triage"])
api_router.include_router(reports.router, prefix="/reports", tags=["Lab Reports"])
api_router.include_router(tts.router, prefix="/tts", tags=["Neural TTS API"])