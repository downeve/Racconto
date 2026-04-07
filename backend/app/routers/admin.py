from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.auth import get_current_user
from pydantic import BaseModel
from typing import Optional
import os

router = APIRouter(prefix="/admin", tags=["admin"])

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "downeve@gmail.com")

def require_admin(current_user: models.User = Depends(get_current_user)):
    if current_user.email != ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="FORBIDDEN")
    return current_user

class UserLimitUpdate(BaseModel):
    project_limit: Optional[int] = None
    photo_limit: Optional[int] = None
    is_verified: Optional[bool] = None

@router.get("/users")
def get_users(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin)
):
    users = db.query(models.User).order_by(models.User.created_at.asc()).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "is_verified": u.is_verified,
            "project_limit": u.project_limit,
            "photo_limit": u.photo_limit,
            "created_at": u.created_at,
            "project_count": db.query(models.Project).filter(
                models.Project.user_id == u.id,
                models.Project.deleted_at == None
            ).count(),
            "photo_count": db.query(models.Photo).filter(
                models.Photo.project_id.in_(
                    db.query(models.Project.id).filter(
                        models.Project.user_id == u.id,
                        models.Project.deleted_at == None
                    )
                ),
                models.Photo.deleted_at == None
            ).count(),
        }
        for u in users
    ]

@router.put("/users/{user_id}")
def update_user(
    user_id: str,
    body: UserLimitUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
    if body.project_limit is not None:
        user.project_limit = body.project_limit
    if body.photo_limit is not None:
        user.photo_limit = body.photo_limit
    if body.is_verified is not None:
        user.is_verified = body.is_verified
    db.commit()
    return {"message": "UPDATED"}

@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="CANNOT_DELETE_SELF")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    # 유저의 모든 데이터 삭제 (프로젝트 → 사진 → 챕터 등)
    projects = db.query(models.Project).filter(models.Project.user_id == user_id).all()
    for project in projects:
        chapters = db.query(models.Chapter).filter(models.Chapter.project_id == project.id).all()
        chapter_ids = [c.id for c in chapters]
        if chapter_ids:
            db.query(models.ChapterPhoto).filter(
                models.ChapterPhoto.chapter_id.in_(chapter_ids)
            ).delete(synchronize_session=False)
        db.query(models.Chapter).filter(
            models.Chapter.project_id == project.id
        ).delete(synchronize_session=False)
        db.query(models.Note).filter(
            models.Note.project_id == project.id
        ).delete(synchronize_session=False)
        db.query(models.Photo).filter(
            models.Photo.project_id == project.id
        ).delete(synchronize_session=False)
        db.delete(project)

    db.query(models.Setting).filter(
        models.Setting.user_id == user_id
    ).delete(synchronize_session=False)

    db.delete(user)
    db.commit()
    return {"message": "DELETED"}