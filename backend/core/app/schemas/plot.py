# app/schemas/plot.py

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Any
from uuid import UUID
from datetime import datetime


# ==============================
# 연결된 캐릭터/회차 간략 정보
# ==============================
class LinkedCharacter(BaseModel):
    id: UUID
    name: str
    model_config = ConfigDict(from_attributes=True)


class LinkedEpisode(BaseModel):
    id: UUID
    title: str
    model_config = ConfigDict(from_attributes=True)


# ==============================
# 1. 플롯 생성 (POST)
# ==============================
class PlotCreate(BaseModel):
    plot_number: int = Field(..., description="플롯 번호 (1, 2, 3...)")
    title: str = Field(..., max_length=200, description="플롯 제목")
    description: Optional[str] = Field(None, description="플롯 설명")
    character_ids: Optional[List[UUID]] = Field(default=[], description="연결할 캐릭터 ID 목록")
    episode_ids: Optional[List[UUID]] = Field(default=[], description="연결할 회차 ID 목록")


# ==============================
# 2. 플롯 수정 (PATCH)
# ==============================
class PlotUpdate(BaseModel):
    plot_number: Optional[int] = None
    title: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    character_ids: Optional[List[UUID]] = None
    episode_ids: Optional[List[UUID]] = None


# ==============================
# 3. 플롯 응답 (Response)
# ==============================
class PlotResponse(BaseModel):
    id: UUID
    project_id: UUID
    plot_number: int
    title: str
    description: Optional[str] = None
    is_synced: bool
    # 연결된 캐릭터/회차 목록은 API에서 직접 조립
    linked_characters: List[LinkedCharacter] = []
    linked_episodes: List[LinkedEpisode] = []
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class PlotSingleResponse(BaseModel):
    success: bool = True
    message: str = "성공적으로 처리되었습니다."
    data: PlotResponse


class PlotListResponse(BaseModel):
    success: bool = True
    data: List[PlotResponse]
