from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import models

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


def _preload_project_data(project_id: str, db: Session) -> tuple[dict, dict]:
    """
    프로젝트의 chapter_photos와 photos를 각각 한 번씩만 조회해서 dict로 반환.
    chapter_photos_map: {chapter_id: [ChapterPhoto, ...]}
    photos_map:         {photo_id: Photo}
    """
    all_chapters = db.query(models.Chapter).filter(
        models.Chapter.project_id == project_id
    ).all()
    chapter_ids = [c.id for c in all_chapters]

    chapter_photos_map: dict = {}
    if chapter_ids:
        cps = db.query(models.ChapterPhoto).filter(
            models.ChapterPhoto.chapter_id.in_(chapter_ids)
        ).order_by(models.ChapterPhoto.order_num).all()
        for cp in cps:
            chapter_photos_map.setdefault(cp.chapter_id, []).append(cp)

    photos = db.query(models.Photo).filter(
        models.Photo.project_id == project_id,
        models.Photo.deleted_at == None
    ).order_by(models.Photo.order).all()
    photos_map = {p.id: p for p in photos}

    return chapter_photos_map, photos_map


def _build_chapter_photos(
    chapter_id: str,
    chapter_photos_map: dict,
    photos_map: dict,
    chapter_photo_ids: set
) -> list:
    result = []
    for cp in chapter_photos_map.get(chapter_id, []):
        photo = photos_map.get(cp.photo_id)
        if photo:
            result.append({
                "id": photo.id,
                "image_url": photo.image_url,
                "caption": photo.caption
            })
            chapter_photo_ids.add(photo.id)
    return result


def _build_project_result(project, db: Session) -> dict:
    chapter_photos_map, photos_map = _preload_project_data(project.id, db)

    top_chapters = db.query(models.Chapter).filter(
        models.Chapter.project_id == project.id,
        models.Chapter.parent_id == None
    ).order_by(models.Chapter.order_num).all()

    chapter_list = []
    chapter_photo_ids: set = set()

    for top_chapter in top_chapters:
        sub_chapters = db.query(models.Chapter).filter(
            models.Chapter.parent_id == top_chapter.id
        ).order_by(models.Chapter.order_num).all()

        if sub_chapters:
            sub_chapter_list = []
            for sub_chapter in sub_chapters:
                sub_photos = _build_chapter_photos(
                    sub_chapter.id, chapter_photos_map, photos_map, chapter_photo_ids
                )
                sub_chapter_list.append({
                    "id": sub_chapter.id,
                    "title": sub_chapter.title,
                    "description": sub_chapter.description,
                    "photos": sub_photos
                })
            parent_photos = _build_chapter_photos(
                top_chapter.id, chapter_photos_map, photos_map, chapter_photo_ids
            )
            chapter_list.append({
                "id": top_chapter.id,
                "title": top_chapter.title,
                "description": top_chapter.description,
                "photos": parent_photos,
                "sub_chapters": sub_chapter_list
            })
        else:
            top_photos = _build_chapter_photos(
                top_chapter.id, chapter_photos_map, photos_map, chapter_photo_ids
            )
            chapter_list.append({
                "id": top_chapter.id,
                "title": top_chapter.title,
                "description": top_chapter.description,
                "photos": top_photos,
                "sub_chapters": []
            })

    all_photos = list(photos_map.values()) if chapter_list else []
    extra_photos = [
        {"id": p.id, "image_url": p.image_url, "caption": p.caption}
        for p in all_photos if p.id not in chapter_photo_ids
    ]

    return {
        "id": project.id,
        "title": project.title,
        "description": project.description,
        "cover_image_url": project.cover_image_url,
        "location": project.location,
        "photos": [{"id": p.id, "image_url": p.image_url, "caption": p.caption} for p in all_photos],
        "chapters": chapter_list,
        "extra_photos": extra_photos
    }


@router.get("/")
def get_portfolio(db: Session = Depends(get_db)):
    projects = db.query(models.Project).filter(
        models.Project.is_public == "true",
        models.Project.deleted_at == None
    ).order_by(models.Project.updated_at.desc()).all()

    return [_build_project_result(p, db) for p in projects]


@router.get("/public/{username}")
def get_public_portfolio(username: str, db: Session = Depends(get_db)):
    from fastapi import HTTPException
    user = db.query(models.User).filter(
        models.User.username == username
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    projects = db.query(models.Project).filter(
        models.Project.user_id == user.id,
        models.Project.is_public == "true",
        models.Project.deleted_at == None
    ).order_by(models.Project.updated_at.desc()).all()

    return {
        "username": username,
        "projects": [_build_project_result(p, db) for p in projects]
    }
