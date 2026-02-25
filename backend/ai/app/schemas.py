from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict

RuntimeMode = Literal["mock", "live"]


class HealthResponse(BaseModel):
    status: str
    service: str
    time: str
    mode: RuntimeMode


class ApiBlock(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: str
    text: str


class AskReference(BaseModel):
    model_config = ConfigDict(extra="forbid")
    episode_id: str
    title: str
    matched_text: str


class AutocompleteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    cursor_block_id: str


class AskRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    question: str
    current_episode_id: str


class SynonymsRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    selected_word: str
    block_id: str


class TransformStyleRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    block_id: Optional[str] = None
    target_block_id: Optional[str] = None
    style_tag: str


class AutocompleteData(BaseModel):
    model_config = ConfigDict(extra="forbid")
    generated_blocks: list[ApiBlock]


class AskData(BaseModel):
    model_config = ConfigDict(extra="forbid")
    answer: str
    references: list[AskReference]


class SynonymRecommendation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    word: str
    description: str


class SynonymsData(BaseModel):
    model_config = ConfigDict(extra="forbid")
    recommendations: list[SynonymRecommendation]


class TransformStyleData(BaseModel):
    model_config = ConfigDict(extra="forbid")
    transformed_blocks: list[ApiBlock]


class ApiSuccessResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    success: bool = True
    data: dict[str, Any]
