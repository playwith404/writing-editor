import os
import re
from json import JSONDecodeError, loads
from typing import Any, Literal, Optional

import httpx

ProviderName = Literal["gemini"]
RuntimeMode = Literal["mock", "live"]


class ProviderError(Exception):
    pass


def _get_env(name: str, default: Optional[str] = None) -> Optional[str]:
    value = os.getenv(name, default)
    return value if value else default


def _get_timeout() -> float:
    raw = _get_env("AI_HTTP_TIMEOUT_SECONDS", "60")
    try:
        value = float(raw)
        return value if value > 0 else 60.0
    except (TypeError, ValueError):
        return 60.0


def get_runtime_mode() -> RuntimeMode:
    mode = (_get_env("AI_MODE", "mock") or "mock").strip().lower()
    return "live" if mode == "live" else "mock"


def resolve_model(explicit_model: Optional[str] = None) -> str:
    if explicit_model and explicit_model.strip():
        return explicit_model.strip()
    default_value = "gemini-3.0-flash"
    return _get_env("GEMINI_MODEL", default_value) or default_value


def require_api_key() -> str:
    key = _get_env("GEMINI_API_KEY")
    if not key:
        raise ProviderError(
            "GEMINI_API_KEY is not set. Set API key env vars or switch AI_MODE=mock."
        )
    return key


def _gemini_endpoint(model: str) -> str:
    base = _get_env("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta")
    return f"{base.rstrip('/')}/models/{model}:generateContent"


def _extract_gemini_text(data: dict) -> str:
    chunks: list[str] = []
    candidates = data.get("candidates", [])
    if not isinstance(candidates, list):
        return ""
    for candidate in candidates:
        if not isinstance(candidate, dict):
            continue
        content = candidate.get("content", {})
        if not isinstance(content, dict):
            continue
        parts = content.get("parts", [])
        if not isinstance(parts, list):
            continue
        for part in parts:
            if not isinstance(part, dict):
                continue
            text = part.get("text")
            if isinstance(text, str) and text.strip():
                chunks.append(text.strip())
    return "\n".join(chunks).strip()


def _parse_json_text(text: str) -> dict[str, Any]:
    try:
        parsed = loads(text)
        if isinstance(parsed, dict):
            return parsed
    except JSONDecodeError:
        pass

    fenced = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, flags=re.DOTALL)
    if fenced:
        try:
            parsed = loads(fenced.group(1))
            if isinstance(parsed, dict):
                return parsed
        except JSONDecodeError:
            pass

    first = text.find("{")
    last = text.rfind("}")
    if first != -1 and last != -1 and last > first:
        snippet = text[first : last + 1]
        try:
            parsed = loads(snippet)
            if isinstance(parsed, dict):
                return parsed
        except JSONDecodeError:
            pass

    raise ProviderError("Gemini did not return valid JSON object output.")


async def call_provider_json(
    prompt: str,
    model: Optional[str] = None,
    system_prompt: Optional[str] = None,
    temperature: float = 0.7,
) -> dict[str, Any]:
    api_key = require_api_key()
    model_name = resolve_model(model)

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": temperature,
            "responseMimeType": "application/json",
        },
    }
    if system_prompt and system_prompt.strip():
        payload["systemInstruction"] = {"parts": [{"text": system_prompt.strip()}]}

    async with httpx.AsyncClient(timeout=_get_timeout()) as client:
        resp = await client.post(
            _gemini_endpoint(model_name),
            params={"key": api_key},
            json=payload,
        )

    if resp.status_code >= 400:
        raise ProviderError(f"Gemini error: {resp.text}")

    text = _extract_gemini_text(resp.json())
    if not text:
        raise ProviderError("Gemini returned an empty response body.")
    return _parse_json_text(text)
