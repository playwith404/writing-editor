# app/api/v1/plots.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from app.api import deps
from app.models.project import Project
from app.models.plot import Plot, PlotCharacter, PlotEpisode
from app.models.character import Character
from app.models.episode import Episode
from app.schemas.plot import PlotCreate, PlotUpdate, PlotSingleResponse, PlotListResponse

router = APIRouter()


def _build_plot_response(plot: Plot, db: Session) -> dict:
    """
    Plot 모델에 linked_characters / linked_episodes 를 붙여서 응답 dict 를 만듭니다.
    PlotCharacter / PlotEpisode 중계 테이블을 조회해 채워 넣습니다.
    """
    char_links = db.query(PlotCharacter).filter(PlotCharacter.plot_id == plot.id).all()
    epi_links  = db.query(PlotEpisode).filter(PlotEpisode.plot_id == plot.id).all()

    linked_characters = []
    for link in char_links:
        char = db.query(Character).filter(Character.id == link.character_id).first()
        if char:
            linked_characters.append({"id": char.id, "name": char.name})

    linked_episodes = []
    for link in epi_links:
        epi = db.query(Episode).filter(Episode.id == link.episode_id).first()
        if epi:
            linked_episodes.append({"id": epi.id, "title": epi.title})

    return {
        **plot.__dict__,
        "linked_characters": linked_characters,
        "linked_episodes": linked_episodes,
    }


# ------------------------------------------------------------------
# 1. 플롯 목록 조회 (GET)
# ------------------------------------------------------------------
@router.get("/projects/{projectId}/plots", response_model=PlotListResponse, tags=["4. 플롯 (Plots)"])
def get_plots(projectId: UUID, db: Session = Depends(deps.get_db)):
    """
    전체 플롯 타임라인 조회 (plot_number 오름차순)
    """
    plots = db.query(Plot)\
        .filter(Plot.project_id == projectId)\
        .order_by(Plot.plot_number.asc())\
        .all()

    return {
        "success": True,
        "data": [_build_plot_response(p, db) for p in plots],
    }


# ------------------------------------------------------------------
# 2. 새 플롯 추가 (POST)
# ------------------------------------------------------------------
@router.post("/projects/{projectId}/plots", response_model=PlotSingleResponse, tags=["4. 플롯 (Plots)"])
def create_plot(projectId: UUID, plot_in: PlotCreate, db: Session = Depends(deps.get_db)):
    """
    새 플롯 추가 및 캐릭터/회차 연결
    """
    project = db.query(Project).filter(Project.id == projectId).first()
    if not project:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다.")

    # 1. 플롯 생성
    new_plot = Plot(
        project_id=projectId,
        plot_number=plot_in.plot_number,
        title=plot_in.title,
        description=plot_in.description,
    )
    db.add(new_plot)
    db.flush()  # id를 얻기 위해 flush

    # 2. 캐릭터 연결
    for char_id in (plot_in.character_ids or []):
        db.add(PlotCharacter(plot_id=new_plot.id, character_id=char_id))

    # 3. 회차 연결
    for epi_id in (plot_in.episode_ids or []):
        db.add(PlotEpisode(plot_id=new_plot.id, episode_id=epi_id))

    db.commit()
    db.refresh(new_plot)

    return {
        "success": True,
        "message": "새로운 플롯이 타임라인에 추가되었습니다.",
        "data": _build_plot_response(new_plot, db),
    }


# ------------------------------------------------------------------
# 3. 플롯 수정 (PATCH)
# ------------------------------------------------------------------
@router.patch("/plots/{plotId}", response_model=PlotSingleResponse, tags=["4. 플롯 (Plots)"])
def update_plot(plotId: UUID, plot_in: PlotUpdate, db: Session = Depends(deps.get_db)):
    """
    플롯 순서(plot_number), 내용, 연결 캐릭터/회차 수정
    """
    plot = db.query(Plot).filter(Plot.id == plotId).first()
    if not plot:
        raise HTTPException(status_code=404, detail="플롯을 찾을 수 없습니다.")

    # 기본 필드 업데이트
    update_data = plot_in.model_dump(exclude_unset=True, exclude={"character_ids", "episode_ids"})
    for key, value in update_data.items():
        setattr(plot, key, value)

    # 캐릭터 연결 교체 (전부 지우고 새로 넣기)
    if plot_in.character_ids is not None:
        db.query(PlotCharacter).filter(PlotCharacter.plot_id == plotId).delete()
        for char_id in plot_in.character_ids:
            db.add(PlotCharacter(plot_id=plotId, character_id=char_id))

    # 회차 연결 교체
    if plot_in.episode_ids is not None:
        db.query(PlotEpisode).filter(PlotEpisode.plot_id == plotId).delete()
        for epi_id in plot_in.episode_ids:
            db.add(PlotEpisode(plot_id=plotId, episode_id=epi_id))

    db.commit()
    db.refresh(plot)

    return {
        "success": True,
        "message": "플롯이 수정되었습니다.",
        "data": _build_plot_response(plot, db),
    }
