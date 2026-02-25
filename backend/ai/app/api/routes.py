from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException

from app.prompts import (
    ASK_SYSTEM_PROMPT,
    AUTOCOMPLETE_SYSTEM_PROMPT,
    SYNONYMS_SYSTEM_PROMPT,
    TRANSFORM_STYLE_SYSTEM_PROMPT,
)
from app.schemas import (
    ApiSuccessResponse,
    AskData,
    AskRequest,
    AutocompleteData,
    AutocompleteRequest,
    HealthResponse,
    SynonymsData,
    SynonymsRequest,
    TransformStyleData,
    TransformStyleRequest,
)
from app.services.ai_runner import run_data_feature
from app.services.mock_responses import (
    build_mock_ask_data,
    build_mock_autocomplete_data,
    build_mock_synonyms_data,
    build_mock_transform_style_data,
)
from app.services.providers import get_runtime_mode

router = APIRouter()


def _validation_error(message: str, request_id: str) -> HTTPException:
    return HTTPException(
        status_code=400,
        detail={
            "code": "AI_VALIDATION_ERROR",
            "message": message,
            "request_id": request_id,
        },
    )


def _required_text(value: Optional[str], field_name: str, request_id: str) -> str:
    normalized = (value or "").strip()
    if not normalized:
        raise _validation_error(f"`{field_name}` is required.", request_id)
    return normalized


def _resolve_transform_block_id(req: TransformStyleRequest, request_id: str) -> str:
    block_id = (req.block_id or "").strip()
    target_block_id = (req.target_block_id or "").strip()

    if block_id and target_block_id and block_id != target_block_id:
        raise _validation_error(
            "`block_id` and `target_block_id` are both provided but do not match.",
            request_id,
        )
    if block_id:
        return block_id
    if target_block_id:
        return target_block_id
    raise _validation_error("`block_id` or `target_block_id` is required.", request_id)


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service="ai-service",
        time=datetime.now(timezone.utc).isoformat(),
        mode=get_runtime_mode(),
    )


@router.post("/api/episodes/{episodeId}/ai/autocomplete", response_model=ApiSuccessResponse)
async def autocomplete(episodeId: str, req: AutocompleteRequest) -> ApiSuccessResponse:
    request_id = str(uuid4())
    episode_id = _required_text(episodeId, "episodeId", request_id)
    cursor_block_id = _required_text(req.cursor_block_id, "cursor_block_id", request_id)

    data = await run_data_feature(
        request_id=request_id,
        feature="autocomplete",
        system_prompt=AUTOCOMPLETE_SYSTEM_PROMPT,
        user_prompt=(
            "Create 1-2 continuation blocks for a web novel editor.\n"
            f"- episode_id: {episode_id}\n"
            f"- cursor_block_id: {cursor_block_id}\n"
            'Return JSON schema: {"generated_blocks":[{"type":"paragraph","text":"..."}]}'
        ),
        schema=AutocompleteData,
        mock_builder=lambda: build_mock_autocomplete_data(
            episode_id=episode_id,
            cursor_block_id=cursor_block_id,
        ),
        temperature=0.7,
    )
    return ApiSuccessResponse(success=True, data=data.model_dump())


@router.post("/api/projects/{projectId}/ai/ask", response_model=ApiSuccessResponse)
async def ask(projectId: str, req: AskRequest) -> ApiSuccessResponse:
    request_id = str(uuid4())
    project_id = _required_text(projectId, "projectId", request_id)
    question = _required_text(req.question, "question", request_id)
    current_episode_id = _required_text(req.current_episode_id, "current_episode_id", request_id)

    data = await run_data_feature(
        request_id=request_id,
        feature="ask",
        system_prompt=ASK_SYSTEM_PROMPT,
        user_prompt=(
            "Answer a project setting question and include references.\n"
            f"- project_id: {project_id}\n"
            f"- current_episode_id: {current_episode_id}\n"
            f"- question: {question}\n"
            'Return JSON schema: {"answer":"...","references":[{"episode_id":"...","title":"...","matched_text":"..."}]}'
        ),
        schema=AskData,
        mock_builder=lambda: build_mock_ask_data(
            project_id=project_id,
            current_episode_id=current_episode_id,
            question=question,
        ),
        temperature=0.3,
    )
    return ApiSuccessResponse(success=True, data=data.model_dump())


@router.post("/api/episodes/{episodeId}/ai/synonyms", response_model=ApiSuccessResponse)
async def synonyms(episodeId: str, req: SynonymsRequest) -> ApiSuccessResponse:
    request_id = str(uuid4())
    episode_id = _required_text(episodeId, "episodeId", request_id)
    selected_word = _required_text(req.selected_word, "selected_word", request_id)
    block_id = _required_text(req.block_id, "block_id", request_id)

    data = await run_data_feature(
        request_id=request_id,
        feature="synonyms",
        system_prompt=SYNONYMS_SYSTEM_PROMPT,
        user_prompt=(
            "Recommend alternative words based on selected word and context.\n"
            f"- episode_id: {episode_id}\n"
            f"- block_id: {block_id}\n"
            f"- selected_word: {selected_word}\n"
            'Return JSON schema: {"recommendations":[{"word":"...","description":"..."}]}'
        ),
        schema=SynonymsData,
        mock_builder=lambda: build_mock_synonyms_data(
            episode_id=episode_id,
            block_id=block_id,
            selected_word=selected_word,
        ),
        temperature=0.5,
    )
    return ApiSuccessResponse(success=True, data=data.model_dump())


@router.post("/api/episodes/{episodeId}/ai/transform-style", response_model=ApiSuccessResponse)
async def transform_style(episodeId: str, req: TransformStyleRequest) -> ApiSuccessResponse:
    request_id = str(uuid4())
    episode_id = _required_text(episodeId, "episodeId", request_id)
    style_tag = _required_text(req.style_tag, "style_tag", request_id)
    block_id = _resolve_transform_block_id(req, request_id)

    data = await run_data_feature(
        request_id=request_id,
        feature="transform_style",
        system_prompt=TRANSFORM_STYLE_SYSTEM_PROMPT,
        user_prompt=(
            "Transform paragraph style while preserving meaning.\n"
            f"- episode_id: {episode_id}\n"
            f"- block_id: {block_id}\n"
            f"- style_tag: {style_tag}\n"
            'Return JSON schema: {"transformed_blocks":[{"type":"paragraph","text":"..."}]}'
        ),
        schema=TransformStyleData,
        mock_builder=lambda: build_mock_transform_style_data(
            episode_id=episode_id,
            block_id=block_id,
            style_tag=style_tag,
        ),
        temperature=0.65,
    )
    return ApiSuccessResponse(success=True, data=data.model_dump())
