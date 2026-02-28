from typing import Generator
from uuid import UUID
from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings
from app.core.security import decode_jwt_token
from app.models.user import User
from app.db.session import SessionLocal
from sqlalchemy.orm import Session

# API가 호출될 때 DB 세션을 열어주고, 끝나면 안전하게 닫아주는 함수
def get_db() -> Generator:
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()


bearer_scheme = HTTPBearer(auto_error=False)

@dataclass
class AuthContext:
    user: User
    token_payload: dict


def get_auth_context(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> AuthContext:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="인증 토큰이 필요합니다.")
    try:
        payload = decode_jwt_token(credentials.credentials, settings.JWT_SECRET)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다.")
    if payload.get("typ") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="잘못된 토큰 타입입니다.")

    sub = payload.get("sub")
    try:
        user_id = UUID(str(sub))
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="토큰 사용자 정보가 올바르지 않습니다.")

    user = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="사용자를 찾을 수 없습니다.")
    return AuthContext(user=user, token_payload=payload)


def get_current_user(context: AuthContext = Depends(get_auth_context)) -> User:
    return context.user
