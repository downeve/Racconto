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
    - 챕터 구조를 계층적으로 렌더링 (최상위 → 서브챕터)
    - 챕터가 없으면 빈 배열 (안내 메시지 표시)
    """
    projects = db.query(models.Project).filter(
        models.Project.is_public == "true",
        models.Project.deleted_at == None
    ).order_by(models.Project.updated_at.desc()).all()

    result = []
    for project in projects:
        # 최상위 챕터만 조회 (parent_id가 NULL)
        top_chapters = db.query(models.Chapter).filter(
            models.Chapter.project_id == project.id,
            models.Chapter.parent_id == None
        ).order_by(models.Chapter.order_num).all()

        chapter_list = []
        chapter_photo_ids = set()
        
        for top_chapter in top_chapters:
            # 서브챕터 조회
            sub_chapters = db.query(models.Chapter).filter(
                models.Chapter.parent_id == top_chapter.id
            ).order_by(models.Chapter.order_num).all()
            
            # 서브챕터가 있으면 서브챕터별로 사진 구성
            if sub_chapters:
                sub_chapter_list = []
                for sub_chapter in sub_chapters:
                    sub_photos = get_chapter_photos(db, sub_chapter.id, chapter_photo_ids)
                    sub_chapter_list.append({
                        "id": sub_chapter.id,
                        "title": sub_chapter.title,
                        "description": sub_chapter.description,
                        "photos": sub_photos
                    })
                
                chapter_list.append({
                    "id": top_chapter.id,
                    "title": top_chapter.title,
                    "description": top_chapter.description,
                    "photos": [],  # 최상위 챕터는 사진 없음, 서브챕터에만
                    "sub_chapters": sub_chapter_list
                })
            else:
                # 서브챕터 없으면 최상위 챕터에 직접 사진
                top_photos = get_chapter_photos(db, top_chapter.id, chapter_photo_ids)
                chapter_list.append({
                    "id": top_chapter.id,
                    "title": top_chapter.title,
                    "description": top_chapter.description,
                    "photos": top_photos,
                    "sub_chapters": []
                })

        # 챕터가 없으면 빈 배열
        if len(chapter_list) == 0:
            all_photos = []
        else:
            # 전체 사진 조회 (deleted_at = null)
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


def get_chapter_photos(db: Session, chapter_id: str, chapter_photo_ids: set):
    """챕터의 사진 목록 조회 및 ID 추적"""
    chapter_photos = db.query(models.ChapterPhoto).filter(
        models.ChapterPhoto.chapter_id == chapter_id
    ).order_by(models.ChapterPhoto.order_num).all()

    photo_list = []
    for cp in chapter_photos:
        photo = db.query(models.Photo).filter(
            models.Photo.id == cp.photo_id,
            models.Photo.deleted_at == None
        ).first()
        if photo:
            photo_list.append({
                "id": photo.id,
                "image_url": photo.image_url,
                "caption": photo.caption
            })
            chapter_photo_ids.add(photo.id)
    
    return photo_list