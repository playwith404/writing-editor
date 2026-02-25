from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime

# 1. 공통 속성 (생성과 응답에서 공통으로 쓰는 뼈대)
class CharacterBase(BaseModel):
    name: str = Field(..., max_length=100, description="캐릭터 이름")
    image_url: Optional[str] = Field(None, max_length=500, description="프로필 이미지 URL")
    job: Optional[str] = Field(None, max_length=100, description="직업")
    # 성격은 JSON 배열로 저장되므로 파이썬에서는 List[str]로 받습니다.
    personality: Optional[List[str]] = Field(default=[], description="성격 태그 배열")
    description: Optional[str] = Field(None, description="캐릭터 상세 설명")
    is_synced: Optional[bool] = Field(True, description="집필실 동기화 여부")

# 2. POST
class CharacterCreate(CharacterBase):
    pass # CharacterBase를 그대로 사용 (name은 필수, 나머지는 선택)

# 3. PATCH
class CharacterUpdate(BaseModel):
    # 수정할 때는 이름(name)을 포함해 모든 것이 선택적(Optional)이어야 합니다.
    name: Optional[str] = Field(None, max_length=100)
    image_url: Optional[str] = Field(None, max_length=500)
    job: Optional[str] = Field(None, max_length=100)
    personality: Optional[List[str]] = None
    description: Optional[str] = None
    is_synced: Optional[bool] = None

# Response
class CharacterResponse(CharacterBase):
    id: UUID
    project_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        # DB 모델(SQLAlchemy)을 Pydantic 모델로 부드럽게 변환하게 해주는 마법의 설정! (Pydantic v2 기준)
        from_attributes = True


# 5. POST, PATCH 등 단일 캐릭터 응답 포장지
class CharacterSingleResponse(BaseModel):
    success: bool = True
    message: str = "성공적으로 처리되었습니다."
    data: CharacterResponse

# 6. GET 목록 조회 응답 포장지
class CharacterListResponse(BaseModel):
    success: bool = True
    data: List[CharacterResponse]
    total_count: int