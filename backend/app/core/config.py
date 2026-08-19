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

    # Bhashini Configurations
    BHASHINI_USER_ID: str = os.getenv("BHASHINI_USER_ID", "")
    BHASHINI_API_KEY: str = os.getenv("BHASHINI_API_KEY", "")
    BHASHINI_PIPELINE_ID: str = os.getenv("BHASHINI_PIPELINE_ID", "64392f96daac500b55c543d6")
    BHASHINI_CONFIG_URL: str = os.getenv("BHASHINI_CONFIG_URL", "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline")

    class Config:
        env_file = ".env"
        extra = "ignore"
settings = Settings()