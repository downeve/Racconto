from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import models

router = APIRouter(prefix="/portfolio", tags=["portfolio"])

@router.get("/")
def get_portfolio(db: Session = Depends(get_db)):
    projects = db.query(models.Project).filter(
        models.Project.is_public == "true",
        models.Project.deleted_at == None
    ).order_by(models.Project.updated_at.desc()).all()

    result = []
    for project in projects:
        photos = db.query(models.Photo).filter(
            models.Photo.project_id == project.id,
            models.Photo.is_portfolio == "true"
        ).order_by(models.Photo.order).all()

        chapters = db.query(models.Chapter).filter(
            models.Chapter.project_id == project.id
        ).order_by(models.Chapter.order_num).all()

        chapter_list = []
        for chapter in chapters:
            chapter_photos = db.query(models.ChapterPhoto).filter(
                models.ChapterPhoto.chapter_id == chapter.id
            ).order_by(models.ChapterPhoto.order_num).all()

            cp_list = []
            for cp in chapter_photos:
                photo = db.query(models.Photo).filter(models.Photo.id == cp.photo_id).first()
                if photo:
                    cp_list.append({
                        "id": photo.id,
                        "image_url": photo.image_url,
                        "caption": photo.caption
                    })

            chapter_list.append({
                "id": chapter.id,
                "title": chapter.title,
                "description": chapter.description,
                "photos": cp_list
            })

        # 챕터에 포함된 사진 ID 목록 (for 루프 밖으로)
        chapter_photo_ids = set()
        for ch in chapter_list:
            for cp in ch['photos']:
                chapter_photo_ids.add(cp['id'])

        # 챕터에 없는 포트폴리오 사진 (기타)
        extra_photos = []
        for p in photos:
            if p.id not in chapter_photo_ids:
                extra_photos.append({
                    "id": p.id,
                    "image_url": p.image_url,
                    "caption": p.caption
                })

        result.append({
            "id": project.id,
            "title": project.title,
            "description": project.description,
            "cover_image_url": project.cover_image_url,
            "location": project.location,
            "photos": [{"id": p.id, "image_url": p.image_url, "caption": p.caption} for p in photos],
            "chapters": chapter_list,
            "extra_photos": extra_photos
        })
    return result