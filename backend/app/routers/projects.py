from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

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

@router.get("/", response_model=list[ProjectResponse])
def get_projects(db: Session = Depends(get_db)):
    return db.query(models.Project).filter(
        models.Project.deleted_at == None
    ).order_by(models.Project.created_at.desc()).all()

@router.get("/trash", response_model=list[ProjectResponse])
def get_trash(db: Session = Depends(get_db)):
    return db.query(models.Project).filter(
        models.Project.deleted_at != None
    ).order_by(models.Project.deleted_at.desc()).all()

@router.post("/", response_model=ProjectResponse)
def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    db_project = models.Project(
        id=str(uuid.uuid4()),
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

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.deleted_at == None
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다")
    return project

@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: str, project: ProjectCreate, db: Session = Depends(get_db)):
    db_project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.deleted_at == None
    ).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다")
    for key, value in project.dict(exclude_unset=True).items():
        if key == "status":
            setattr(db_project, key, models.ProjectStatus(value))
        else:
            setattr(db_project, key, value)
    db.commit()
    db.refresh(db_project)
    return db_project

@router.delete("/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.deleted_at == None
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다")
    project.deleted_at = datetime.utcnow()
    db.commit()
    return {"message": "휴지통으로 이동했습니다"}

@router.post("/{project_id}/restore", response_model=ProjectResponse)
def restore_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.deleted_at != None
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다")
    project.deleted_at = None
    db.commit()
    db.refresh(project)
    return project

@router.delete("/{project_id}/permanent")
def permanent_delete(project_id: str, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.deleted_at != None
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다")
    db.delete(project)
    db.commit()
    return {"message": "영구 삭제되었습니다"}