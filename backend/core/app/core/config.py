from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "웹소설 집필 스튜디오 Core API"
    
    # 아까 docker-compose.yaml에 적었던 DB 정보입니다.
    POSTGRES_USER: str = "root"
    POSTGRES_PASSWORD: str = "password123!"
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: str = "5432"
    POSTGRES_DB: str = "gleey"

    @property
    def DATABASE_URL(self) -> str:
        # SQLAlchemy가 읽을 수 있는 DB 접속 주소 조합
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

settings = Settings()