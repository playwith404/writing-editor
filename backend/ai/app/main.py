from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from app.services.providers import call_openai, call_anthropic, call_gemini, ProviderError

app = FastAPI(title="Cowrite AI 서비스")

ProviderName = Literal["openai", "anthropic", "gemini"]


class HealthResponse(BaseModel):
    status: str
    service: str
    time: str


class ProviderRequest(BaseModel):
    provider: ProviderName = "openai"
    model: Optional[str] = None


class CompletionRequest(ProviderRequest):
    prompt: str


class CompletionResponse(BaseModel):
    content: str


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


def _build_prompt(prefix: str, content: str) -> str:
    return f"{prefix}\n\n{content}"


async def _run_prompt(provider: ProviderName, prompt: str, model: Optional[str]) -> str:
    try:
        if provider == "openai":
            return await call_openai(prompt, model)
        if provider == "anthropic":
            return await call_anthropic(prompt, model)
        if provider == "gemini":
            return await call_gemini(prompt, model)
    except ProviderError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    raise HTTPException(status_code=400, detail="지원하지 않는 제공자입니다.")


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service="ai-service",
        time=datetime.now(timezone.utc).isoformat(),
    )


@app.post("/ai/complete", response_model=CompletionResponse)
async def complete(req: CompletionRequest) -> CompletionResponse:
    content = await _run_prompt(req.provider, req.prompt, req.model)
    return CompletionResponse(content=content)


@app.post("/ai/search", response_model=CompletionResponse)
async def search(req: SearchRequest) -> CompletionResponse:
    prompt = _build_prompt("검색 질의:", f"{req.query}\n컨텍스트:\n{req.context or ''}")
    content = await _run_prompt(req.provider, prompt, req.model)
    return CompletionResponse(content=content)


@app.post("/ai/style/convert", response_model=CompletionResponse)
async def style_convert(req: StyleRequest) -> CompletionResponse:
    prompt = _build_prompt(
        "요청한 스타일로 다음 텍스트를 변환해 주세요:",
        f"스타일: {req.style}\n텍스트:\n{req.text}",
    )
    content = await _run_prompt(req.provider, prompt, req.model)
    return CompletionResponse(content=content)


@app.post("/ai/character/simulate", response_model=CompletionResponse)
async def character_simulate(req: CharacterSimRequest) -> CompletionResponse:
    prompt = _build_prompt(
        "캐릭터의 반응을 시뮬레이션해 주세요:",
        f"캐릭터: {req.character}\n상황: {req.scenario}",
    )
    content = await _run_prompt(req.provider, prompt, req.model)
    return CompletionResponse(content=content)


@app.post("/ai/predict", response_model=CompletionResponse)
async def predict(req: PredictRequest) -> CompletionResponse:
    prompt = _build_prompt(
        "독자 반응과 이탈 위험을 예측해 주세요:",
        req.text,
    )
    content = await _run_prompt(req.provider, prompt, req.model)
    return CompletionResponse(content=content)


@app.post("/ai/translate", response_model=CompletionResponse)
async def translate(req: TranslateRequest) -> CompletionResponse:
    prompt = _build_prompt(
        "텍스트를 번역해 주세요:",
        f"목표 언어: {req.target_language}\n텍스트:\n{req.text}",
    )
    content = await _run_prompt(req.provider, prompt, req.model)
    return CompletionResponse(content=content)


@app.post("/ai/research", response_model=CompletionResponse)
async def research(req: ResearchRequest) -> CompletionResponse:
    prompt = _build_prompt(
        "조사 노트와 출처를 제공해 주세요:",
        req.query,
    )
    content = await _run_prompt(req.provider, prompt, req.model)
    return CompletionResponse(content=content)


@app.post("/ai/storyboard", response_model=CompletionResponse)
async def storyboard(req: StoryboardRequest) -> CompletionResponse:
    prompt = _build_prompt(
        "텍스트를 바탕으로 스토리보드 개요를 작성해 주세요:",
        req.text,
    )
    content = await _run_prompt(req.provider, prompt, req.model)
    return CompletionResponse(content=content)


@app.post("/ai/tts", response_model=CompletionResponse)
async def tts(req: TTSRequest) -> CompletionResponse:
    prompt = _build_prompt(
        "감정/톤 지시가 포함된 TTS 스크립트를 작성해 주세요:",
        f"음성: {req.voice or '기본'}\n텍스트:\n{req.text}",
    )
    content = await _run_prompt(req.provider, prompt, req.model)
    return CompletionResponse(content=content)


@app.post("/ai/transcribe", response_model=CompletionResponse)
async def transcribe(req: TranscribeRequest) -> CompletionResponse:
    if not req.text:
        raise HTTPException(status_code=400, detail="전사 요청에는 text가 필요합니다.")
    prompt = _build_prompt("다음 오디오/텍스트를 전사해 주세요:", req.text)
    content = await _run_prompt(req.provider, prompt, req.model)
    return CompletionResponse(content=content)
