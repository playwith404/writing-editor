from datetime import datetime, timezone
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Cowrite AI Service")


class HealthResponse(BaseModel):
    status: str
    service: str
    time: str


class CompletionRequest(BaseModel):
    prompt: str


class CompletionResponse(BaseModel):
    content: str


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service="ai-service",
        time=datetime.now(timezone.utc).isoformat()
    )


@app.post("/ai/complete", response_model=CompletionResponse)
def complete(req: CompletionRequest) -> CompletionResponse:
    return CompletionResponse(content=req.prompt)
