from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import uuid

# 우리가 만든 의존성(DB 세션), 모델, 스키마 불러오기
from app.api import deps
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectSingleResponse, ProjectListResponse

router = APIRouter()

# ---------------------------------------------------------
# 1. 새 시리즈(프로젝트) 생성 (POST)
# ---------------------------------------------------------
@router.post("", response_model=ProjectSingleResponse, tags=["1. 시리즈 (Projects)"])
def create_project(project_in: ProjectCreate, db: Session = Depends(deps.get_db)):
    """
    새 시리즈 생성하기
    """
    new_project = Project(
        title=project_in.title,
        user_id=uuid.uuid4()  # 임시 가짜 유저 ID 생성 (나중에 JWT 인증으로 교체)
        )
    
    # 2. DB 창고에 넣고 도장찍기
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    
    # 3. 명세서에 적힌 '포장지' 형식에 맞춰서 응답
    return {
        "success": True,
        "message": "새로운 시리즈가 성공적으로 생성되었습니다.",
        "data": new_project
    }


# ---------------------------------------------------------
# 2. 내 시리즈(프로젝트) 목록 조회 (GET) 
# ---------------------------------------------------------
@router.get("", response_model=ProjectListResponse, tags=["1. 시리즈 (Projects)"])
def get_projects(db: Session = Depends(deps.get_db)):
    """
    내 프로젝트(시리즈) 목록 불러오기
    """
    # 1. DB에서 모든 프로젝트를 꺼내옵니다. (최신순으로 정렬해서 가져오기)
    projects = db.query(Project).order_by(Project.created_at.desc()).all()
    
    # 2. 명세서에 적힌 '포장지' 형식에 맞춰서 응답
    return {
        "success": True,
        "data": projects,
        "total_count": len(projects)
    }