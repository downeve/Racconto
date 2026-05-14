from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.auth import get_current_user_id
from app import models

router = APIRouter(prefix="/folder-links", tags=["folder_links"])

class FolderLinkCreate(BaseModel):
    project_id: str
    folder_path: str

class FolderLinkDelete(BaseModel):
    folder_path: str

# POST /folder-links/ — 폴더 연결 등록
@router.post("/")
def link_folder(
    body: FolderLinkCreate,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    # 이미 있으면 중복 추가 방지
    existing = db.query(models.FolderLink).filter(
        models.FolderLink.user_id == current_user_id,
        models.FolderLink.project_id == body.project_id,
        models.FolderLink.folder_path == body.folder_path,
    ).first()
    if existing:
        return {"ok": True}
    link = models.FolderLink(
        user_id=current_user_id,
        project_id=body.project_id,
        folder_path=body.folder_path,
    )
    db.add(link)
    db.commit()
    return {"ok": True}

# DELETE /folder-links/ — 폴더 경로로 연결 해제
@router.delete("/")
def unlink_folder(
    body: FolderLinkDelete,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    db.query(models.FolderLink).filter(
        models.FolderLink.user_id == current_user_id,
        models.FolderLink.folder_path == body.folder_path,
    ).delete()
    db.commit()
    return {"ok": True}

# DELETE /folder-links/by-project/{project_id} — 프로젝트 전체 연결 해제
@router.delete("/by-project/{project_id}")
def unlink_all_by_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    db.query(models.FolderLink).filter(
        models.FolderLink.user_id == current_user_id,
        models.FolderLink.project_id == project_id,
    ).delete()
    db.commit()
    return {"ok": True}
