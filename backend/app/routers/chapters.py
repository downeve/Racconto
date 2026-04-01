from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
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

# [여기 추가] 사진 순서 업데이트용 클래스
class ChapterPhotoUpdate(BaseModel):
    order_num: int

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

# 챕터 목록
@router.get("/", response_model=List[ChapterResponse])
def get_chapters(project_id: str, db: Session = Depends(get_db)):
    return db.query(models.Chapter).filter(
        models.Chapter.project_id == project_id
    ).order_by(models.Chapter.order_num).all()

# 챕터 생성
@router.post("/", response_model=ChapterResponse)
def create_chapter(chapter: ChapterCreate, db: Session = Depends(get_db)):
    # 서브챕터 생성 시 parent가 이미 서브챕터인지 검증 (3단계 방지)
    if chapter.parent_id:
        parent = db.query(models.Chapter).filter(models.Chapter.id == chapter.parent_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent chapter not found")
        if parent.parent_id is not None:
            raise HTTPException(
                status_code=400, 
                detail="Cannot create sub-chapter under another sub-chapter (max 2 levels)"
            )
    
    db_chapter = models.Chapter(
        id=str(uuid.uuid4()),
        project_id=chapter.project_id,
        title=chapter.title,
        description=chapter.description,
        order_num=chapter.order_num,
        parent_id=chapter.parent_id  # 🆕 추가
    )
    db.add(db_chapter)
    db.commit()
    db.refresh(db_chapter)
    return db_chapter

@router.put("/{chapter_id}", response_model=ChapterResponse)
def update_chapter(chapter_id: str, chapter: ChapterUpdate, db: Session = Depends(get_db)):
    db_chapter = db.query(models.Chapter).filter(models.Chapter.id == chapter_id).first()
    if not db_chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    
    # parent_id 변경 시 3단계 방지 검증
    if chapter.parent_id:
        parent = db.query(models.Chapter).filter(models.Chapter.id == chapter.parent_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent chapter not found")
        if parent.parent_id is not None:
            raise HTTPException(
                status_code=400,
                detail="Cannot move under a sub-chapter (max 2 levels)"
            )
    
    db_chapter.title = chapter.title
    db_chapter.description = chapter.description
    db_chapter.order_num = chapter.order_num
    db_chapter.parent_id = chapter.parent_id  # 🆕 추가
    db.commit()
    db.refresh(db_chapter)
    return db_chapter

# 챕터 삭제
@router.delete("/{chapter_id}")
def delete_chapter(chapter_id: str, db: Session = Depends(get_db)):
    db_chapter = db.query(models.Chapter).filter(models.Chapter.id == chapter_id).first()
    if not db_chapter:
        raise HTTPException(status_code=404, detail="챕터를 찾을 수 없습니다")
    
    # 챕터 사진들 삭제
    chapter_photos = db.query(models.ChapterPhoto).filter(
        models.ChapterPhoto.chapter_id == chapter_id
    ).all()
    
    # ✅ is_portfolio 관련 로직 삭제, 단순히 chapter_photos만 삭제
    for cp in chapter_photos:
        db.delete(cp)

    db.delete(db_chapter)
    db.commit()
    return {"message": "삭제되었습니다"}

# 챕터에 사진 추가
@router.post("/{chapter_id}/photos")
def add_photo_to_chapter(chapter_id: str, body: ChapterPhotoAdd, db: Session = Depends(get_db)):
    existing = db.query(models.ChapterPhoto).filter(
        models.ChapterPhoto.chapter_id == chapter_id,
        models.ChapterPhoto.photo_id == body.photo_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="이미 추가된 사진이에요")

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

# 챕터에서 사진 제거
@router.delete("/{chapter_id}/photos/{photo_id}")
def remove_photo_from_chapter(chapter_id: str, photo_id: str, db: Session = Depends(get_db)):
    cp = db.query(models.ChapterPhoto).filter(
        models.ChapterPhoto.chapter_id == chapter_id,
        models.ChapterPhoto.photo_id == photo_id
    ).first()
    if not cp:
        raise HTTPException(status_code=404, detail="사진을 찾을 수 없습니다")
    db.delete(cp)

    db.commit()
    return {"message": "제거되었습니다"}

# [여기 추가] 챕터 내 사진 순서(order_num) 업데이트 라우터
@router.put("/{chapter_id}/photos/{photo_id}")
def update_chapter_photo_order(
    chapter_id: str, 
    photo_id: str, 
    body: ChapterPhotoUpdate, 
    db: Session = Depends(get_db)
):
    # 해당 챕터의 특정 사진 매핑 데이터 찾기
    cp = db.query(models.ChapterPhoto).filter(
        models.ChapterPhoto.chapter_id == chapter_id,
        models.ChapterPhoto.photo_id == photo_id
    ).first()
    
    if not cp:
        raise HTTPException(status_code=404, detail="해당 챕터에서 사진을 찾을 수 없습니다")
    
    # 순서 업데이트
    cp.order_num = body.order_num
    db.commit()
    
    return {"message": "순서가 업데이트되었습니다"}

# 챕터 사진 목록
@router.get("/{chapter_id}/photos")
def get_chapter_photos(chapter_id: str, db: Session = Depends(get_db)):
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