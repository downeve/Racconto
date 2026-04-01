from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import models

router = APIRouter(prefix="/portfolio", tags=["portfolio"])

@router.get("/")
def get_portfolio(db: Session = Depends(get_db)):
    """
    포트폴리오 로직:
    - 프로젝트가 is_public=true면 포트폴리오에 노출
    - 챕터가 있으면 챕터 구조 + 챕터 사진들
    - 챕터가 없으면 전체 사진 그리드 표시
    """
    projects = db.query(models.Project).filter(
        models.Project.is_public == "true",
        models.Project.deleted_at == None
    ).order_by(models.Project.updated_at.desc()).all()

    result = []
    for project in projects:
        # 챕터 조회
        chapters = db.query(models.Chapter).filter(
            models.Chapter.project_id == project.id
        ).order_by(models.Chapter.order_num).all()

        chapter_list = []
        chapter_photo_ids = set()
        
        # 챕터가 있으면 챕터별 사진 구성
        for chapter in chapters:
            chapter_photos = db.query(models.ChapterPhoto).filter(
                models.ChapterPhoto.chapter_id == chapter.id
            ).order_by(models.ChapterPhoto.order_num).all()

            cp_list = []
            for cp in chapter_photos:
                photo = db.query(models.Photo).filter(
                    models.Photo.id == cp.photo_id,
                    models.Photo.deleted_at == None  # 삭제된 사진 제외
                ).first()
                if photo:
                    cp_list.append({
                        "id": photo.id,
                        "image_url": photo.image_url,
                        "caption": photo.caption
                    })
                    chapter_photo_ids.add(photo.id)

            chapter_list.append({
                "id": chapter.id,
                "title": chapter.title,
                "description": chapter.description,
                "photos": cp_list
            })

        # 챕터가 없으면 빈 배열 반환
        if len(chapter_list) == 0:
            all_photos = []  # 챕터 없으면 사진 노출 안 함
        else:
            all_photos = db.query(models.Photo).filter(
                models.Photo.project_id == project.id,
                models.Photo.deleted_at == None
            ).order_by(models.Photo.order).all()

        # 챕터에 없는 사진들 (기타 섹션용)
        extra_photos = []
        for p in all_photos:
            if p.id not in chapter_photo_ids:
                extra_photos.append({
                    "id": p.id,
                    "image_url": p.image_url,
                    "caption": p.caption
                })

        # photos: 챕터 없을 때 전체 표시용
        result.append({
            "id": project.id,
            "title": project.title,
            "description": project.description,
            "cover_image_url": project.cover_image_url,
            "location": project.location,
            "photos": [{"id": p.id, "image_url": p.image_url, "caption": p.caption} for p in all_photos],
            "chapters": chapter_list,
            "extra_photos": extra_photos
        })
    
    return result