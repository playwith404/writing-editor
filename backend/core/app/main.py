from fastapi import FastAPI
from app.api.v1 import projects, characters, worldviews, plots, episodes, ai
from app.db.session import Base, engine

# ⚠️ create_all 전에 모든 모델을 import 해야
# Base.metadata에 테이블이 등록되어 DB에 실제로 생성됩니다.
from app.models import project, character, worldview  # noqa: F401
from app.models import plot, episode                  # noqa: F401

from sqlalchemy import text

# pgvector extension 활성화 (vector 타입 사용 전에 반드시 실행해야 함)
with engine.connect() as conn:
    conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    conn.commit()

Base.metadata.create_all(bind=engine)  # 등록된 모든 테이블을 DB에 생성


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
    openapi_tags=tags_metadata  # 여기서 순서가 결정됩니다!
)
app.include_router(projects.router,   prefix="/api/projects")
app.include_router(characters.router, prefix="/api")
app.include_router(worldviews.router, prefix="/api")
app.include_router(plots.router,      prefix="/api")
app.include_router(episodes.router,   prefix="/api")
app.include_router(ai.router,         prefix="/api")


@app.get("/")
def read_root():
    return {"message": "gleey Core API 서버가 정상 작동 중입니다."}