# app/api/v1/worldviews.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from app.api import deps
from app.models.project import Project
from app.models.worldview import Worldview, WorldviewTerm, WorldviewRelationship, WorldviewEntry  # ✅ 클래스명 수정
from app.schemas.worldview import (
    WorldviewCreate, WorldviewSingleResponse, WorldviewListResponse,
    RelationshipCreate, RelationshipSingleResponse, RelationshipDetailResponse,
    TermCreate, TermSingleResponse, TermListResponse,
    EntryCreate, EntrySingleResponse, EntryListResponse,
)
from app.models.character import Character

router = APIRouter()


# ---------------------------------------------------------
# 1. 세계관 카드 목록 조회 (GET)
# ---------------------------------------------------------
@router.get("/projects/{projectId}/worldviews", response_model=WorldviewListResponse, tags=["3. 세계관 (Worldviews)", "6. Creative Zone (AI Assistants)"])
def get_worldviews(projectId: UUID, is_synced: bool | None = None, db: Session = Depends(deps.get_db)):
    """
    세계관 카드 목록 불러오기 (쿼리: ?is_synced=true 지원)
    """
    query = db.query(Worldview).filter(Worldview.project_id == projectId)
    if is_synced is not None:
        query = query.filter(Worldview.is_synced == is_synced)  # ✅ is_synced 필터 적용
    worldviews = query.all()
    return {"success": True, "data": worldviews}


# ---------------------------------------------------------
# 2. 세계관 카드 생성 (POST)
# ---------------------------------------------------------
@router.post("/projects/{projectId}/worldviews", response_model=WorldviewSingleResponse, tags=["3. 세계관 (Worldviews)"])
def create_worldview(projectId: UUID, worldview_in: WorldviewCreate, db: Session = Depends(deps.get_db)):
    """
    새 세계관 카드(카테고리) 생성하기
    """
    project = db.query(Project).filter(Project.id == projectId).first()
    if not project:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다.")

    new_worldview = Worldview(
        project_id=projectId,
        name=worldview_in.name,
        description=worldview_in.description,
        type=worldview_in.type,
        is_synced=worldview_in.is_synced,              # ✅ is_synced 저장
    )
    db.add(new_worldview)
    db.commit()
    db.refresh(new_worldview)

    return {"success": True, "data": new_worldview}


# ---------------------------------------------------------
# 3. 용어 생성 (POST)
# ---------------------------------------------------------
@router.post("/worldviews/{worldviewId}/terms", response_model=TermSingleResponse, tags=["3. 세계관 (Worldviews)"])
def create_term(worldviewId: UUID, term_in: TermCreate, db: Session = Depends(deps.get_db)):
    """
    세계관 용어(Term) 추가하기
    """
    new_term = WorldviewTerm(                          # ✅ Term → WorldviewTerm
        worldview_id=worldviewId,
        term=term_in.term,
        meaning=term_in.meaning,
    )
    db.add(new_term)
    db.commit()
    db.refresh(new_term)
    return {"success": True, "data": new_term}


# ---------------------------------------------------------
# 4. 인물 관계 생성 (POST)
# ---------------------------------------------------------
@router.post("/worldviews/{worldviewId}/relationships", response_model=RelationshipSingleResponse, tags=["3. 세계관 (Worldviews)"])
def create_relationship(worldviewId: UUID, rel_in: RelationshipCreate, db: Session = Depends(deps.get_db)):
    """
    세계관 인물 관계성 추가하기
    """
    new_rel = WorldviewRelationship(                   # ✅ Relationship → WorldviewRelationship
        worldview_id=worldviewId,
        base_character_id=rel_in.base_character_id,
        target_character_id=rel_in.target_character_id,
        relation_type=rel_in.relation_type,
        color=rel_in.color,                            # ✅ line_color → color
    )
    db.add(new_rel)
    db.commit()
    db.refresh(new_rel)
    return {"success": True, "data": new_rel}


# ---------------------------------------------------------
# 5. 커스텀 항목(에디터 본문) 생성 (POST) — 신규 추가
# ---------------------------------------------------------
@router.post("/worldviews/{worldviewId}/entries", response_model=EntrySingleResponse, tags=["3. 세계관 (Worldviews)"])
def create_entry(worldviewId: UUID, entry_in: EntryCreate, db: Session = Depends(deps.get_db)):
    """
    세계관 커스텀 설정(에디터 본문) 추가하기
    """
    new_entry = WorldviewEntry(
        worldview_id=worldviewId,
        title=entry_in.title,
        content=entry_in.content,
    )
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    return {"success": True, "data": new_entry}


# ---------------------------------------------------------
# 6. 용어 리스트 조회 (GET) — 크리에이티브 존
# ---------------------------------------------------------
@router.get("/worldviews/{worldviewId}/terms", response_model=TermListResponse, tags=["6. Creative Zone (AI Assistants)"])
def get_terms(worldviewId: UUID, db: Session = Depends(deps.get_db)):
    """
    세계관 카드의 용어 리스트 불러오기
    """
    terms = db.query(WorldviewTerm).filter(WorldviewTerm.worldview_id == worldviewId).all()
    return {"success": True, "data": terms}


# ---------------------------------------------------------
# 7. 인물 중심 관계도 조회 (GET) — 크리에이티브 존
# ---------------------------------------------------------
@router.get("/worldviews/{worldviewId}/relationships", response_model=RelationshipDetailResponse, tags=["6. Creative Zone (AI Assistants)"])
def get_relationships(worldviewId: UUID, character_id: UUID, db: Session = Depends(deps.get_db)):
    """
    특정 인물을 중심으로 한 관계성 데이터 불러오기
    """
    # 1. 중심 인물 정보 확인
    base_char = db.query(Character).filter(Character.id == character_id).first()
    if not base_char:
        raise HTTPException(status_code=404, detail="캐릭터를 찾을 수 없습니다.")

    # 2. 해당 인물이 base이거나 target인 모든 관계 조회
    rels = db.query(WorldviewRelationship).filter(
        WorldviewRelationship.worldview_id == worldviewId,
        (WorldviewRelationship.base_character_id == character_id) | 
        (WorldviewRelationship.target_character_id == character_id)
    ).all()

    connections = []
    for rel in rels:
        # 상대방 캐릭터 ID 결정
        is_base = rel.base_character_id == character_id
        other_char_id = rel.target_character_id if is_base else rel.base_character_id
        
        other_char = db.query(Character).filter(Character.id == other_char_id).first()
        if other_char:
            connections.append({
                "id": rel.id,
                "target_character_id": other_char.id,
                "target_character_name": other_char.name,
                "image_url": other_char.image_url,
                "relation_type": rel.relation_type,
                "color": rel.color
            })

    return {
        "success": True,
        "data": {
            "base_character": base_char,
            "connections": connections
        }
    }