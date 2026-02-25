from pydantic import BaseModel, ConfigDict
from datetime import datetime
from uuid import UUID
from typing import List, Optional

# --- Request (요청) ---
class ProjectCreate(BaseModel):
    title: str

# --- Core Data (알맹이) ---
class ProjectResponse(BaseModel):
    id: UUID
    title: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# 명세서에 맞춘 껍데기(Wrapper) 스키마 추가
# ==========================================

# 1. POST (생성) 전용 응답 포장지
class ProjectSingleResponse(BaseModel):
    success: bool = True
    message: str = "성공적으로 처리되었습니다."
    data: ProjectResponse # 위에서 만든 알맹이가 여기에 쏙 들어갑니다.

# 2. GET (목록 조회) 전용 응답 포장지
class ProjectListResponse(BaseModel):
    success: bool = True
    data: List[ProjectResponse] # 알맹이들의 배열(리스트)
    total_count: int            # 총 개수