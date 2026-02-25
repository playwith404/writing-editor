# app/api/v1/ai.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from uuid import UUID
import uuid

from app.api import deps
from app.schemas.ai import (
    SynonymRequest, SynonymResponse,
    AutocompleteRequest, AutocompleteResponse,
    StyleTransformRequest, StyleTransformResponse,
    AskRequest, AskResponse
)

router = APIRouter()


@router.post("/episodes/{episodeId}/ai/synonyms", response_model=SynonymResponse, tags=["6. Creative Zone (AI Assistants)"])
def get_ai_synonyms(episodeId: UUID, req: SynonymRequest, db: Session = Depends(deps.get_db)):
    """
    AI 도우미: 단어 찾기 (문맥 기반 대체어 추천)
    """
    # TODO: AI 서비스 연동 (httpx 호출 등)
    # 현재는 API 명세서의 목업 데이터를 반환합니다.
    return {
        "success": True,
        "data": {
            "recommendations": [
                {"word": "적막하다", "description": "\"아무런 소리도 없이 고요하고 쓸쓸하다.\""},
                {"word": "공허하다", "description": "\"속이 텅 비어 아무것도 없다.\""}
            ]
        }
    }


@router.post("/episodes/{episodeId}/ai/autocomplete", response_model=AutocompleteResponse, tags=["6. Creative Zone (AI Assistants)"])
def get_ai_autocomplete(episodeId: UUID, req: AutocompleteRequest, db: Session = Depends(deps.get_db)):
    """
    AI 도우미: 이어쓰기 (현재 커서 블록 기반)
    """
    # TODO: AI 서비스 연동
    return {
        "success": True,
        "data": {
            "generated_blocks": [
                {"type": "paragraph", "text": "그 순간, 붉은 눈동자가 허공을 갈랐다."},
                {"type": "paragraph", "text": "하지만 연우의 검이 더 빨랐다. 지팡이를 내던진 연우는 허리춤의 단검을 뽑아 들고, 짐승처럼 도약해 그림자의 심장부를 향해 망설임 없이 검기를 꽂아 넣었다."}
            ]
        }
    }


@router.post("/episodes/{episodeId}/ai/transform-style", response_model=StyleTransformResponse, tags=["6. Creative Zone (AI Assistants)"])
def transform_ai_style(episodeId: UUID, req: StyleTransformRequest, db: Session = Depends(deps.get_db)):
    """
    AI 도우미: 문체 변환 (선택된 단일 문단 스타일 변경)
    """
    # TODO: AI 서비스 연동
    return {
        "success": True,
        "data": {
            "transformed_blocks": [
                {
                    "type": "paragraph",
                    "text": "\"그건 아마도 내가 잊고 싶었던 과거의 조각이었을 것이다. 빗줄기는 점점 거세졌고...\""
                }
            ]
        }
    }


@router.post("/projects/{projectId}/ai/ask", response_model=AskResponse, tags=["6. Creative Zone (AI Assistants)"])
def ask_ai_question(projectId: UUID, req: AskRequest, db: Session = Depends(deps.get_db)):
    """
    AI 도우미: 설정 검색 (현재 회차 기반 자유 Q&A)
    """
    # TODO: RAG(Vector Search) 연동
    return {
        "success": True,
        "data": {
            "answer": "1장 '비 내리는 숲'에서 주인공이 사용했던 화염 마법의 이름은 **'헬파이어(Hellfire)'**입니다. 당시 고블린 무리를 퇴치할 때 사용했습니다.",
            "references": [
                {
                    "episode_id": uuid.uuid4(), # 실제로는 검색된 회차의 ID
                    "title": "1장. 비 내리는 숲",
                    "matched_text": "...주인공은 입술을 깨물며 금지된 마법, '헬파이어'를 영창했다..."
                }
            ]
        }
    }
