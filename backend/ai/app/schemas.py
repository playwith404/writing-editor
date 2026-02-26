from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class HealthResponse(BaseModel):
    status: str
    service: str
    time: str


class ContextBlock(BaseModel):
    model_config = ConfigDict(extra="forbid")
    block_id: str
    text: str


class ContextBlockOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: str
    text: str


class AutocompleteContext(BaseModel):
    model_config = ConfigDict(extra="forbid")
    before_blocks: list[ContextBlock]
    cursor_block: ContextBlock
    after_blocks: list[ContextBlock]


class AutocompleteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    context: AutocompleteContext
    generate_count: int = 2


class AutocompleteData(BaseModel):
    model_config = ConfigDict(extra="forbid")
    generated_blocks: list[ContextBlockOutput]


class SynonymsContext(BaseModel):
    model_config = ConfigDict(extra="forbid")
    target_block: ContextBlock
    surrounding_blocks: list[ContextBlock]


class SynonymsRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    selected_word: str
    context: SynonymsContext
    recommend_count: int = 3


class SynonymRecommendation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    word: str
    description: str


class SynonymsData(BaseModel):
    model_config = ConfigDict(extra="forbid")
    recommendations: list[SynonymRecommendation]


class TransformTargetBlock(BaseModel):
    model_config = ConfigDict(extra="forbid")
    block_id: str
    text: str


class TransformStyleRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    target_block: TransformTargetBlock
    style_tag: str


class TransformStyleData(BaseModel):
    model_config = ConfigDict(extra="forbid")
    transformed_blocks: list[ContextBlockOutput]


class AskRetrievedContext(BaseModel):
    model_config = ConfigDict(extra="forbid")
    episode_id: str
    episode_title: str
    block_id: str
    text: str


class AskRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    question: str
    retrieved_contexts: list[AskRetrievedContext]


class AskReference(BaseModel):
    model_config = ConfigDict(extra="forbid")
    episode_id: str
    title: str
    matched_text: str


class AskData(BaseModel):
    model_config = ConfigDict(extra="forbid")
    answer: str
    references: list[AskReference]


class ApiSuccessResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    success: bool = True
    data: dict[str, Any]
