# app/schemas/episode.py

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Any
from uuid import UUID
from datetime import datetime


# ==============================
# 1. 회차 생성 (POST)
# ==============================
class EpisodeCreate(BaseModel):
    title: str = Field(..., max_length=200, description="예: 1장. 나의 삶")
    order_index: int = Field(..., description="회차 순서 (1, 2, 3...)")


# ==============================
# 2. 회차 수정 (PATCH) — 자동 저장 포함
# ==============================
class EpisodeUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    content: Optional[Any] = Field(None, description="에디터 본문 블록 배열")
    status: Optional[str] = Field(None, description="TODO / DOING / DONE")
    char_count: Optional[int] = None
    char_count_no_space: Optional[int] = None
    order_index: Optional[int] = None


# ==============================
# 3. 회차 응답 — 목록용 (본문 제외)
# ==============================
class EpisodeListItem(BaseModel):
    id: UUID
    project_id: UUID
    title: str
    order_index: int
    status: str
    char_count: int
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# ==============================
# 4. 회차 응답 — 단건 상세 (본문 포함)
# ==============================
class EpisodeDetailResponse(BaseModel):
    id: UUID
    project_id: UUID
    title: str
    order_index: int
    status: str
    char_count: int
    char_count_no_space: int
    content: Optional[Any] = None    # JSONB 블록 배열
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# ==============================
# 5. 응답 포장지 (Wrapper)
# ==============================
class EpisodeSingleResponse(BaseModel):
    success: bool = True
    message: str = "성공적으로 처리되었습니다."
    data: EpisodeDetailResponse


class EpisodeListResponse(BaseModel):
    success: bool = True
    data: List[EpisodeListItem]


class EpisodeSaveResponse(BaseModel):
    """자동 저장 전용 응답 (content 제외)"""
    success: bool = True
    message: str = "자동 저장 완료"
    updated_at: Optional[datetime] = None
