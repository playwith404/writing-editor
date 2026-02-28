from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "웹소설 집필 스튜디오 Core API"
    AI_SERVICE_URL: str = "http://127.0.0.1:8000"
    
    # 아까 docker-compose.yaml에 적었던 DB 정보입니다.
    POSTGRES_USER: str = "root"
    POSTGRES_PASSWORD: str = "password123!"
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: str = "5432"
    POSTGRES_DB: str = "gleey"
    JWT_SECRET: str = "replace_me"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 14
    GOOGLE_CLIENT_ID: str | None = None
    GOOGLE_CLIENT_SECRET: str | None = None
    GOOGLE_REDIRECT_URI: str | None = None
    APP_BASE_URL: str = "http://localhost:3100"
    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_SECURE: bool = False
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_FROM: str | None = None
    EMAIL_VERIFICATION_ENABLED: bool = False

    @property
    def DATABASE_URL(self) -> str:
        # SQLAlchemy가 읽을 수 있는 DB 접속 주소 조합
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

settings = Settings()
