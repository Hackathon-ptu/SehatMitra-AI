from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

db_url = settings.DATABASE_URL
# If not configured, use sqlite fallback
if not db_url:
    db_url = "sqlite:///./sehatmitra.db"

# Apply connection options dynamically
engine_kwargs = {}
if db_url.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs.update({
        "pool_size": 10,
        "max_overflow": 20,
        "pool_pre_ping": True
    })

try:
    engine = create_engine(db_url, **engine_kwargs)
except Exception:
    db_url = "sqlite:///./sehatmitra.db"
    engine = create_engine(db_url, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Dependency injection for endpoints
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()