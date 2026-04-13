from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.auth import get_current_user
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid

router = APIRouter(prefix="/chapters", tags=["chapters"])

class ChapterCreate(BaseModel):
    project_id: str
    title: str
    description: Optional[str] = None
    order_num: Optional[int] = 0
    parent_id: Optional[str] = None

class ChapterUpdate(BaseModel):
    title: str
    description: Optional[str] = None
    order_num: Optional[int] = 0
    parent_id: Optional[str] = None

class ChapterPhotoAdd(BaseModel):
    photo_id: str
    order_num: Optional[int] = 0

class ChapterPhotoUpdate(BaseModel):
    order_num: int

class ChapterReorder(BaseModel):
    chapter_ids: List[str]

class ChapterPhotoResponse(BaseModel):
    id: str
    chapter_id: str
    photo_id: str
    order_num: int
    image_url: Optional[str] = None
    caption: Optional[str] = None

    class Config:
        from_attributes = True

class ChapterResponse(BaseModel):
    id: str
    project_id: str
    title: str
    description: Optional[str]
    order_num: int
    parent_id: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


def get_owned_project_or_403(project_id: str, user_id: str, db: Session) -> models.Project:
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.user_id == user_id,
    ).first()
    if not project:
        raise HTTPException(status_code=403, detail="FORBIDDEN")
    return project


def get_owned_chapter_or_404(chapter_id: str, user_id: str, db: Session) -> models.Chapter:
    chapter = db.query(models.Chapter).join(models.Project).filter(
        models.Chapter.id == chapter_id,
        models.Project.user_id == user_id,
    ).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="CHAPTER_NOT_FOUND")
    return chapter


