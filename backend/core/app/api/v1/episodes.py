# app/api/v1/episodes.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from uuid import UUID
from datetime import datetime

from app.api import deps
from app.models.project import Project
from app.models.episode import Episode
from app.schemas.episode import (
    EpisodeCreate, EpisodeUpdate,
    EpisodeSingleResponse, EpisodeListResponse, EpisodeSaveResponse,
    EpisodeDetailResponse, EpisodeListItem,
)

router = APIRouter()


# ------------------------------------------------------------------
# 1. 회차 목록 조회 (GET) — 목차용, content 제외
# ------------------------------------------------------------------
@router.get("/projects/{projectId}/episodes", response_model=EpisodeListResponse, tags=["5. 집필·회차 (Episodes)"])
def get_episodes(projectId: UUID, db: Session = Depends(deps.get_db)):
    """
    집필실 목차(회차 리스트) 조회 — 본문(content) 없이 상태·글자수만 반환
    """
    episodes = db.query(Episode)\
        .filter(Episode.project_id == projectId)\
        .order_by(Episode.order_index.asc())\
        .all()
    return {"success": True, "data": episodes}


# ------------------------------------------------------------------
# 2. 새 회차 생성 (POST)
# ------------------------------------------------------------------
@router.post("/projects/{projectId}/episodes", response_model=EpisodeSingleResponse, tags=["5. 집필·회차 (Episodes)"])
def create_episode(projectId: UUID, episode_in: EpisodeCreate, db: Session = Depends(deps.get_db)):
    """
    새 회차(빈 원고지) 생성
    """
    project = db.query(Project).filter(Project.id == projectId).first()
    if not project:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다.")

    new_episode = Episode(
        project_id=projectId,
        title=episode_in.title,
        order_index=episode_in.order_index,
        content=[],            # 빈 본문
        status="TODO",
    )
    db.add(new_episode)
    db.commit()
    db.refresh(new_episode)

    return {
        "success": True,
        "message": f"'{new_episode.title}' 회차가 생성되었습니다.",
        "data": new_episode,
    }


# ------------------------------------------------------------------
# 3. 특정 회차 상세 조회 (GET) — 에디터 오픈용, content 포함
# ------------------------------------------------------------------
@router.get("/episodes/{episodeId}", response_model=EpisodeSingleResponse, tags=["5. 집필·회차 (Episodes)"])
def get_episode(episodeId: UUID, db: Session = Depends(deps.get_db)):
    """
    에디터 열 때 회차 전체 본문 조회
    """
    episode = db.query(Episode).filter(Episode.id == episodeId).first()
    if not episode:
        raise HTTPException(status_code=404, detail="회차를 찾을 수 없습니다.")

    return {"success": True, "message": "조회 성공", "data": episode}


# ------------------------------------------------------------------
# 4. 회차 본문 자동 저장 (PATCH) ⭐
# ------------------------------------------------------------------
@router.patch("/episodes/{episodeId}", response_model=EpisodeSaveResponse, tags=["5. 집필·회차 (Episodes)"])
def save_episode(episodeId: UUID, episode_in: EpisodeUpdate, db: Session = Depends(deps.get_db)):
    """
    ⭐ 에디터 본문 자동 저장 API
    - 변경된 필드(content, status, char_count 등)만 받아서 업데이트
    - 이후 AI 임베딩 파이프라인에서 episode_embeddings 테이블에 저장됨
    """
    episode = db.query(Episode).filter(Episode.id == episodeId).first()
    if not episode:
        raise HTTPException(status_code=404, detail="회차를 찾을 수 없습니다.")

    update_data = episode_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(episode, key, value)

    db.commit()
    db.refresh(episode)

    return {
        "success": True,
        "message": "자동 저장 완료",
        "updated_at": episode.updated_at,
    }


# ------------------------------------------------------------------
# 5. Creative Zone — 세계관 용어 목록 (GET)
# ------------------------------------------------------------------
# 참고: Creative Zone용 조회는 기존 worldviews 라우터의
# GET /worldviews/{worldviewId}/terms, /relationships 엔드포인트를 재사용합니다.
# (별도 구현 불필요 — 라우터 포함 관계 확인 필요)
