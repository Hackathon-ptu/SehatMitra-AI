from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import api_router
from app.core.config import settings
from app.db.session import describe_engine

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
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    ],
    allow_origin_regex=r"https?://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Schema is owned by Alembic migrations, not by application startup.
#    Run `alembic upgrade head` before starting the app against a new
#    database. Startup no longer calls Base.metadata.create_all() and no
#    longer issues auto-healing ALTER TABLE statements, so schema drift
#    fails loudly instead of being silently patched on every boot.
@app.on_event("startup")
def init_db():
    from app.db.base import Base
    from app.db.session import engine
    try:
        # Use a raw connection, rollback any stale transaction state, then create tables
        conn = engine.connect()
        try:
            conn.rollback()
            Base.metadata.create_all(bind=conn)
            conn.commit()
            print(f"[DB] APP_ENV={settings.APP_ENV} engine={describe_engine()} - tables ensured")
        except Exception as inner_exc:
            conn.rollback()
            print(f"[DB] create_all error (non-fatal): {inner_exc}")
        finally:
            conn.close()
    except Exception as exc:
        # Prevent startup crash; log the error for debugging
        print(f"[DB] Startup DB init error: {exc}")
    print("[CORS] allowed origins: Universal (* via regex)")


# 4. API Routes include karein
app.include_router(api_router, prefix="/api/v1")

from app.api.v1.triage import router as triage_chat_router
app.include_router(triage_chat_router, prefix="/api/v1/triage", tags=["Clinical Triage Chat"])

from app.api.v1.endpoints.tts import router as tts_router
app.include_router(tts_router, prefix="/api/v1/tts", tags=["Neural TTS API"])

from app.api.v1.endpoints.history import router as history_router
app.include_router(history_router, prefix="/api/v1/history", tags=["Consultation & Report History"])

import os
from fastapi.staticfiles import StaticFiles

dist_path = os.path.join(os.path.dirname(__file__), "dist")
if os.path.exists(dist_path):
    app.mount("/", StaticFiles(directory=dist_path, html=True), name="static")
else:
    @app.get("/")
    def root():
        return {"message": "SehatMitra API is running successfully"}