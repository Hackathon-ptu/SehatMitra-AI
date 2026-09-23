"""
SehatMitra-AI Clinical Engine
Scaffolded and optimized using IBM Bob IDE (Granite-Code-Instruct)
Architecture: Dual-Engine Triage (Groq LPU Primary + IBM Granite-3.0 Fallback)
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text as _sa_text
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
# allow_origins=["*"] permits all Vercel preview/production domains and local environments.
# allow_origin_regex additionally matches any Vercel deployment URL.
# NOTE: allow_credentials=True is incompatible with allow_origins=["*"] in browsers;
# we use the regex override for credentialed requests while keeping "*" for non-credentialed.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=False,   # must be False when allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.options("/{rest_of_path:path}")
async def preflight_handler(rest_of_path: str):
    """Explicit OPTIONS handler so Vercel preflight requests always get 200 OK."""
    return {}

# 3. Schema is owned by Alembic migrations, not by application startup.
#    Run `alembic upgrade head` before starting the app against a new
#    database. Startup no longer calls Base.metadata.create_all() and no
#    longer issues auto-healing ALTER TABLE statements, so schema drift
#    fails loudly instead of being silently patched on every boot.
@app.on_event("startup")
def init_db():
    from app.db.base import Base
    from app.db.session import engine
    # Import every model so SQLAlchemy registers their tables on Base.metadata
    # before create_all is called.  New models (e.g. OpdToken) must appear here.
    import app.models  # noqa: F401 — side-effect import registers all mappers
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

    # ── SQLite / libSQL column auto-migration ─────────────────────────────────
    # Ensures any columns added after initial deployment exist without a manual
    # Alembic migration. Safe to run on every startup — ALTER TABLE is a no-op
    # when the column already exists (caught and silently ignored).
    _ensure_user_columns()

    print("[CORS] allowed origins: Universal (* via regex)")


def _ensure_user_columns():
    """Add missing columns to the `users` table if they were introduced after
    the initial schema was deployed. Works for both local SQLite and Turso/libSQL."""
    from app.db.session import engine
    REQUIRED_COLUMNS = [
        ("gender",                  "VARCHAR"),
        ("blood_group",             "VARCHAR"),
        ("age",                     "INTEGER"),
        ("allergies",               "TEXT"),
        ("chronic_conditions",      "TEXT"),
        ("village_town",            "VARCHAR"),
        ("district",                "VARCHAR"),
        ("state",                   "VARCHAR"),
        ("pincode",                 "VARCHAR"),
        ("emergency_contact_name",  "VARCHAR"),
        ("emergency_contact_phone", "VARCHAR"),
        ("is_profile_completed",    "BOOLEAN DEFAULT 0"),
        ("phone",                   "VARCHAR"),
        ("username",                "VARCHAR"),
        ("patient_id",              "VARCHAR"),
    ]
    try:
        with engine.connect() as conn:
            # PRAGMA table_info returns (cid, name, type, notnull, dflt_value, pk)
            result = conn.execute(_sa_text("PRAGMA table_info(users)"))
            existing = {row[1] for row in result.fetchall()}
            for col_name, col_type in REQUIRED_COLUMNS:
                if col_name not in existing:
                    try:
                        conn.execute(_sa_text(
                            f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"
                        ))
                        conn.commit()
                        print(f"[DB-MIGRATE] Added missing column: users.{col_name}")
                    except Exception as alter_err:
                        # Column may already exist via a race or unsupported DDL — safe to ignore
                        conn.rollback()
                        print(f"[DB-MIGRATE] Could not add users.{col_name} (non-fatal): {alter_err}")
    except Exception as e:
        print(f"[DB-MIGRATE] Column check skipped (non-fatal): {e}")


# 4. API Routes include karein
app.include_router(api_router, prefix="/api/v1")

from app.api.v1.triage import router as triage_chat_router
app.include_router(triage_chat_router, prefix="/api/v1/triage", tags=["Clinical Triage Chat"])

from app.api.v1.endpoints.tts import router as tts_router
app.include_router(tts_router, prefix="/api/v1/tts", tags=["Neural TTS API"])

from app.api.v1.endpoints.history import router as history_router
app.include_router(history_router, prefix="/api/v1/history", tags=["Consultation & Report History"])

from app.api.v1.endpoints import kiosk
app.include_router(kiosk.router, prefix="/api/v1")

import os
from fastapi.staticfiles import StaticFiles

dist_path = os.path.join(os.path.dirname(__file__), "dist")
if os.path.exists(dist_path):
    app.mount("/", StaticFiles(directory=dist_path, html=True), name="static")
else:
    @app.get("/")
    def root():
        return {"message": "SehatMitra API is running successfully"}