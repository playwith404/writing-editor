import traceback

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError, ResponseValidationError
from fastapi.responses import JSONResponse
from starlette.requests import Request

from app.api.v1 import projects, characters, worldviews, plots, episodes, ai
from app.core.config import settings
from app.db.session import Base, engine

# ⚠️ create_all 전에 모든 모델을 import 해야
# Base.metadata에 테이블이 등록되어 DB에 실제로 생성됩니다.
from app.models import project, character, worldview  # noqa: F401
from app.models import plot, episode                  # noqa: F401

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

DB_INIT_ERROR: str | None = None


# 스웨거 UI에서 보이는 섹션 순서를 고정하기 위한 설정
tags_metadata = [
    {"name": "1. 시리즈 (Projects)", "description": "내 소설(프로젝트) 관리"},
    {"name": "2. 캐릭터 (Characters)", "description": "인물 기획 및 관리"},
    {"name": "3. 세계관 (Worldviews)", "description": "기본 설정, 용어, 관계도 관리"},
    {"name": "4. 플롯 (Plots)", "description": "이야기 흐름 및 타임라인 기획"},
    {"name": "5. 집필·회차 (Episodes)", "description": "원고 작성 및 자동 저장"},
    {"name": "6. Creative Zone (AI Assistants)", "description": "이어쓰기, 설정검색 등 작문 보조 기능을 한데 모은 크리에이티브 존"},
]

app = FastAPI(
    title="gleey: Core API",
    description="gleey의 백엔드 API 서버입니다.",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    openapi_tags=tags_metadata  # 여기서 순서가 결정됩니다!
)
app.include_router(projects.router,   prefix="/api/projects")
app.include_router(characters.router, prefix="/api")
app.include_router(worldviews.router, prefix="/api")
app.include_router(plots.router,      prefix="/api")
app.include_router(episodes.router,   prefix="/api")
app.include_router(ai.router,         prefix="/api")

@app.on_event("startup")
def _startup_init_db() -> None:
    """
    Core API 부팅 시 DB 초기화를 시도합니다.
    - pgvector extension
    - 테이블 생성(create_all)

    DB가 아직 준비되지 않은 환경에서도 서버 자체는 올라오게 하고,
    상세 상태는 /api/health 로 확인할 수 있게 합니다.
    """
    global DB_INIT_ERROR
    try:
        # pgvector extension 활성화 (vector 타입 사용 전에 반드시 실행해야 함)
        with engine.connect() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            conn.commit()

        Base.metadata.create_all(bind=engine)  # 등록된 모든 테이블을 DB에 생성
        DB_INIT_ERROR = None
    except Exception as exc:  # noqa: BLE001
        DB_INIT_ERROR = f"{type(exc).__name__}: {exc}"


@app.get("/api/health", tags=["_meta"])
def health_check():
    checks: dict[str, str] = {}
    status = "ok"

    if DB_INIT_ERROR:
        checks["db_init"] = DB_INIT_ERROR
        status = "degraded"

    # DB connection check + projects table probe (helps debug /api/projects 500s)
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            checks["db_select_1"] = "ok"
            try:
                conn.execute(text("SELECT 1 FROM projects LIMIT 1"))
                checks["projects_table"] = "ok"
            except Exception as exc:  # noqa: BLE001
                checks["projects_table"] = f"{type(exc).__name__}: {exc}"
                status = "degraded"
    except Exception as exc:  # noqa: BLE001
        checks["db_select_1"] = f"{type(exc).__name__}: {exc}"
        status = "degraded"

    if not settings.CORE_DEBUG:
        # Avoid leaking internal details unless explicitly enabled.
        checks = {k: ("ok" if v == "ok" else "error") for k, v in checks.items()}

    return {"status": status, "checks": checks}


@app.exception_handler(RequestValidationError)
async def request_validation_exception_handler(request: Request, exc: RequestValidationError):
    content: dict[str, object] = {"success": False, "message": "요청 형식이 올바르지 않습니다."}
    if settings.CORE_DEBUG:
        content["detail"] = exc.errors()
    return JSONResponse(status_code=422, content=content)


@app.exception_handler(ResponseValidationError)
async def response_validation_exception_handler(request: Request, exc: ResponseValidationError):
    content: dict[str, object] = {"success": False, "message": "응답 직렬화에 실패했습니다."}
    if settings.CORE_DEBUG:
        content["detail"] = exc.errors()
    return JSONResponse(status_code=500, content=content)


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    content: dict[str, object] = {"success": False, "message": "DB 처리 중 오류가 발생했습니다."}
    if settings.CORE_DEBUG:
        content["detail"] = f"{type(exc).__name__}: {exc}"
    return JSONResponse(status_code=500, content=content)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    content: dict[str, object] = {"success": False, "message": "Internal Server Error"}
    if settings.CORE_DEBUG:
        content["detail"] = f"{type(exc).__name__}: {exc}"
        content["trace"] = traceback.format_exc().splitlines()[-30:]
    return JSONResponse(status_code=500, content=content)

@app.get("/")
def read_root():
    return {"message": "gleey Core API 서버가 정상 작동 중입니다."}
