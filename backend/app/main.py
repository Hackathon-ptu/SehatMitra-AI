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

# 2. CORS Middleware configure karein (Universal CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://.*",
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
def log_database_target():
    print(f"[DB] APP_ENV={settings.APP_ENV} engine={describe_engine()}")
    print("[CORS] allowed origins: Universal (* via regex)")


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