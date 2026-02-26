# app/api/v1/ai.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Any, Dict

from app.api import deps
from app.models.episode import Episode, EpisodeEmbedding
from app.services.ai_client import ai_client
from app.schemas.ai import (
    SynonymRequest, SynonymResponse,
    AutocompleteRequest, AutocompleteResponse,
    StyleTransformRequest, StyleTransformResponse,
    AskRequest, AskResponse
)

router = APIRouter()


def _raise_ai_error(response: Dict[str, Any]) -> None:
    error_info = response.get("error", {}) if isinstance(response, dict) else {}
    error_code = error_info.get("code", "INTERNAL_ERROR")
    error_msg = error_info.get("message", "AI 처리 중 오류가 발생했습니다.")
    status_map = {
        "INVALID_REQUEST": 400,
        "CONTEXT_TOO_SHORT": 422,
        "GEMINI_ERROR": 502,
        "AI_PROVIDER_ERROR": 502,
        "GEMINI_TIMEOUT": 504,
        "INTERNAL_ERROR": 500,
    }
    raise HTTPException(status_code=status_map.get(error_code, 500), detail=error_msg)


def _get_episode_content(db: Session, episode_id: UUID):
    """DB에서 회차 본문(블록 배열)을 가져옵니다."""
    episode = db.query(Episode).filter(Episode.id == episode_id).first()
    if not episode:
        raise HTTPException(status_code=404, detail="회차를 찾을 수 없습니다.")
    return episode.content or []


def _format_block_for_ai(block: dict):
    """DB의 블록 형태를 AI 명세서가 요구하는 {block_id, text} 형태로 깔끔하게 정제합니다."""
    return {
        "block_id": block.get("id", block.get("block_id", "")), # id가 없으면 block_id 시도
        "text": block.get("text", "")
    }


def _find_block_with_context(content: list, target_id: str, before: int = 0, after: int = 0):
    """
    본문 블록 배열에서 특정 ID를 찾고, 앞뒤 문맥까지 포함하여 반환합니다.
    """
    target_idx = -1
    for i, block in enumerate(content):
        if block.get("id") == target_id or block.get("block_id") == target_id:
            target_idx = i
            break
    
    if target_idx == -1:
        raise HTTPException(status_code=404, detail=f"블록 ID '{target_id}'를 찾을 수 없습니다.")

    start = max(0, target_idx - before)
    end = min(len(content), target_idx + after + 1)
    
    # 🌟 정제 함수(_format_block_for_ai)를 태워서 반환
    return {
        "before": [_format_block_for_ai(b) for b in content[start:target_idx]],
        "target": _format_block_for_ai(content[target_idx]),
        "after": [_format_block_for_ai(b) for b in content[target_idx + 1:end]]
    }


@router.post("/episodes/{episodeId}/ai/synonyms", response_model=SynonymResponse, tags=["6. Creative Zone (AI Assistants)"])
async def get_ai_synonyms(episodeId: UUID, req: SynonymRequest, db: Session = Depends(deps.get_db)):
    """
    AI 도우미: 단어 찾기 (문맥 기반 대체어 추천)
    """
    # 1. DB에서 문맥 조회
    content = _get_episode_content(db, episodeId)
    ctx = _find_block_with_context(content, req.block_id, before=1, after=1)
    
    # 2. AI 서비스 호출 데이터 준비 (docs/ai_api.md 형식)
    ai_payload = {
        "selected_word": req.selected_word,
        "context": {
            "target_block": ctx["target"],
            "surrounding_blocks": ctx["before"] + ctx["after"]
        },
        "recommend_count": 3
    }
    
    # 3. AI 서비스 호출
    response = await ai_client.post_internal(f"/internal/episodes/{episodeId}/ai/synonyms", ai_payload)
    
    # 🌟 수정됨: 에러 처리 고도화
    if response is None:
        raise HTTPException(status_code=502, detail="AI 서비스와 연결할 수 없습니다.")
    
    if not response.get("success"):
        _raise_ai_error(response)

    return response


