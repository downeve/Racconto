from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.auth import get_current_user
from pydantic import BaseModel
from typing import Optional
from app.routers.photos import delete_from_cloudflare
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
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="CANNOT_DELETE_SELF")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    # CF 이미지 URL 수집
    photo_urls = [
        p.image_url for p in db.query(models.Photo).filter(
            models.Photo.project_id.in_(
                db.query(models.Project.id).filter(
                    models.Project.user_id == user_id
                )
            ),
            models.Photo.image_url.isnot(None),
            models.Photo.image_url.contains("imagedelivery.net")
        ).all()
    ]

    # CF 이미지 백그라운드 삭제
    if photo_urls:
        background_tasks.add_task(
            lambda urls: [delete_from_cloudflare(u) for u in urls],
            photo_urls
        )

    # CASCADE로 모든 관련 데이터 자동 삭제
    db.delete(user)
    db.commit()

    return {"message": "DELETED"}

@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin)
):
    total_users = db.query(models.User).count()
    verified_users = db.query(models.User).filter(models.User.is_verified == True).count()
    total_projects = db.query(models.Project).filter(models.Project.deleted_at == None).count()
    total_photos = db.query(models.Photo).filter(models.Photo.deleted_at == None).count()
    total_notes = db.query(models.Note).filter(models.Note.deleted_at == None).count()

    return {
        "total_users": total_users,
        "verified_users": verified_users,
        "total_projects": total_projects,
        "total_photos": total_photos,
        "total_notes": total_notes,
    }