# 1. 챕터 목록
@router.get("/", response_model=List[ChapterResponse])
def get_chapters(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    get_owned_project_or_403(project_id, current_user.id, db)
    return db.query(models.Chapter).filter(
        models.Chapter.project_id == project_id
    ).order_by(models.Chapter.order_num, models.Chapter.created_at).all()


# 2. 챕터 생성
@router.post("/", response_model=ChapterResponse)
def create_chapter(
    chapter: ChapterCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    get_owned_project_or_403(chapter.project_id, current_user.id, db)

    if chapter.parent_id:
        parent = db.query(models.Chapter).filter(models.Chapter.id == chapter.parent_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent chapter not found")
        if parent.parent_id is not None:
            raise HTTPException(
                status_code=400,
                detail="Cannot create sub-chapter under another sub-chapter (max 2 levels)"
            )

    next_order = chapter.order_num
    if not next_order:
        last_chapter = db.query(models.Chapter).filter(
            models.Chapter.project_id == chapter.project_id
        ).order_by(models.Chapter.order_num.desc()).first()
        next_order = (last_chapter.order_num + 1) if last_chapter else 0

    db_chapter = models.Chapter(
        id=str(uuid.uuid4()),
        project_id=chapter.project_id,
        title=chapter.title,
        description=chapter.description,
        order_num=next_order,
        parent_id=chapter.parent_id
    )
    db.add(db_chapter)
    db.commit()
    db.refresh(db_chapter)
    return db_chapter


# 3. 챕터 일괄 순서 변경 (/{chapter_id} 보다 위에 있어야 함)
@router.put("/reorder")
def reorder_chapters(
    body: ChapterReorder,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if body.chapter_ids:
        owned_count = db.query(models.Chapter).join(models.Project).filter(
            models.Chapter.id.in_(body.chapter_ids),
            models.Project.user_id == current_user.id
        ).count()
        if owned_count != len(body.chapter_ids):
            raise HTTPException(status_code=403, detail="FORBIDDEN")

    for index, chapter_id in enumerate(body.chapter_ids):
        db.query(models.Chapter).filter(models.Chapter.id == chapter_id).update(
            {"order_num": index}, synchronize_session=False
        )
    db.commit()
    return {"message": "순서가 성공적으로 변경되었습니다."}


# 4. 챕터 수정
@router.put("/{chapter_id}", response_model=ChapterResponse)
def update_chapter(
    chapter_id: str,
    chapter: ChapterUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_chapter = get_owned_chapter_or_404(chapter_id, current_user.id, db)

    update_data = chapter.dict(exclude_unset=True)

    if update_data.get("parent_id"):
        parent = db.query(models.Chapter).filter(models.Chapter.id == update_data["parent_id"]).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent chapter not found")
        if parent.parent_id is not None:
            raise HTTPException(
                status_code=400,
                detail="Cannot move under a sub-chapter (max 2 levels)"
            )

    for key, value in update_data.items():
        setattr(db_chapter, key, value)

    db.commit()
    db.refresh(db_chapter)
    return db_chapter


# 5. 챕터 삭제
@router.delete("/{chapter_id}")
def delete_chapter(
    chapter_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_chapter = get_owned_chapter_or_404(chapter_id, current_user.id, db)

    sub_chapters = db.query(models.Chapter).filter(models.Chapter.parent_id == chapter_id).all()
    for sub in sub_chapters:
        db.query(models.ChapterPhoto).filter(
            models.ChapterPhoto.chapter_id == sub.id
        ).delete(synchronize_session=False)
        db.delete(sub)

    db.query(models.ChapterPhoto).filter(
        models.ChapterPhoto.chapter_id == chapter_id
    ).delete(synchronize_session=False)

    db.delete(db_chapter)
    db.commit()
    return {"message": "챕터와 관련된 하위 데이터가 모두 안전하게 삭제되었습니다."}


# 6. 챕터에 사진 추가
@router.post("/{chapter_id}/photos")
def add_photo_to_chapter(
    chapter_id: str,
    body: ChapterPhotoAdd,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_chapter = get_owned_chapter_or_404(chapter_id, current_user.id, db)

    existing = db.query(models.ChapterPhoto).filter(
        models.ChapterPhoto.chapter_id == chapter_id,
        models.ChapterPhoto.photo_id == body.photo_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="PHOTO_ALREADY_IN_CHAPTER")

    last = db.query(models.ChapterPhoto).filter(
        models.ChapterPhoto.chapter_id == chapter_id
    ).order_by(models.ChapterPhoto.order_num.desc()).first()
    next_order = (last.order_num + 1) if last else 0

    db_cp = models.ChapterPhoto(
        id=str(uuid.uuid4()),
        chapter_id=chapter_id,
        photo_id=body.photo_id,
        order_num=next_order
    )
    db.add(db_cp)
    db.commit()
    return {"message": "추가되었습니다"}


# 7. 챕터에서 사진 제거
@router.delete("/{chapter_id}/photos/{photo_id}")
def remove_photo_from_chapter(
    chapter_id: str,
    photo_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    get_owned_chapter_or_404(chapter_id, current_user.id, db)

    cp = db.query(models.ChapterPhoto).filter(
        models.ChapterPhoto.chapter_id == chapter_id,
        models.ChapterPhoto.photo_id == photo_id
    ).first()
    if not cp:
        raise HTTPException(status_code=404, detail="PHOTO_NOT_FOUND")
    db.delete(cp)
    db.commit()
    return {"message": "제거되었습니다"}


# 8. 챕터 내 사진 순서 업데이트
@router.put("/{chapter_id}/photos/{photo_id}")
def update_chapter_photo_order(
    chapter_id: str,
    photo_id: str,
    body: ChapterPhotoUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    get_owned_chapter_or_404(chapter_id, current_user.id, db)

    cp = db.query(models.ChapterPhoto).filter(
        models.ChapterPhoto.chapter_id == chapter_id,
        models.ChapterPhoto.photo_id == photo_id
    ).first()
    if not cp:
        raise HTTPException(status_code=404, detail="PHOTO_NOT_IN_CHAPTER")

    cp.order_num = body.order_num
    db.commit()
    return {"message": "순서가 업데이트되었습니다"}


# 9. 챕터 사진 목록
@router.get("/{chapter_id}/photos")
def get_chapter_photos(
    chapter_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    get_owned_chapter_or_404(chapter_id, current_user.id, db)

    chapter_photos = db.query(models.ChapterPhoto).filter(
        models.ChapterPhoto.chapter_id == chapter_id
    ).order_by(models.ChapterPhoto.order_num).all()

    result = []
    for cp in chapter_photos:
        photo = db.query(models.Photo).filter(models.Photo.id == cp.photo_id).first()
        if photo:
            result.append({
                "id": cp.id,
                "chapter_id": cp.chapter_id,
                "photo_id": cp.photo_id,
                "order_num": cp.order_num,
                "image_url": photo.image_url,
                "caption": photo.caption
            })
    return result
