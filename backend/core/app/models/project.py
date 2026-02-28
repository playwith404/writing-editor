import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.session import Base

class Project(Base):
    __tablename__ = "projects"

    # UUID를 기본키로 사용 (서버에서 자동 생성)
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False) # 작성자(유저) ID
    title = Column(String(200), nullable=False)
    
    # 시간 관리 및 휴지통(Soft Delete) 기능
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # 관계 설정: 한 프로젝트가 삭제되면, 딸려있는 캐릭터들도 같이 지워지거나 참조할 수 있도록 연결
    user = relationship("User", back_populates="projects")
    characters = relationship("Character", back_populates="project", cascade="all, delete-orphan")
