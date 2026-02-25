import logging
from time import perf_counter
from typing import Any, Callable, Literal, TypeVar

from fastapi import HTTPException
from pydantic import BaseModel, ValidationError

from app.services.providers import ProviderError, call_provider_json, get_runtime_mode, resolve_model

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
    mock_builder: Callable[[], dict[str, Any]],
    temperature: float,
) -> T:
    started_at = perf_counter()
    mode = get_runtime_mode()
    model_name = resolve_model()

    try:
        if mode == "mock":
            raw_data = mock_builder()
        else:
            raw_data = await call_provider_json(
                prompt=user_prompt,
                system_prompt=system_prompt,
                model=model_name,
                temperature=temperature,
            )
        parsed = schema.model_validate(raw_data)
    except ValidationError as exc:
        logger.warning(
            "ai.request.invalid_schema request_id=%s feature=%s mode=%s model=%s error=%s",
            request_id,
            feature,
            mode,
            model_name,
            str(exc),
        )
        raise HTTPException(
            status_code=502,
            detail={
                "code": "AI_PROVIDER_ERROR",
                "message": "AI returned invalid schema payload.",
                "request_id": request_id,
                "feature": feature,
                "provider": "gemini",
            },
        ) from exc
    except ProviderError as exc:
        logger.warning(
            "ai.request.failed request_id=%s feature=%s mode=%s model=%s error=%s",
            request_id,
            feature,
            mode,
            model_name,
            str(exc),
        )
        raise HTTPException(
            status_code=502,
            detail={
                "code": "AI_PROVIDER_ERROR",
                "message": str(exc),
                "request_id": request_id,
                "feature": feature,
                "provider": "gemini",
            },
        ) from exc

    elapsed_ms = int((perf_counter() - started_at) * 1000)
    logger.info(
        "ai.request.ok request_id=%s feature=%s mode=%s provider=gemini model=%s elapsed_ms=%d",
        request_id,
        feature,
        mode,
        model_name,
        elapsed_ms,
    )
    return parsed