@router.post("/episodes/{episodeId}/ai/autocomplete", response_model=AutocompleteResponse, tags=["6. Creative Zone (AI Assistants)"])
async def get_ai_autocomplete(episodeId: UUID, req: AutocompleteRequest, db: Session = Depends(deps.get_db)):
    """
    AI 도우미: 이어쓰기 (현재 커서 블록 기반)
    """
    # 1. DB에서 문맥 조회 (앞 5개, 뒤 2개 블록)
    content = _get_episode_content(db, episodeId)
    ctx = _find_block_with_context(content, req.cursor_block_id, before=5, after=2)

    # 2. AI 서비스 호출 데이터 준비
    ai_payload = {
        "context": {
            "before_blocks": ctx["before"],
            "cursor_block": ctx["target"],
            "after_blocks": ctx["after"]
        },
        "generate_count": 2
    }

    # 3. AI 서비스 호출
    response = await ai_client.post_internal(f"/internal/episodes/{episodeId}/ai/autocomplete", ai_payload)
    
    # 🌟 수정됨: 에러 처리 고도화
    if response is None:
        raise HTTPException(status_code=502, detail="AI 서비스와 연결할 수 없습니다.")
    
    if not response.get("success"):
        _raise_ai_error(response)

    return response


@router.post("/episodes/{episodeId}/ai/transform-style", response_model=StyleTransformResponse, tags=["6. Creative Zone (AI Assistants)"])
async def transform_ai_style(episodeId: UUID, req: StyleTransformRequest, db: Session = Depends(deps.get_db)):
    """
    AI 도우미: 문체 변환 (선택된 단일 문단 스타일 변경)
    """
    # 1. DB에서 문단 조회
    content = _get_episode_content(db, episodeId)
    ctx = _find_block_with_context(content, req.block_id) # 0 before, 0 after

    # 2. AI 서비스 호출 데이터 준비
    ai_payload = {
        "target_block": ctx["target"],
        "style_tag": req.style_tag
    }
    
    # 3. AI 서비스 호출
    response = await ai_client.post_internal(f"/internal/episodes/{episodeId}/ai/transform-style", ai_payload)
    
    # 🌟 수정됨: 에러 처리 고도화
    if response is None:
        raise HTTPException(status_code=502, detail="AI 서비스와 연결할 수 없습니다.")
    
    if not response.get("success"):
        _raise_ai_error(response)

    return response


@router.post("/projects/{projectId}/ai/ask", response_model=AskResponse, tags=["6. Creative Zone (AI Assistants)"])
async def ask_ai_question(projectId: UUID, req: AskRequest, db: Session = Depends(deps.get_db)):
    """
    AI 도우미: 설정 검색 (현재 회차 기반 자유 Q&A)
    """
    # 1. 프로젝트에 속한 모든 회차 ID 조회
    episodes = db.query(Episode).filter(Episode.project_id == projectId).all()
    episode_map = {e.id: e.title for e in episodes}
    episode_ids = list(episode_map.keys())

    if not episode_ids:
        return {
            "success": True,
            "data": {
                "answer": "아직 작성된 회차가 없어 내용을 검색할 수 없습니다. 글을 먼저 작성해 주세요!",
                "references": []
            }
        }

    # 2. Vector DB(episode_embeddings)에서 유사 문맥 검색
    # TODO: 실제 질문(req.question)을 임베딩하여 pgvector cosine_distance로 검색하는 로직 필요
    # 우선은 프로젝트 내의 임베딩 데이터 3개를 가져오는 구조로 구현합니다.
    embeddings = db.query(EpisodeEmbedding).filter(
        EpisodeEmbedding.episode_id.in_(episode_ids)
    ).limit(3).all()

    retrieved_contexts = []
    for emb in embeddings:
        retrieved_contexts.append({
            "episode_id": str(emb.episode_id),
            "episode_title": episode_map.get(emb.episode_id, "알 수 없는 회차"),
            "block_id": emb.block_id,
            "text": emb.chunk_text
        })

    # 3. AI 서비스 호출 데이터 준비
    ai_payload = {
        "question": req.question,
        "retrieved_contexts": retrieved_contexts
    }

    # 4. AI 서비스 호출
    response = await ai_client.post_internal(f"/internal/projects/{projectId}/ai/ask", ai_payload)
    
    # 🌟 수정됨: 에러 처리 고도화
    if response is None:
        raise HTTPException(status_code=502, detail="AI 서비스와 연결할 수 없습니다.")
    
    if not response.get("success"):
        _raise_ai_error(response)

    return response
