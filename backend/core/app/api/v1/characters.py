from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from app.api import deps
from app.models.project import Project
from app.models.character import Character
from app.schemas.character import CharacterCreate, CharacterUpdate, CharacterSingleResponse, CharacterListResponse
from sqlalchemy.sql import func # 삭제 기능에 쓸 시간 함수

# 주의: 주소가 두 종류라서 prefix를 라우터 안에서 직접 지정합니다.
router = APIRouter()

# ---------------------------------------------------------
# 1. 특정 소설에 새 캐릭터 생성 (POST)
# ---------------------------------------------------------
@router.post("/projects/{projectId}/characters", response_model=CharacterSingleResponse, tags=["2. 캐릭터 (Characters)"])
def create_character(projectId: UUID, character_in: CharacterCreate, db: Session = Depends(deps.get_db)):
    """
    새 캐릭터 기획하기
    """
    # 1. 이 소설(Project)이 진짜로 DB에 존재하는지 확인
    project = db.query(Project).filter(Project.id == projectId).first()
    if not project:
        raise HTTPException(status_code=404, detail="해당 프로젝트(시리즈)를 찾을 수 없습니다.")

    # 2. 프론트가 보낸 데이터로 새 캐릭터 객체 만들기 (project_id 연결!)
    new_character = Character(
        project_id=projectId,
        name=character_in.name,
        image_url=character_in.image_url,
        job=character_in.job,
        personality=character_in.personality,
        description=character_in.description,
        is_synced=character_in.is_synced
    )
    
    # 3. DB에 저장!
    db.add(new_character)
    db.commit()
    db.refresh(new_character)
    
    return {
        "success": True,
        "message": f"'{new_character.name}' 캐릭터가 성공적으로 생성되었습니다.",
        "data": new_character
    }

# ---------------------------------------------------------
# 2. 특정 소설의 캐릭터 목록 조회 (GET)
# ---------------------------------------------------------
@router.get("/projects/{projectId}/characters", response_model=CharacterListResponse, tags=["2. 캐릭터 (Characters)", "6. Creative Zone (AI Assistants)"])
def get_characters(projectId: UUID, db: Session = Depends(deps.get_db)):
    """
    캐릭터 목록 불러오기(기획실 & 집필실 공통)
    """
    # 삭제되지 않은(deleted_at == None) 캐릭터만 최신순으로 가져오기
    characters = db.query(Character)\
        .filter(Character.project_id == projectId, Character.deleted_at == None)\
        .order_by(Character.created_at.desc())\
        .all()
    
    return {
        "success": True,
        "data": characters,
        "total_count": len(characters)
    }

# ---------------------------------------------------------
# 3. 캐릭터 정보 수정 (PATCH)
# ---------------------------------------------------------
@router.patch("/characters/{characterId}", response_model=CharacterSingleResponse, tags=["2. 캐릭터 (Characters)"])
def update_character(characterId: UUID, character_in: CharacterUpdate, db: Session = Depends(deps.get_db)):
    """
    기존 캐릭터 정보 수정
    """
    # 1. DB에서 해당 캐릭터 찾기 (삭제된 캐릭터는 제외)
    character = db.query(Character).filter(Character.id == characterId, Character.deleted_at == None).first()
    if not character:
        raise HTTPException(status_code=404, detail="캐릭터를 찾을 수 없거나 이미 삭제되었습니다.")

    # 2. 프론트가 보낸 '수정할 데이터'만 쏙쏙 골라서 덮어쓰기 (exclude_unset=True가 핵심!)
    update_data = character_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(character, key, value)

    # 3. DB에 저장 도장 쾅!
    db.commit()
    db.refresh(character)

    return {
        "success": True,
        "message": f"'{character.name}' 캐릭터 정보가 수정되었습니다.",
        "data": character
    }

# ---------------------------------------------------------
# 4. 캐릭터 삭제 (DELETE - Soft Delete)
# ---------------------------------------------------------
@router.delete("/characters/{characterId}", tags=["2. 캐릭터 (Characters)"])
def delete_character(characterId: UUID, db: Session = Depends(deps.get_db)):
    """
    캐릭터 삭제하기
    """
    # 1. DB에서 캐릭터 찾기
    character = db.query(Character).filter(Character.id == characterId, Character.deleted_at == None).first()
    if not character:
        raise HTTPException(status_code=404, detail="캐릭터를 찾을 수 없거나 이미 삭제되었습니다.")

    # 2. 진짜로 DB에서 삭제하는 게 아니라, 삭제된 '시간'만 기록 (이게 바로 Soft Delete!)
    character.deleted_at = func.now()

    # 3. DB 저장
    db.commit()

    return {
        "success": True,
        "message": "캐릭터가 성공적으로 삭제되었습니다."
    }