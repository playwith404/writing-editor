# app/schemas/worldview.py

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Any
from uuid import UUID
from datetime import datetime


# ==============================
# 1. 세계관 카드 (Worldview)
# ==============================
class WorldviewCreate(BaseModel):
    name: str = Field(..., max_length=100, description="세계관 카드 이름")
    description: Optional[str] = Field(None, description="설명")
    type: str = Field(..., max_length=50, description="타입 (TERM, RELATION, CUSTOM)")
    is_synced: Optional[bool] = Field(True, description="집필실 동기화 여부")  # ✅ 누락 필드 추가


class WorldviewResponse(WorldviewCreate):
    id: UUID
    project_id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class WorldviewSingleResponse(BaseModel):
    success: bool = True
    data: WorldviewResponse


class WorldviewListResponse(BaseModel):
    success: bool = True
    data: List[WorldviewResponse]


# ==============================
# 2. 용어 (WorldviewTerm) — ERD: worldview_terms
# ==============================
class TermCreate(BaseModel):
    term: str = Field(..., max_length=200, description="용어 이름")  # ✅ 200자 제한
    meaning: str = Field(..., description="용어의 뜻")


class TermResponse(TermCreate):
    id: UUID
    worldview_id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class TermSingleResponse(BaseModel):
    success: bool = True
    data: TermResponse


class TermListResponse(BaseModel):
    success: bool = True
    data: List[TermResponse]


# ==============================
# 3. 인물 관계 (WorldviewRelationship) — ERD: worldview_relationships
# ==============================
class RelationshipCreate(BaseModel):
    base_character_id: UUID
    target_character_id: UUID
    relation_type: Optional[str] = Field(None, max_length=50, description="예: 라이벌, 조력자, 가족")  # ✅ 50자 제한, Optional
    color: Optional[str] = Field(None, max_length=20, description="관계선 색상 (예: #E0F7FA)")  # ✅ line_color → color


class RelationshipResponse(RelationshipCreate):
    id: UUID
    worldview_id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class RelationshipSingleResponse(BaseModel):
    success: bool = True
    data: RelationshipResponse


# 6.2 하단: 특정 인물 중심 관계성 응답용
class CharacterSimple(BaseModel):
    id: UUID
    name: str
    job: Optional[str] = None
    image_url: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class ConnectionInfo(BaseModel):
    id: UUID
    target_character_id: UUID
    target_character_name: str
    image_url: Optional[str] = None
    relation_type: Optional[str] = None
    color: Optional[str] = None


class RelationshipDetail(BaseModel):
    base_character: CharacterSimple
    connections: List[ConnectionInfo]


class RelationshipDetailResponse(BaseModel):
    success: bool = True
    data: RelationshipDetail


# ==============================
# 4. 커스텀 항목 (WorldviewEntry) — ERD: worldview_entries (신규 추가)
# ==============================
class EntryCreate(BaseModel):
    title: str = Field(..., max_length=200, description="항목 제목")
    content: Optional[Any] = Field(None, description="상세 설정 내용 (JSON)")  # ✅ JSONB 대응


class EntryResponse(EntryCreate):
    id: UUID
    worldview_id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class EntrySingleResponse(BaseModel):
    success: bool = True
    data: EntryResponse


class EntryListResponse(BaseModel):
    success: bool = True
    data: List[EntryResponse]