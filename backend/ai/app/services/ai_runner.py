import logging
from time import perf_counter
from typing import Literal, TypeVar

import httpx
from fastapi import HTTPException
from pydantic import BaseModel, ValidationError

from app.services.providers import ProviderError, call_provider_json, resolve_model

FeatureName = Literal["autocomplete", "ask", "synonyms", "transform_style"]
T = TypeVar("T", bound=BaseModel)

logger = logging.getLogger("cowrite.ai")


async def run_data_feature(
    *,
    request_id: str,
    feature: FeatureName,
    system_prompt: str,
    user_prompt: str,
    schema: type[T],
    temperature: float,
) -> T:
    started_at = perf_counter()
    model_name = resolve_model()

    try:
        raw_data = await call_provider_json(
            prompt=user_prompt,
            system_prompt=system_prompt,
            model=model_name,
            temperature=temperature,
        )
        parsed = schema.model_validate(raw_data)
    except ValidationError as exc:
        logger.warning(
            "ai.request.invalid_schema request_id=%s feature=%s model=%s error=%s",
            request_id,
            feature,
            model_name,
            str(exc),
        )
        raise HTTPException(
            status_code=502,
            detail={
                "code": "GEMINI_ERROR",
                "message": "AI returned invalid schema payload.",
                "request_id": request_id,
                "feature": feature,
                "provider": "gemini",
            },
        ) from exc
    except httpx.TimeoutException as exc:
        logger.warning(
            "ai.request.timeout request_id=%s feature=%s model=%s",
            request_id,
            feature,
            model_name,
        )
        raise HTTPException(
            status_code=504,
            detail={
                "code": "GEMINI_TIMEOUT",
                "message": "Gemini request timed out.",
                "request_id": request_id,
            },
        ) from exc
    except ProviderError as exc:
        logger.warning(
            "ai.request.failed request_id=%s feature=%s model=%s error=%s",
            request_id,
            feature,
            model_name,
            str(exc),
        )
        raise HTTPException(
            status_code=502,
            detail={
                "code": "GEMINI_ERROR",
                "message": str(exc),
                "request_id": request_id,
                "feature": feature,
                "provider": "gemini",
            },
        ) from exc

    elapsed_ms = int((perf_counter() - started_at) * 1000)
    logger.info(
        "ai.request.ok request_id=%s feature=%s provider=gemini model=%s elapsed_ms=%d",
        request_id,
        feature,
        model_name,
        elapsed_ms,
    )
    return parsed
