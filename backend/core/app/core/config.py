import os
from urllib.parse import quote_plus

from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Local dev convenience; in containers env vars will already be present.
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    PROJECT_NAME: str = "웹소설 집필 스튜디오 Core API"
    AI_SERVICE_URL: str = "http://127.0.0.1:8000"

    # If true, core will return error details for easier debugging (dev only).
    CORE_DEBUG: bool = False

    # Preferred DB env vars (repo-root .env.example)
    DB_HOST: str | None = None
    DB_PORT: str | None = None
    DB_USER: str | None = None
    DB_PASSWORD: str | None = None
    DB_NAME: str | None = None
    
    # Legacy POSTGRES_* env vars (kept for compatibility)
    POSTGRES_USER: str = "root"
    POSTGRES_PASSWORD: str = "password123!"
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: str = "5432"
    POSTGRES_DB: str = "gleey"

    @property
    def DATABASE_URL(self) -> str:
        # 1) Explicit full override (recommended for production if you have it)
        url = os.getenv("DATABASE_URL")
        if url:
            return url

        # 2) Use DB_* if provided (matches repo-root .env.example)
        if self.DB_HOST and self.DB_USER and self.DB_PASSWORD and self.DB_NAME:
            host = self.DB_HOST
            port = self.DB_PORT or "5432"
            user = quote_plus(self.DB_USER)
            password = quote_plus(self.DB_PASSWORD)
            db = quote_plus(self.DB_NAME)
            return f"postgresql://{user}:{password}@{host}:{port}/{db}"

        # 3) Fallback to POSTGRES_* defaults
        user = quote_plus(self.POSTGRES_USER)
        password = quote_plus(self.POSTGRES_PASSWORD)
        db = quote_plus(self.POSTGRES_DB)
        return f"postgresql://{user}:{password}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{db}"

settings = Settings()
