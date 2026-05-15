from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from app.database import get_db
from app import models

router = APIRouter(prefix="/portfolio", tags=["portfolio"])

# 공개 portfolio 응답 캐시 (CDN/브라우저용)
_PORTFOLIO_CACHE_CONTROL = "public, max-age=60, stale-while-revalidate=300"


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
        # 변경 후
        cps = db.query(models.ChapterItem).filter(
            models.ChapterItem.chapter_id.in_(chapter_ids)
        ).order_by(models.ChapterItem.order_num, models.ChapterItem.order_in_block).all()
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
    # 변경 후
    for cp in chapter_photos_map.get(chapter_id, []):
        if cp.item_type == 'TEXT':
            result.append({
                "item_type": "TEXT",
                "text_content": cp.text_content,
                "block_id": cp.block_id,
                "block_type": cp.block_type
            })
            continue
        photo = photos_map.get(cp.photo_id)
        if photo:
            result.append({
                "item_type": "PHOTO",
                "id": photo.id,
                "image_url": photo.image_url,
                "caption": photo.caption,
                "block_id": cp.block_id,
                "block_type": cp.block_type,
                "block_layout": cp.block_layout
            })
            chapter_photo_ids.add(photo.id)
    return result


def _build_project_result(project, db: Session) -> dict:
    """단일 프로젝트용 (GET /{username}/{slug} 전용). DB 직접 조회."""
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
                    "items": sub_photos,
                })
            parent_photos = _build_chapter_photos(
                top_chapter.id, chapter_photos_map, photos_map, chapter_photo_ids
            )
            chapter_list.append({
                "id": top_chapter.id,
                "title": top_chapter.title,
                "description": top_chapter.description,
                "items": parent_photos,
                "sub_chapters": sub_chapter_list,
            })
        else:
            top_photos = _build_chapter_photos(
                top_chapter.id, chapter_photos_map, photos_map, chapter_photo_ids
            )
            chapter_list.append({
                "id": top_chapter.id,
                "title": top_chapter.title,
                "description": top_chapter.description,
                "items": top_photos,
                "sub_chapters": []
            })

    all_photos = list(photos_map.values()) if chapter_list else []
    extra_photos = [
        {"id": p.id, "image_url": p.image_url, "caption": p.caption}
        for p in all_photos if p.id not in chapter_photo_ids
    ]

    return {
        "id": project.id,
        "slug": project.slug,
        "title": project.title,
        "description": project.description,
        "cover_image_url": project.cover_image_url,
        "location": project.location,
        "updated_at": project.updated_at.isoformat() if project.updated_at else None,
        "photos": [{"id": p.id, "image_url": p.image_url, "caption": p.caption} for p in all_photos],
        "chapters": chapter_list,
        "extra_photos": extra_photos
    }


def _preload_all_projects(project_ids: list, db: Session) -> tuple:
    """여러 프로젝트의 챕터/아이템/사진을 한 번에 배치 조회."""
    if not project_ids:
        return {}, {}, {}

    all_chapters = db.query(models.Chapter).filter(
        models.Chapter.project_id.in_(project_ids)
    ).order_by(models.Chapter.order_num).all()

    all_chapter_ids = [c.id for c in all_chapters]
    all_items = []
    if all_chapter_ids:
        all_items = db.query(models.ChapterItem).filter(
            models.ChapterItem.chapter_id.in_(all_chapter_ids)
        ).order_by(models.ChapterItem.order_num, models.ChapterItem.order_in_block).all()

    all_photos = db.query(models.Photo).filter(
        models.Photo.project_id.in_(project_ids),
        models.Photo.deleted_at == None
    ).order_by(models.Photo.order).all()

    chapters_by_project: dict = {}
    for ch in all_chapters:
        chapters_by_project.setdefault(ch.project_id, []).append(ch)

    items_by_chapter: dict = {}
    for it in all_items:
        items_by_chapter.setdefault(it.chapter_id, []).append(it)

    photos_by_project: dict = {}
    for ph in all_photos:
        photos_by_project.setdefault(ph.project_id, {})[ph.id] = ph

    return chapters_by_project, items_by_chapter, photos_by_project


