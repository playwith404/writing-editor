from datetime import datetime, timezone
from typing import Iterable, Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException

from app.services.prompts import (
    ASK_SYSTEM_PROMPT,
    AUTOCOMPLETE_SYSTEM_PROMPT,
    SYNONYMS_SYSTEM_PROMPT,
    TRANSFORM_STYLE_SYSTEM_PROMPT,
)
from app.schemas import (
    ApiSuccessResponse,
    AskData,
    AskRequest,
    AskRetrievedContext,
    AutocompleteData,
    AutocompleteRequest,
    ContextBlock,
    HealthResponse,
    SynonymsData,
    SynonymsRequest,
    TransformStyleData,
    TransformStyleRequest,
)
from app.services.ai_runner import run_data_feature

router = APIRouter()


def _validation_error(message: str, request_id: str) -> HTTPException:
    return HTTPException(
        status_code=400,
        detail={
            "code": "INVALID_REQUEST",
            "message": message,
            "request_id": request_id,
        },
    )


def _required_text(value: Optional[str], field_name: str, request_id: str) -> str:
    normalized = (value or "").strip()
    if not normalized:
        raise _validation_error(f"`{field_name}` is required.", request_id)
    return normalized


def _format_blocks(blocks: Iterable[ContextBlock]) -> str:
    rows: list[str] = []
    for idx, block in enumerate(blocks, start=1):
        text = (block.text or "").strip()
        if not text:
            continue
        block_id = (block.block_id or "").strip() or f"idx-{idx}"
        rows.append(f"- [{block_id}] {text}")
    return "\n".join(rows) if rows else "- (none)"


def _format_retrieved_contexts(items: Iterable[AskRetrievedContext]) -> str:
    rows: list[str] = []
    for idx, item in enumerate(items, start=1):
        episode_id = (item.episode_id or "").strip() or f"episode-{idx}"
        episode_title = (item.episode_title or "").strip() or "제목 미상"
        block_id = (item.block_id or "").strip() or f"block-{idx}"
        text = (item.text or "").strip()
        if not text:
            continue
        rows.append(
            f"- episode_id={episode_id}, episode_title={episode_title}, block_id={block_id}\n"
            f"  text: {text}"
        )
    return "\n".join(rows) if rows else "- (none)"


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service="ai-service",
        time=datetime.now(timezone.utc).isoformat(),
    )


@router.post("/internal/episodes/{episodeId}/ai/autocomplete", response_model=ApiSuccessResponse)
async def autocomplete(episodeId: str, req: AutocompleteRequest) -> ApiSuccessResponse:
    request_id = str(uuid4())
    episode_id = _required_text(episodeId, "episodeId", request_id)

    before_blocks = req.context.before_blocks or []
    after_blocks = req.context.after_blocks or []
    cursor_block = req.context.cursor_block
    cursor_block_id = _required_text(
        cursor_block.block_id,
        "context.cursor_block.block_id",
        request_id,
    )
    cursor_block_text = _required_text(
        cursor_block.text,
        "context.cursor_block.text",
        request_id,
    )
    generate_count = req.generate_count

    user_prompt = (
        "Task: Continue the novel text right after cursor_block using provided context.\n"
        f"episode_id: {episode_id}\n"
        f"generate_count: {generate_count}\n"
        "before_blocks:\n"
        f"{_format_blocks(before_blocks)}\n"
        "cursor_block:\n"
        f"- [{cursor_block_id}] {cursor_block_text}\n"
        "after_blocks:\n"
        f"{_format_blocks(after_blocks)}\n"
        'Return JSON schema: {"generated_blocks":[{"type":"paragraph","text":"..."}]}'
    )

    data = await run_data_feature(
        request_id=request_id,
        feature="autocomplete",
        system_prompt=AUTOCOMPLETE_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        schema=AutocompleteData,
        temperature=0.7,
    )
    return ApiSuccessResponse(success=True, data=data.model_dump())


