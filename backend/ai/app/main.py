import logging
from datetime import datetime, timezone
from time import perf_counter
from typing import Literal, Optional
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from app.services.mock_responses import build_mock_response
from app.services.providers import (
    ProviderError,
    ProviderName,
    call_provider,
    get_runtime_mode,
    resolve_model,
)

logger = logging.getLogger("cowrite.ai")

FeatureName = Literal[
    "complete",
    "search",
    "style_convert",
    "character_simulate",
    "predict",
    "translate",
    "research",
    "storyboard",
    "tts",
    "transcribe",
]

app = FastAPI(title="Cowrite AI Service")


class HealthResponse(BaseModel):
    status: str
    service: str
    time: str
    mode: Literal["mock", "live"]


class ProviderRequest(BaseModel):
    # Backward compatibility: caller may still send provider, but runtime is always Gemini.
    provider: Optional[str] = None
    model: Optional[str] = None


class CompletionRequest(ProviderRequest):
    prompt: str


class CompletionResponse(BaseModel):
    content: str
    request_id: str
    mode: Literal["mock", "live"]
    provider: ProviderName
    model: Optional[str] = None


class SearchRequest(ProviderRequest):
    query: str
    context: Optional[str] = None


class StyleRequest(ProviderRequest):
    text: str
    style: str


class CharacterSimRequest(ProviderRequest):
    character: str
    scenario: str


class PredictRequest(ProviderRequest):
    text: str


class TranslateRequest(ProviderRequest):
    text: str
    target_language: str


class ResearchRequest(ProviderRequest):
    query: str


class StoryboardRequest(ProviderRequest):
    text: str


class TTSRequest(ProviderRequest):
    text: str
    voice: Optional[str] = None


class TranscribeRequest(ProviderRequest):
    text: Optional[str] = None


def _clean_text(value: str) -> str:
    return (value or "").strip()


async def _run_feature(
    feature: FeatureName,
    user_prompt: str,
    model: Optional[str],
    system_prompt: Optional[str] = None,
) -> CompletionResponse:
    request_id = str(uuid4())
    started_at = perf_counter()

    resolved_provider: ProviderName = "gemini"
    resolved_model = resolve_model(model)
    mode = get_runtime_mode()

    try:
        if mode == "mock":
            mock_prompt = user_prompt
            if system_prompt and system_prompt.strip():
                mock_prompt = f"[SYSTEM]\n{system_prompt.strip()}\n\n[USER]\n{user_prompt}"
            content = build_mock_response(feature, mock_prompt)
        else:
            content = await call_provider(
                user_prompt,
                resolved_model,
                system_prompt=system_prompt,
            )
    except ProviderError as exc:
        logger.warning(
            "ai.request.failed request_id=%s feature=%s mode=%s provider=%s model=%s error=%s",
            request_id,
            feature,
            mode,
            resolved_provider,
            resolved_model,
            str(exc),
        )
        raise HTTPException(
            status_code=502,
            detail={
                "code": "AI_PROVIDER_ERROR",
                "message": str(exc),
                "request_id": request_id,
                "feature": feature,
                "provider": resolved_provider,
            },
        ) from exc

    elapsed_ms = int((perf_counter() - started_at) * 1000)
    logger.info(
        "ai.request.ok request_id=%s feature=%s mode=%s provider=%s model=%s elapsed_ms=%d",
        request_id,
        feature,
        mode,
        resolved_provider,
        resolved_model,
        elapsed_ms,
    )

    return CompletionResponse(
        content=content,
        request_id=request_id,
        mode=mode,
        provider=resolved_provider,
        model=resolved_model,
    )


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service="ai-service",
        time=datetime.now(timezone.utc).isoformat(),
        mode=get_runtime_mode(),
    )


@app.post("/ai/complete", response_model=CompletionResponse)
async def complete(req: CompletionRequest) -> CompletionResponse:
    return await _run_feature(
        "complete",
        _clean_text(req.prompt),
        req.model,
        system_prompt=(
            "You are a writing assistant for long-form fiction. "
            "Write directly, stay consistent with context, and avoid meta commentary."
        ),
    )


@app.post("/ai/search", response_model=CompletionResponse)
async def search(req: SearchRequest) -> CompletionResponse:
    user_prompt = _clean_text(
        f"query: {req.query}\ncontext:\n{req.context or ''}",
    )
    return await _run_feature(
        "search",
        user_prompt,
        req.model,
        system_prompt="Search the project settings using the query and context.",
    )


@app.post("/ai/style/convert", response_model=CompletionResponse)
async def style_convert(req: StyleRequest) -> CompletionResponse:
    user_prompt = _clean_text(
        f"style: {req.style}\ntext:\n{req.text}",
    )
    return await _run_feature(
        "style_convert",
        user_prompt,
        req.model,
        system_prompt="Rewrite the text with the requested style while preserving meaning.",
    )


@app.post("/ai/character/simulate", response_model=CompletionResponse)
async def character_simulate(req: CharacterSimRequest) -> CompletionResponse:
    user_prompt = _clean_text(
        f"character:\n{req.character}\nscenario:\n{req.scenario}",
    )
    return await _run_feature(
        "character_simulate",
        user_prompt,
        req.model,
        system_prompt="Respond in-character based on the character profile and scenario.",
    )


@app.post("/ai/predict", response_model=CompletionResponse)
async def predict(req: PredictRequest) -> CompletionResponse:
    return await _run_feature(
        "predict",
        _clean_text(req.text),
        req.model,
        system_prompt="Predict reader engagement and drop-risk from the text.",
    )


@app.post("/ai/translate", response_model=CompletionResponse)
async def translate(req: TranslateRequest) -> CompletionResponse:
    user_prompt = _clean_text(
        f"target_language: {req.target_language}\ntext:\n{req.text}",
    )
    return await _run_feature(
        "translate",
        user_prompt,
        req.model,
        system_prompt="Translate the text to the requested target language.",
    )


@app.post("/ai/research", response_model=CompletionResponse)
async def research(req: ResearchRequest) -> CompletionResponse:
    return await _run_feature(
        "research",
        _clean_text(req.query),
        req.model,
        system_prompt="Research the topic and provide concise actionable findings.",
    )


@app.post("/ai/storyboard", response_model=CompletionResponse)
async def storyboard(req: StoryboardRequest) -> CompletionResponse:
    return await _run_feature(
        "storyboard",
        _clean_text(req.text),
        req.model,
        system_prompt="Convert the text into a panel-based webtoon storyboard.",
    )


@app.post("/ai/tts", response_model=CompletionResponse)
async def tts(req: TTSRequest) -> CompletionResponse:
    user_prompt = _clean_text(
        f"voice: {req.voice or 'default'}\ntext:\n{req.text}",
    )
    return await _run_feature(
        "tts",
        user_prompt,
        req.model,
        system_prompt="Create a narration script for text-to-speech rendering.",
    )


@app.post("/ai/transcribe", response_model=CompletionResponse)
async def transcribe(req: TranscribeRequest) -> CompletionResponse:
    if not req.text:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "AI_VALIDATION_ERROR",
                "message": "transcribe requires `text` in current implementation",
            },
        )

    return await _run_feature(
        "transcribe",
        _clean_text(req.text),
        req.model,
        system_prompt="Transcribe the provided source into clean text.",
    )
