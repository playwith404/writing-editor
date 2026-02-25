import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.session import Base

class Character(Base):
    __tablename__ = "characters"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # 어떤 시리즈에 속해있는지 연결 (외래키)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    
    name = Column(String(100), nullable=False)
    image_url = Column(String(500), nullable=True) # 프로필 이미지
    job = Column(String(100), nullable=True)       # 직업
    personality = Column(JSONB, default=[], server_default='[]') # 성격 태그 (JSON 배열)
    description = Column(Text, nullable=True)      # 상세 설명
    is_synced = Column(Boolean, default=True, server_default='true') # 집필실 동기화 여부
    
    # 시간 관리 및 휴지통
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # 관계 설정: 캐릭터에서 자기가 속한 프로젝트를 바로 조회할 수 있게 연결
    project = relationship("Project", back_populates="characters")