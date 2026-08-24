import os
from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from typing import Optional

# backend/.env, resolved absolutely so config works no matter which
# directory the process was started from (app, alembic, tests, Docker).
ENV_FILE = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(ENV_FILE)

class Settings(BaseSettings):
    PROJECT_NAME: str = "SehatMitra"

    # Runtime environment: "development" | "staging" | "production"
    APP_ENV: str = "development"

    # Local SQLite (development only)
    DATABASE_URL: str = "sqlite:///./sehatmitra.db"

    # Turso Cloud / libSQL (staging & production)
    # TURSO_AUTH_TOKEN is a secret: keep it in .env or the Render dashboard only.
    TURSO_DATABASE_URL: str = ""
    TURSO_AUTH_TOKEN: str = ""
    SECRET_KEY: str = "default-secret-key"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # SMTP Configurations
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAILS_FROM_NAME: str = "SehatMitra-AI"

    # Groq & Gemini API Configurations
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "openai/gpt-oss-120b"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.6-flash"

    # Bhashini Configurations
    BHASHINI_USER_ID: str = ""
    BHASHINI_API_KEY: str = ""
    BHASHINI_PIPELINE_ID: str = "64392f96daac500b55c543d6"
    BHASHINI_CONFIG_URL: str = "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline"

    class Config:
        env_file = str(ENV_FILE)
        extra = "ignore"
settings = Settings()