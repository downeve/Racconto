from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

router = APIRouter(prefix="/photos", tags=["photos"])

class PhotoCreate(BaseModel):
    project_id: str
    image_url: str
    caption: Optional[str] = None
    caption_en: Optional[str] = None
    order: Optional[int] = 0
    is_portfolio: Optional[str] = "false"

class PhotoResponse(BaseModel):
    id: str
    project_id: str
    image_url: str
    caption: Optional[str]
    caption_en: Optional[str]
    order: int
    is_portfolio: str
    created_at: datetime

    class Config:
        from_attributes = True

@router.get("/", response_model=list[PhotoResponse])
def get_photos(project_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Photo)
    if project_id:
        query = query.filter(models.Photo.project_id == project_id)
    return query.order_by(models.Photo.order).all()

@router.post("/", response_model=PhotoResponse)
def create_photo(photo: PhotoCreate, db: Session = Depends(get_db)):
    db_photo = models.Photo(
        id=str(uuid.uuid4()),
        project_id=photo.project_id,
        image_url=photo.image_url,
        caption=photo.caption,
        caption_en=photo.caption_en,
        order=photo.order,
        is_portfolio=photo.is_portfolio
    )
    db.add(db_photo)
    db.commit()
    db.refresh(db_photo)
    return db_photo

@router.delete("/{photo_id}")
def delete_photo(photo_id: str, db: Session = Depends(get_db)):
    photo = db.query(models.Photo).filter(models.Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="사진을 찾을 수 없습니다")
    db.delete(photo)
    db.commit()
    return {"message": "삭제되었습니다"}