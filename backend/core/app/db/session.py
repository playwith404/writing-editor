from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# DB 엔진 생성 (파이썬과 DB를 연결하는 핵심)
engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)

# DB에 쿼리를 날릴 때 사용할 세션 공장
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 앞으로 만들 모든 DB 모델(테이블)들의 부모 클래스
Base = declarative_base()