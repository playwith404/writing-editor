# app/schemas/ai.py

from pydantic import BaseModel, Field
from typing import List, Optional, Any
from uuid import UUID


# ==============================
# 1. 단어 찾기 (Synonyms)
# ==============================
class SynonymRequest(BaseModel):
    selected_word: str = Field(..., description="작가가 선택한 단어")
    block_id: str = Field(..., description="현재 단어가 포함된 블록 ID")


class SynonymInfo(BaseModel):
    word: str
    description: str


class SynonymResponseData(BaseModel):
    recommendations: List[SynonymInfo]


class SynonymResponse(BaseModel):
    success: bool = True
    data: SynonymResponseData


# ==============================
# 2. 이어쓰기 (Autocomplete)
# ==============================
class AutocompleteRequest(BaseModel):
    cursor_block_id: str = Field(..., description="현재 커서가 위치한 블록 ID")


class AutocompleteBlock(BaseModel):
    type: str = "paragraph"
    text: str


class AutocompleteResponseData(BaseModel):
    generated_blocks: List[AutocompleteBlock]


class AutocompleteResponse(BaseModel):
    success: bool = True
    data: AutocompleteResponseData


# ==============================
# 3. 문체 변환 (Transform Style)
# ==============================
class StyleTransformRequest(BaseModel):
    block_id: str = Field(..., description="변환할 블록 ID")
    style_tag: str = Field(..., description="변환할 문체 스타일 (예: 동양풍)")


class StyleTransformResponseData(BaseModel):
    transformed_blocks: List[AutocompleteBlock]


class StyleTransformResponse(BaseModel):
    success: bool = True
    data: StyleTransformResponseData


# ==============================
# 4. 설정 Q&A (Ask)
# ==============================
class AskRequest(BaseModel):
    question: str = Field(..., description="사용자 질문")
    current_episode_id: Optional[UUID] = Field(None, description="현재 집필 중인 회차 ID")


class ReferenceInfo(BaseModel):
    episode_id: UUID
    title: str
    matched_text: str


class AskResponseData(BaseModel):
    answer: str
    references: List[ReferenceInfo]


class AskResponse(BaseModel):
    success: bool = True
    data: AskResponseData
