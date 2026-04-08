from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.auth import get_current_user
import uuid
import os
# ⭕️ 다음과 같이 수정 (같은 폴더에 있으므로 상대 경로나 라우터 경로 사용)
from app.routers.photos import delete_from_cloudflare

router = APIRouter(prefix="/projects", tags=["projects"])

class ProjectCreate(BaseModel):
    title: str
    title_en: Optional[str] = None
    description: Optional[str] = None
    description_en: Optional[str] = None
    status: Optional[str] = "in_progress"
    location: Optional[str] = None
    shot_date: Optional[datetime] = None
    is_public: Optional[str] = "false"
    cover_image_url: Optional[str] = None

class ProjectResponse(BaseModel):
    id: str
    title: str
    title_en: Optional[str]
    description: Optional[str]
    description_en: Optional[str]
    status: models.ProjectStatus
    cover_image_url: Optional[str]
    location: Optional[str]
    shot_date: Optional[datetime]
    is_public: str
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# GET /projects/
@router.get("/", response_model=list[ProjectResponse])
def get_projects(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.Project).filter(
        models.Project.user_id == current_user.id,
        models.Project.deleted_at == None
    ).order_by(models.Project.created_at.desc()).all()

# GET /projects/trash
@router.get("/trash", response_model=list[ProjectResponse])
def get_trash(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.Project).filter(
        models.Project.user_id == current_user.id,
        models.Project.deleted_at != None
    ).order_by(models.Project.deleted_at.desc()).all()

# POST /projects/
@router.post("/", response_model=ProjectResponse)
def create_project(
    project: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
        # 프로젝트 생성 제한 체크
    project_count = db.query(models.Project).filter(
        models.Project.user_id == current_user.id,
        models.Project.deleted_at == None
    ).count()
    
    if project_count >= current_user.project_limit:
        raise HTTPException(
            status_code=403,
            detail={"code": "PROJECT_LIMIT_EXCEEDED", "limit": current_user.project_limit}
        )
    
    db_project = models.Project(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        title=project.title,
        title_en=project.title_en,
        description=project.description,
        description_en=project.description_en,
        status=models.ProjectStatus(project.status),
        location=project.location,
        shot_date=project.shot_date,
        is_public=project.is_public
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

# GET /projects/{project_id}
@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.user_id == current_user.id,
        models.Project.deleted_at == None
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="PROJECT_NOT_FOUND")
    return project

# PUT /projects/{project_id}
@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: str,
    project: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.user_id == current_user.id,
        models.Project.deleted_at == None
    ).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="PROJECT_NOT_FOUND")
    for key, value in project.dict(exclude_unset=True).items():
        if key == "status":
            setattr(db_project, key, models.ProjectStatus(value))
        else:
            setattr(db_project, key, value)
    db.commit()
    db.refresh(db_project)
    return db_project

# DELETE /projects/{project_id}
@router.delete("/{project_id}")
def delete_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.user_id == current_user.id,
        models.Project.deleted_at == None
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="PROJECT_NOT_FOUND")
    project.deleted_at = datetime.utcnow()
    db.commit()
    return {"message": "MOVED_TO_TRASH"}

# POST /projects/{project_id}/restore
@router.post("/{project_id}/restore", response_model=ProjectResponse)
def restore_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
        # 💡 복구 전 제한 체크 추가
    project_count = db.query(models.Project).filter(
        models.Project.user_id == current_user.id,
        models.Project.deleted_at == None
    ).count()
    if project_count >= current_user.project_limit:
        raise HTTPException(
            status_code=403,
            detail={"code": "PROJECT_LIMIT_EXCEEDED", "limit": current_user.project_limit}
        )
    
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.user_id == current_user.id,
        models.Project.deleted_at != None
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="PROJECT_NOT_FOUND")
    project.deleted_at = None
    db.commit()
    db.refresh(project)
    return project

# DELETE /projects/{project_id}/permanent
@router.delete("/{project_id}/permanent")
def permanent_delete(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.user_id == current_user.id,
        models.Project.deleted_at != None
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="PROJECT_NOT_FOUND")
    
    # --- 🚨 외래키 충돌 방지를 위해 자식 데이터들을 명시적으로 먼저 삭제합니다 ---
    # 1. 챕터-사진 매핑 데이터(ChapterPhoto) 먼저 삭제
    chapters = db.query(models.Chapter).filter(models.Chapter.project_id == project_id).all()
    chapter_ids = [c.id for c in chapters]
    if chapter_ids:
        db.query(models.ChapterPhoto).filter(models.ChapterPhoto.chapter_id.in_(chapter_ids)).delete(synchronize_session=False)
        
    # 2. 챕터(Chapter) 본체 삭제
    db.query(models.Chapter).filter(models.Chapter.project_id == project_id).delete(synchronize_session=False)

    # 3. 납품 링크의 사진 선택 데이터(DeliverySelection) 삭제
    links = db.query(models.DeliveryLink).filter(models.DeliveryLink.project_id == project_id).all()
    link_ids = [l.id for l in links]
    if link_ids:
        db.query(models.DeliverySelection).filter(models.DeliverySelection.link_id.in_(link_ids)).delete(synchronize_session=False)

    # 4. 납품 링크(DeliveryLink) 본체 삭제
    db.query(models.DeliveryLink).filter(models.DeliveryLink.project_id == project_id).delete(synchronize_session=False)

    # 5. [수정됨] 사진 파일 실제 삭제 (클라우드플레어 및 로컬)
    photos = db.query(models.Photo).filter(models.Photo.project_id == project_id).all()
    for photo in photos:
        try:
            if photo.image_url and "imagedelivery.net" in photo.image_url:
                delete_from_cloudflare(photo.image_url)
            else:
                file_path = photo.image_url.split('/uploads/')[-1]
                full_path = f"app/uploads/{file_path}"
                if os.path.exists(full_path):
                    os.remove(full_path)
        except Exception as e:
            print(f"프로젝트 삭제 중 이미지 삭제 오류: {e}")
            pass

    # 6. 기타 자식 데이터들(Note, Pitch, Photo DB) 삭제
    db.query(models.Note).filter(models.Note.project_id == project_id).delete(synchronize_session=False)
    db.query(models.Pitch).filter(models.Pitch.project_id == project_id).delete(synchronize_session=False)
    db.query(models.Photo).filter(models.Photo.project_id == project_id).delete(synchronize_session=False)

    # 7. 모든 자식이 청소되었으므로, 최종적으로 프로젝트 본체 삭제
    db.delete(project)
    db.commit()
    
    return {"message": "PERMANENTLY_DELETED"}