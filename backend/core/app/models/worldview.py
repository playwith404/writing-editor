# app/models/worldview.py

from sqlalchemy import Column, String, Text, Boolean, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
import uuid

from app.db.session import Base


# 1. 세계관 카드 (폴더 역할) — ERD: worldviews
class Worldview(Base):
    __tablename__ = "worldviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)

    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    type = Column(String(50), nullable=False)            # "TERM", "RELATION", "CUSTOM"
    is_synced = Column(Boolean, default=True, server_default="true", nullable=False)  # ✅ ERD 추가

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


# 2. 용어집 — ERD: worldview_terms (테이블명 수정, term 글자수 200으로 수정)
class WorldviewTerm(Base):
    __tablename__ = "worldview_terms"               # ✅ "terms" → "worldview_terms"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    worldview_id = Column(UUID(as_uuid=True), ForeignKey("worldviews.id", ondelete="CASCADE"), nullable=False)

    term = Column(String(200), nullable=False)       # ✅ String(100) → String(200)
    meaning = Column(Text, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# 3. 인물 관계 — ERD: worldview_relationships
class WorldviewRelationship(Base):
    __tablename__ = "worldview_relationships"       # ✅ "relationships" → "worldview_relationships"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    worldview_id = Column(UUID(as_uuid=True), ForeignKey("worldviews.id", ondelete="CASCADE"), nullable=False)

    base_character_id = Column(UUID(as_uuid=True), ForeignKey("characters.id", ondelete="CASCADE"), nullable=False)
    target_character_id = Column(UUID(as_uuid=True), ForeignKey("characters.id", ondelete="CASCADE"), nullable=False)

    relation_type = Column(String(50), nullable=True)   # ✅ String(100) → String(50), nullable=True
    color = Column(String(20), nullable=True)            # ✅ "line_color" → "color", nullable=True

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# 4. 커스텀 항목(에디터 본문) — ERD: worldview_entries (신규 추가)
class WorldviewEntry(Base):
    __tablename__ = "worldview_entries"             # ✅ 완전 누락 → 신규 추가

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    worldview_id = Column(UUID(as_uuid=True), ForeignKey("worldviews.id", ondelete="CASCADE"), nullable=False)

    title = Column(String(200), nullable=False)
    content = Column(JSONB, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)