@router.post("/internal/projects/{projectId}/ai/ask", response_model=ApiSuccessResponse)
async def ask(projectId: str, req: AskRequest) -> ApiSuccessResponse:
    request_id = str(uuid4())
    project_id = _required_text(projectId, "projectId", request_id)
    question = _required_text(req.question, "question", request_id)

    retrieved_contexts = req.retrieved_contexts or []
    if len(retrieved_contexts) == 0:
        data = AskData(
            answer="저장된 내용에서 관련 정보를 찾지 못했습니다.",
            references=[],
        )
        return ApiSuccessResponse(success=True, data=data.model_dump())

    user_prompt = (
        "Task: Answer the user question using only retrieved contexts.\n"
        f"project_id: {project_id}\n"
        f"question: {question}\n"
        "retrieved_contexts:\n"
        f"{_format_retrieved_contexts(retrieved_contexts)}\n"
        "references must use key `title` (not `episode_title`).\n"
        'Return JSON schema: {"answer":"...","references":[{"episode_id":"...","title":"...","matched_text":"..."}]}'
    )

    data = await run_data_feature(
        request_id=request_id,
        feature="ask",
        system_prompt=ASK_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        schema=AskData,
        temperature=0.3,
    )
    return ApiSuccessResponse(success=True, data=data.model_dump())


@router.post("/internal/episodes/{episodeId}/ai/synonyms", response_model=ApiSuccessResponse)
async def synonyms(episodeId: str, req: SynonymsRequest) -> ApiSuccessResponse:
    request_id = str(uuid4())
    episode_id = _required_text(episodeId, "episodeId", request_id)
    selected_word = _required_text(req.selected_word, "selected_word", request_id)
    recommend_count = req.recommend_count

    target_block_id = _required_text(
        req.context.target_block.block_id,
        "context.target_block.block_id",
        request_id,
    )
    target_block_text = _required_text(
        req.context.target_block.text,
        "context.target_block.text",
        request_id,
    )
    surrounding_blocks = req.context.surrounding_blocks or []

    user_prompt = (
        "Task: Recommend context-aware Korean synonyms for selected word.\n"
        f"episode_id: {episode_id}\n"
        f"selected_word: {selected_word}\n"
        f"recommend_count: {recommend_count}\n"
        "target_block:\n"
        f"- [{target_block_id}] {target_block_text}\n"
        "surrounding_blocks:\n"
        f"{_format_blocks(surrounding_blocks)}\n"
        'Return JSON schema: {"recommendations":[{"word":"...","description":"..."}]}'
    )

    data = await run_data_feature(
        request_id=request_id,
        feature="synonyms",
        system_prompt=SYNONYMS_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        schema=SynonymsData,
        temperature=0.5,
    )
    return ApiSuccessResponse(success=True, data=data.model_dump())


@router.post("/internal/episodes/{episodeId}/ai/transform-style", response_model=ApiSuccessResponse)
async def transform_style(episodeId: str, req: TransformStyleRequest) -> ApiSuccessResponse:
    request_id = str(uuid4())
    episode_id = _required_text(episodeId, "episodeId", request_id)

    target_block_id = _required_text(
        req.target_block.block_id,
        "target_block.block_id",
        request_id,
    )
    target_text = _required_text(
        req.target_block.text,
        "target_block.text",
        request_id,
    )
    style_tag = _required_text(req.style_tag, "style_tag", request_id)

    user_prompt = (
        "Task: Rewrite target paragraph in requested style while preserving meaning.\n"
        f"episode_id: {episode_id}\n"
        f"target_block_id: {target_block_id}\n"
        f"style_tag: {style_tag}\n"
        f"target_text: {target_text}\n"
        'Return JSON schema: {"transformed_blocks":[{"type":"paragraph","text":"..."}]}'
    )

    data = await run_data_feature(
        request_id=request_id,
        feature="transform_style",
        system_prompt=TRANSFORM_STYLE_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        schema=TransformStyleData,
        temperature=0.65,
    )
    return ApiSuccessResponse(success=True, data=data.model_dump())