def _build_project_result_from_cache(
    project,
    chapters_by_project: dict,
    items_by_chapter: dict,
    photos_by_project: dict,
) -> dict:
    """배치 로딩된 데이터로 프로젝트 결과를 조립. DB 조회 없음."""
    chapters = chapters_by_project.get(project.id, [])
    photos_map = photos_by_project.get(project.id, {})
    chapter_photos_map = {ch.id: items_by_chapter.get(ch.id, []) for ch in chapters}

    top_chapters = sorted(
        [c for c in chapters if c.parent_id is None],
        key=lambda c: c.order_num
    )

    chapter_list = []
    chapter_photo_ids: set = set()

    for top_chapter in top_chapters:
        sub_chapters = sorted(
            [c for c in chapters if c.parent_id == top_chapter.id],
            key=lambda c: c.order_num
        )

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
                    "items": sub_photos,
                })
            parent_photos = _build_chapter_photos(
                top_chapter.id, chapter_photos_map, photos_map, chapter_photo_ids
            )
            chapter_list.append({
                "id": top_chapter.id,
                "title": top_chapter.title,
                "description": top_chapter.description,
                "items": parent_photos,
                "sub_chapters": sub_chapter_list,
            })
        else:
            top_photos = _build_chapter_photos(
                top_chapter.id, chapter_photos_map, photos_map, chapter_photo_ids
            )
            chapter_list.append({
                "id": top_chapter.id,
                "title": top_chapter.title,
                "description": top_chapter.description,
                "items": top_photos,
                "sub_chapters": []
            })

    all_photos = list(photos_map.values()) if chapter_list else []
    extra_photos = [
        {"id": p.id, "image_url": p.image_url, "caption": p.caption}
        for p in all_photos if p.id not in chapter_photo_ids
    ]

    return {
        "id": project.id,
        "slug": project.slug,
        "title": project.title,
        "description": project.description,
        "cover_image_url": project.cover_image_url,
        "location": project.location,
        "updated_at": project.updated_at.isoformat() if project.updated_at else None,
        "photos": [{"id": p.id, "image_url": p.image_url, "caption": p.caption} for p in all_photos],
        "chapters": chapter_list,
        "extra_photos": extra_photos
    }


@router.get("/{username}/{slug}")
def get_public_project_by_slug(username: str, slug: str, response: Response, db: Session = Depends(get_db)):
    response.headers["Cache-Control"] = _PORTFOLIO_CACHE_CONTROL
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    theme_setting = db.query(models.Setting).filter(
        models.Setting.user_id == user.id,
        models.Setting.key == "portfolio_theme"
    ).first()
    theme = theme_setting.value if theme_setting else "light"

    project = db.query(models.Project).filter(
        models.Project.user_id == user.id,
        models.Project.slug == slug,
        models.Project.is_public == True,
        models.Project.deleted_at == None
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="PROJECT_NOT_FOUND")

    return {
        "username": username,
        "theme": theme,
        "project": _build_project_result(project, db)
    }


@router.get("/")
def get_portfolio(response: Response, db: Session = Depends(get_db)):
    response.headers["Cache-Control"] = _PORTFOLIO_CACHE_CONTROL
    projects = db.query(models.Project).filter(
        models.Project.is_public == True,
        models.Project.deleted_at == None
    ).order_by(models.Project.order_num.asc(), models.Project.created_at.desc()).all()

    chapters_by_project, items_by_chapter, photos_by_project = _preload_all_projects(
        [p.id for p in projects], db
    )
    return [
        _build_project_result_from_cache(p, chapters_by_project, items_by_chapter, photos_by_project)
        for p in projects
    ]


@router.get("/{username}")
def get_public_portfolio(username: str, response: Response, db: Session = Depends(get_db)):
    response.headers["Cache-Control"] = _PORTFOLIO_CACHE_CONTROL
    user = db.query(models.User).filter(
        models.User.username == username
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    # 💡 1. 유저의 테마 설정 조회
    theme_setting = db.query(models.Setting).filter(
        models.Setting.user_id == user.id,
        models.Setting.key == "portfolio_theme"
    ).first()
    
    # 설정이 없으면 기본값인 "light" 적용
    theme = theme_setting.value if theme_setting else "light"

    projects = db.query(models.Project).filter(
        models.Project.user_id == user.id,
        models.Project.is_public == True,
        models.Project.deleted_at == None
    ).order_by(models.Project.order_num.asc(), models.Project.created_at.desc()).all()

    chapters_by_project, items_by_chapter, photos_by_project = _preload_all_projects(
        [p.id for p in projects], db
    )
    return {
        "username": username,
        "theme": theme,
        "projects": [
            _build_project_result_from_cache(p, chapters_by_project, items_by_chapter, photos_by_project)
            for p in projects
        ]
    }