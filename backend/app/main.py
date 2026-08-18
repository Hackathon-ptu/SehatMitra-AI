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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Startup event par automatically saare tables create karein
@app.on_event("startup")
def init_tables():
    try:
        # Agar models package exist karta hai toh load karein
        import app.models
    except Exception:
        pass
    # Base metadata se registered tables SQLite/PostgreSQL me ban jayenge
    Base.metadata.create_all(bind=engine)

# 4. API Routes include karein
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
def root():
    return {"message": "SehatMitra API is running successfully"}