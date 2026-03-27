from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models

router = APIRouter(prefix="/portfolio", tags=["portfolio"])

@router.get("/")
def get_portfolio(db: Session = Depends(get_db)):
    projects = db.query(models.Project).filter(
        models.Project.is_public == "true"
    ).order_by(models.Project.updated_at.desc()).all()

    result = []
    for project in projects:
        photos = db.query(models.Photo).filter(
            models.Photo.project_id == project.id,
            models.Photo.is_portfolio == "true"
        ).order_by(models.Photo.order).all()

        result.append({
            "id": project.id,
            "title": project.title,
            "title_en": project.title_en,
            "description": project.description,
            "description_en": project.description_en,
            "cover_image_url": project.cover_image_url,
            "location": project.location,
            "shot_date": project.shot_date,
            "photos": [{"id": p.id, "image_url": p.image_url, "caption": p.caption} for p in photos]
        })
    return result