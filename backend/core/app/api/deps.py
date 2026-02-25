from typing import Generator
from app.db.session import SessionLocal

# API가 호출될 때 DB 세션을 열어주고, 끝나면 안전하게 닫아주는 함수
def get_db() -> Generator:
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()