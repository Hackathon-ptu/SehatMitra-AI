import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from typing import Optional

load_dotenv()

class Settings:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "SehatMitra")
    DATABASE_URL: str = os.getenv("DATABASE_URL") or "sqlite:///./sehatmitra.db"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "default-secret-key")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

    # Gemini API Key (.env se automatically load hogi)
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY")

    class Config:
        env_file = ".env"
        extra = "ignore"
settings = Settings()