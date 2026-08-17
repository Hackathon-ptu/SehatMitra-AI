from fastapi import APIRouter
from app.api.v1.endpoints import auth, health, chat, interview, risk, hospital, report

api_router = APIRouter()
api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(chat.router, prefix="/chat", tags=["General Chat"])
api_router.include_router(interview.router, prefix="/health-interview", tags=["Health Interview"])
api_router.include_router(risk.router, prefix="/risk", tags=["Risk Assessment"])
api_router.include_router(hospital.router, prefix="/hospital", tags=["Nearby Hospitals"])
api_router.include_router(report.router, prefix="/report", tags=["Medical Reports"])