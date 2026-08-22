from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import api_router
from app.db.base import Base
from app.db.session import engine

# 1. FastAPI app initialize karein
app = FastAPI(
    title="SehatMitra API",
    version="1.0.0",
    description="Backend API for SehatMitra Healthcare Platform"
)

# 2. CORS Middleware configure karein
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Startup event par automatically saare tables create karein
@app.on_event("startup")
def init_tables():
    try:
        from app.models.user import User
        from app.models.otp import EmailOTP
        from app.models.appointment import Appointment
        from app.models.interview import HealthInterviewSession
        from app.models.risk import RiskAssessment
        from app.models.report import MedicalReport
        from app.models.history import ConsultationHistory, ReportHistory
    except Exception as e:
        print(f"Error importing models: {e}")
        
    # 1. Base metadata tables create karein
    Base.metadata.create_all(bind=engine)

    # 2. Auto-healing database columns
    from sqlalchemy import text
    
    users_cols = [
        ("phone", "VARCHAR(255)"),
        ("username", "VARCHAR(255)"),
        ("patient_id", "VARCHAR(255)"),
        ("is_email_verified", "BOOLEAN DEFAULT 0"),
        ("is_profile_completed", "BOOLEAN DEFAULT 0"),
        ("age", "INTEGER"),
        ("gender", "VARCHAR(20)"),
        ("blood_group", "VARCHAR(10)"),
        ("village_town", "VARCHAR(100)"),
        ("district", "VARCHAR(100)"),
        ("state", "VARCHAR(100)"),
        ("pincode", "VARCHAR(20)"),
        ("emergency_contact_name", "VARCHAR(100)"),
        ("emergency_contact_phone", "VARCHAR(20)"),
        ("chronic_conditions", "TEXT"),
        ("allergies", "TEXT")
    ]
    
    otp_cols = [
        ("email", "VARCHAR(255)"),
        ("otp_code", "VARCHAR(6)"),
        ("expires_at", "DATETIME"),
        ("is_used", "BOOLEAN DEFAULT 0"),
        ("created_at", "DATETIME")
    ]

    with engine.connect() as conn:
        for col_name, col_type in users_cols:
            try:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type};"))
                conn.commit()
                print(f"[DB HEAL] Added column '{col_name}' to users table.")
            except Exception:
                pass
        
        for col_name, col_type in otp_cols:
            try:
                conn.execute(text(f"ALTER TABLE email_otps ADD COLUMN {col_name} {col_type};"))
                conn.commit()
                print(f"[DB HEAL] Added column '{col_name}' to email_otps table.")
            except Exception:
                pass

# 4. API Routes include karein
app.include_router(api_router, prefix="/api/v1")

import os
from fastapi.staticfiles import StaticFiles

dist_path = os.path.join(os.path.dirname(__file__), "dist")
if os.path.exists(dist_path):
    app.mount("/", StaticFiles(directory=dist_path, html=True), name="static")
else:
    @app.get("/")
    def root():
        return {"message": "SehatMitra API is running successfully"}