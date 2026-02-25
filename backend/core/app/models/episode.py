# app/models/episode.py

import uuid
from sqlalchemy import Column, String, Text, Integer, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func

from app.db.session import Base

try:
    from pgvector.sqlalchemy import Vector
    VECTOR_AVAILABLE = True
except ImportError:
    VECTOR_AVAILABLE = False


# 1. 회차(에피소드) — ERD: episodes
class Episode(Base):
    __tablename__ = "episodes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)

    title = Column(String(200), nullable=False)                             # 예: 1장. 나의 삶
    content = Column(JSONB, nullable=True)                                  # 에디터 본문 (블록 배열)
    char_count = Column(Integer, default=0, server_default="0")            # 총 글자 수 (공백 포함)
    char_count_no_space = Column(Integer, default=0, server_default="0")    # 공백 제외 글자 수
    status = Column(String(20), default="TODO", server_default="TODO", nullable=False)  # TODO/DOING/DONE
    order_index = Column(Integer, nullable=False)                            # 회차 순서 (1장, 2장...)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


# 2. AI 임베딩 — ERD: episode_embeddings
class EpisodeEmbedding(Base):
    __tablename__ = "episode_embeddings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    episode_id = Column(UUID(as_uuid=True), ForeignKey("episodes.id", ondelete="CASCADE"), nullable=False)

    block_id = Column(String(100), nullable=False)   # 에디터 본문의 특정 블록 ID
    chunk_text = Column(Text, nullable=False)

    # pgvector가 설치된 경우에만 Vector 타입 사용, 아니면 Text로 fallback
    if VECTOR_AVAILABLE:
        embedding = Column(Vector(1536), nullable=True)
    else:
        embedding = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
