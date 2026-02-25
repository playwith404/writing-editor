from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from uuid import uuid4

from app.routes import router

app = FastAPI(title="Cowrite AI Service")
app.include_router(router)


def _code_from_status(status_code: int) -> str:
    if status_code == 502:
        return "GEMINI_ERROR"
    if status_code == 504:
        return "GEMINI_TIMEOUT"
    return "INVALID_REQUEST"


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    request_id = str(uuid4())
    detail = exc.detail
    if isinstance(detail, dict):
        error = dict(detail)
        error.setdefault("code", _code_from_status(exc.status_code))
        error.setdefault("message", "Request failed.")
        error.setdefault("request_id", request_id)
    else:
        error = {
            "code": _code_from_status(exc.status_code),
            "message": str(detail),
            "request_id": request_id,
        }
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": error},
    )


@app.exception_handler(StarletteHTTPException)
async def starlette_http_exception_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    request_id = str(uuid4())
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": _code_from_status(exc.status_code),
                "message": str(exc.detail),
                "request_id": request_id,
            },
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    request_id = str(uuid4())
    return JSONResponse(
        status_code=400,
        content={
            "success": False,
            "error": {
                "code": "INVALID_REQUEST",
                "message": str(exc.errors()),
                "request_id": request_id,
            },
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = str(uuid4())
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred.",
                "request_id": request_id,
            },
        },
    )
