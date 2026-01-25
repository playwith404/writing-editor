from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from app.services.providers import call_openai, call_anthropic, call_gemini, ProviderError

app = FastAPI(title="Cowrite AI Service")

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

    raise HTTPException(status_code=400, detail="Unknown provider")


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
    prompt = _build_prompt("Search query:", f"{req.query}\nContext:\n{req.context or ''}")
    content = await _run_prompt(req.provider, prompt, req.model)
    return CompletionResponse(content=content)


@app.post("/ai/style/convert", response_model=CompletionResponse)
async def style_convert(req: StyleRequest) -> CompletionResponse:
    prompt = _build_prompt(
        "Convert the following text to the requested style:",
        f"Style: {req.style}\nText:\n{req.text}",
    )
    content = await _run_prompt(req.provider, prompt, req.model)
    return CompletionResponse(content=content)


@app.post("/ai/character/simulate", response_model=CompletionResponse)
async def character_simulate(req: CharacterSimRequest) -> CompletionResponse:
    prompt = _build_prompt(
        "Simulate the character's response:",
        f"Character: {req.character}\nScenario: {req.scenario}",
    )
    content = await _run_prompt(req.provider, prompt, req.model)
    return CompletionResponse(content=content)


@app.post("/ai/predict", response_model=CompletionResponse)
async def predict(req: PredictRequest) -> CompletionResponse:
    prompt = _build_prompt(
        "Predict reader reaction and engagement risks:",
        req.text,
    )
    content = await _run_prompt(req.provider, prompt, req.model)
    return CompletionResponse(content=content)


@app.post("/ai/translate", response_model=CompletionResponse)
async def translate(req: TranslateRequest) -> CompletionResponse:
    prompt = _build_prompt(
        "Translate the text:",
        f"Target language: {req.target_language}\nText:\n{req.text}",
    )
    content = await _run_prompt(req.provider, prompt, req.model)
    return CompletionResponse(content=content)


@app.post("/ai/research", response_model=CompletionResponse)
async def research(req: ResearchRequest) -> CompletionResponse:
    prompt = _build_prompt(
        "Provide research notes and sources:",
        req.query,
    )
    content = await _run_prompt(req.provider, prompt, req.model)
    return CompletionResponse(content=content)


@app.post("/ai/storyboard", response_model=CompletionResponse)
async def storyboard(req: StoryboardRequest) -> CompletionResponse:
    prompt = _build_prompt(
        "Create a storyboard outline from the text:",
        req.text,
    )
    content = await _run_prompt(req.provider, prompt, req.model)
    return CompletionResponse(content=content)


@app.post("/ai/tts", response_model=CompletionResponse)
async def tts(req: TTSRequest) -> CompletionResponse:
    prompt = _build_prompt(
        "Create a TTS script with emotion/tone cues:",
        f"Voice: {req.voice or 'default'}\nText:\n{req.text}",
    )
    content = await _run_prompt(req.provider, prompt, req.model)
    return CompletionResponse(content=content)


@app.post("/ai/transcribe", response_model=CompletionResponse)
async def transcribe(req: TranscribeRequest) -> CompletionResponse:
    if not req.text:
        raise HTTPException(status_code=400, detail="text is required for transcription stub")
    prompt = _build_prompt("Transcribe the following audio/text:", req.text)
    content = await _run_prompt(req.provider, prompt, req.model)
    return CompletionResponse(content=content)
