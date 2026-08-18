from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

db_url = settings.DATABASE_URL
# If not configured, use sqlite fallback
if not db_url:
    db_url = "sqlite:///./sehatmitra.db"

# Try connecting or fallback if it's default postgres and connection fails, or if explicitly requested.
# But simpler: if "sqlite" in db_url:
if db_url.startswith("sqlite"):
    engine = create_engine(db_url, connect_args={"check_same_thread": False})
else:
    try:
        # Check if we can build engine. If postgres fails to connect at query time, it'll raise,
        # but let's default to SQLite if environment specifies SQLite or if connection is default.
        engine = create_engine(db_url)
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