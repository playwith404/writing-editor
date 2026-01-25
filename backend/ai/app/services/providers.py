import os
from typing import Optional

import httpx


class ProviderError(Exception):
    pass


def _get_env(name: str, default: Optional[str] = None) -> Optional[str]:
    value = os.getenv(name, default)
    return value if value else default


def _openai_endpoint() -> str:
    base = _get_env("OPENAI_BASE_URL", "https://api.openai.com/v1")
    path = _get_env("OPENAI_CHAT_PATH", "chat/completions")
    return f"{base.rstrip('/')}/{path.lstrip('/')}"


def _anthropic_endpoint() -> str:
    base = _get_env("ANTHROPIC_BASE_URL", "https://api.anthropic.com/v1")
    path = _get_env("ANTHROPIC_MESSAGES_PATH", "messages")
    return f"{base.rstrip('/')}/{path.lstrip('/')}"


def _gemini_endpoint(model: str) -> str:
    base = _get_env("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta")
    return f"{base.rstrip('/')}/models/{model}:generateContent"


async def call_openai(prompt: str, model: Optional[str] = None) -> str:
    api_key = _get_env("OPENAI_API_KEY")
    if not api_key:
        return f"[임시 응답] {prompt}"

    payload = {
        "model": model or _get_env("OPENAI_MODEL", "gpt-4o-mini"),
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7,
    }

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            _openai_endpoint(),
            headers={"Authorization": f"Bearer {api_key}"},
            json=payload,
        )

    if resp.status_code >= 400:
        raise ProviderError(f"OpenAI 오류: {resp.text}")

    data = resp.json()
    return data.get("choices", [{}])[0].get("message", {}).get("content", "")


async def call_anthropic(prompt: str, model: Optional[str] = None) -> str:
    api_key = _get_env("ANTHROPIC_API_KEY")
    if not api_key:
        return f"[임시 응답] {prompt}"

    payload = {
        "model": model or _get_env("ANTHROPIC_MODEL", "claude-3-5-sonnet-latest"),
        "max_tokens": 1024,
        "messages": [{"role": "user", "content": prompt}],
    }

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            _anthropic_endpoint(),
            headers={
                "x-api-key": api_key,
                "anthropic-version": _get_env("ANTHROPIC_VERSION", "2023-06-01"),
            },
            json=payload,
        )

    if resp.status_code >= 400:
        raise ProviderError(f"Anthropic 오류: {resp.text}")

    data = resp.json()
    content = data.get("content", [])
    if content and isinstance(content, list):
        return content[0].get("text", "")
    return data.get("completion", "") or ""


async def call_gemini(prompt: str, model: Optional[str] = None) -> str:
    api_key = _get_env("GEMINI_API_KEY")
    if not api_key:
        return f"[임시 응답] {prompt}"

    model_name = model or _get_env("GEMINI_MODEL", "gemini-1.5-pro")

    payload = {
        "contents": [
            {"parts": [{"text": prompt}]}
        ]
    }

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            _gemini_endpoint(model_name),
            params={"key": api_key},
            json=payload,
        )

    if resp.status_code >= 400:
        raise ProviderError(f"Gemini 오류: {resp.text}")

    data = resp.json()
    candidates = data.get("candidates", [])
    if candidates:
        parts = candidates[0].get("content", {}).get("parts", [])
        if parts:
            return parts[0].get("text", "")
    return ""
