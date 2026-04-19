from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.auth import get_current_user
from pydantic import BaseModel
from typing import Optional, List, Literal
from datetime import datetime
import uuid

router = APIRouter(prefix="/chapters", tags=["chapters"])


# ── Pydantic 모델 ───────────────────────────────────────────

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

class ChapterReorder(BaseModel):
    chapter_ids: List[str]

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


# ── 아이템 관련 Pydantic 모델 ────────────────────────────────

class ChapterItemPhotoAdd(BaseModel):
    """사진 아이템 추가"""
    photo_id: str
    order_num: Optional[int] = None  # None 이면 맨 끝에 자동 배치
    block_id: Optional[str] = None  # None이면 새 블록 자동 생성

class ChapterItemTextAdd(BaseModel):
    """텍스트 블록 아이템 추가"""
    text_content: str
    order_num: Optional[int] = None  # None 이면 맨 끝에 자동 배치

class ChapterItemTextUpdate(BaseModel):
    """텍스트 블록 내용 수정"""
    text_content: str

class ChapterItemReorder(BaseModel):
    """챕터 내 아이템 일괄 순서 변경"""
    item_ids: List[str]

class ChapterItemResponse(BaseModel):
    """아이템 목록 조회 응답 — 사진/텍스트 통합"""
    id: str
    chapter_id: str
    order_num: int
    item_type: str  # 'PHOTO' | 'TEXT'
    block_type: str = 'default'
    block_layout: str = 'grid'  # 블록 단위 레이아웃
    # PHOTO 전용
    photo_id: Optional[str] = None
    image_url: Optional[str] = None
    caption: Optional[str] = None
    # TEXT 전용
    text_content: Optional[str] = None
    block_id: Optional[str] = None
    order_in_block: int = 0

    class Config:
        from_attributes = True

class ChapterItemBlockReorder(BaseModel):
    """블록 내 사진 순서 변경"""
    block_id: str
    item_ids: List[str]  # 블록 내 item id 배열 (새 순서)

# ── 헬퍼 함수 ───────────────────────────────────────────────

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


def get_next_order_num(chapter_id: str, db: Session) -> int:
    """챕터 내 마지막 order_num + 1 반환. 아이템이 없으면 0."""
    last = db.query(models.ChapterItem).filter(
        models.ChapterItem.chapter_id == chapter_id
    ).order_by(models.ChapterItem.order_num.desc()).first()
    return (last.order_num + 1) if last else 0


def build_item_response(item: models.ChapterItem) -> dict:
    """ChapterItem ORM 객체를 응답 딕셔너리로 변환."""
    base = {
        "id": item.id,
        "chapter_id": item.chapter_id,
        "order_num": item.order_num,
        "item_type": item.item_type,
        "block_type": item.block_type,
        "block_id": item.block_id,
        "order_in_block": item.order_in_block,
        "block_layout": item.block_layout,
        "photo_id": None,
        "image_url": None,
        "caption": None,
        "text_content": None,
    }
    if item.item_type == "PHOTO" and item.photo:
        base["photo_id"] = item.photo_id
        base["image_url"] = item.photo.image_url
        base["caption"] = item.photo.caption
    elif item.item_type == "TEXT":
        base["text_content"] = item.text_content
    return base


# ── 챕터 CRUD ───────────────────────────────────────────────

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
        if parent.project_id != chapter.project_id:
            raise HTTPException(status_code=403, detail="FORBIDDEN")
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


# 3. 챕터 일괄 순서 변경 (/{chapter_id} 라우트보다 위에 있어야 함)
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
        if parent.project_id != db_chapter.project_id:
            raise HTTPException(status_code=403, detail="FORBIDDEN")
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

    # 서브챕터 및 그 아이템 삭제 (CASCADE가 걸려 있지만 명시적으로 처리)
    sub_chapters = db.query(models.Chapter).filter(models.Chapter.parent_id == chapter_id).all()
    for sub in sub_chapters:
        db.query(models.ChapterItem).filter(
            models.ChapterItem.chapter_id == sub.id
        ).delete(synchronize_session=False)
        db.delete(sub)

    # 현재 챕터 아이템 삭제
    db.query(models.ChapterItem).filter(
        models.ChapterItem.chapter_id == chapter_id
    ).delete(synchronize_session=False)

    db.delete(db_chapter)
    db.commit()
    return {"message": "챕터와 관련된 하위 데이터가 모두 안전하게 삭제되었습니다."}


# ── 아이템 CRUD ─────────────────────────────────────────────

# 6. 챕터 아이템 목록 (사진 + 텍스트 혼합, order_num 순)
@router.get("/{chapter_id}/items")
def get_chapter_items(
    chapter_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    get_owned_chapter_or_404(chapter_id, current_user.id, db)

    items = db.query(models.ChapterItem).filter(
        models.ChapterItem.chapter_id == chapter_id
    ).order_by(models.ChapterItem.order_num).all()

    return [build_item_response(item) for item in items]


# 7. 사진 아이템 추가
@router.post("/{chapter_id}/photos")
def add_photo_to_chapter(
    chapter_id: str,
    body: ChapterItemPhotoAdd,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    get_owned_chapter_or_404(chapter_id, current_user.id, db)

    # 동일 챕터에 동일 사진 중복 방지
    existing = db.query(models.ChapterItem).filter(
        models.ChapterItem.chapter_id == chapter_id,
        models.ChapterItem.photo_id == body.photo_id,
        models.ChapterItem.item_type == "PHOTO"
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="PHOTO_ALREADY_IN_CHAPTER")

    order = body.order_num if body.order_num is not None else get_next_order_num(chapter_id, db)

    new_id = str(uuid.uuid4())
    # block_id 미지정 시 자신의 id를 block_id로 사용 (단독 블록)
    block_id = body.block_id if body.block_id else new_id

    db_item = models.ChapterItem(
        id=new_id,
        chapter_id=chapter_id,
        item_type="PHOTO",
        photo_id=body.photo_id,
        order_num=order,
        block_id=block_id,
        order_in_block=body.order_in_block or 0,
        block_layout='grid'  # 단건 추가 기본값
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return build_item_response(db_item)


# 8. 텍스트 블록 추가
@router.post("/{chapter_id}/texts")
def add_text_to_chapter(
    chapter_id: str,
    body: ChapterItemTextAdd,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    get_owned_chapter_or_404(chapter_id, current_user.id, db)

    if not body.text_content.strip():
        raise HTTPException(status_code=400, detail="TEXT_CONTENT_EMPTY")

    order = body.order_num if body.order_num is not None else get_next_order_num(chapter_id, db)

    db_item = models.ChapterItem(
        id=str(uuid.uuid4()),
        chapter_id=chapter_id,
        item_type="TEXT",
        text_content=body.text_content,
        order_num=order
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return build_item_response(db_item)


# 9. 텍스트 블록 내용 수정
@router.put("/{chapter_id}/texts/{item_id}")
def update_text_item(
    chapter_id: str,
    item_id: str,
    body: ChapterItemTextUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    get_owned_chapter_or_404(chapter_id, current_user.id, db)

    item = db.query(models.ChapterItem).filter(
        models.ChapterItem.id == item_id,
        models.ChapterItem.chapter_id == chapter_id,
        models.ChapterItem.item_type == "TEXT"
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="TEXT_ITEM_NOT_FOUND")

    if not body.text_content.strip():
        raise HTTPException(status_code=400, detail="TEXT_CONTENT_EMPTY")

    item.text_content = body.text_content
    db.commit()
    return build_item_response(item)


# 10. 아이템 삭제 (사진/텍스트 공용)
@router.delete("/{chapter_id}/items/{item_id}")
def delete_chapter_item(
    chapter_id: str,
    item_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    get_owned_chapter_or_404(chapter_id, current_user.id, db)

    item = db.query(models.ChapterItem).filter(
        models.ChapterItem.id == item_id,
        models.ChapterItem.chapter_id == chapter_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="ITEM_NOT_FOUND")

    db.delete(item)
    db.commit()
    return {"message": "삭제되었습니다"}


# 11. 챕터 내 아이템 일괄 순서 변경 (DnD 드롭 후 호출)
@router.put("/{chapter_id}/items/reorder")
def reorder_chapter_items(
    chapter_id: str,
    body: ChapterItemReorder,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    get_owned_chapter_or_404(chapter_id, current_user.id, db)

    if not body.item_ids:
        return {"message": "변경할 아이템이 없습니다."}

    # 소유권 검증: 전달된 item_ids 가 모두 해당 챕터 소속인지 확인
    owned_count = db.query(models.ChapterItem).filter(
        models.ChapterItem.id.in_(body.item_ids),
        models.ChapterItem.chapter_id == chapter_id
    ).count()
    if owned_count != len(body.item_ids):
        raise HTTPException(status_code=403, detail="FORBIDDEN")

    for index, item_id in enumerate(body.item_ids):
        db.query(models.ChapterItem).filter(
            models.ChapterItem.id == item_id
        ).update({"order_num": index}, synchronize_session=False)

    db.commit()
    return {"message": "순서가 성공적으로 변경되었습니다."}

class ChapterItemSideBySide(BaseModel):
    text_item_id: str
    photo_block_id: str          # 붙일 사진 블록의 block_id
    position: str                # 'side-left' | 'side-right'

@router.put("/{chapter_id}/side-by-side")
def set_side_by_side(
    chapter_id: str,
    body: ChapterItemSideBySide,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    get_owned_chapter_or_404(chapter_id, current_user.id, db)

    # 텍스트 아이템 확인
    text_item = db.query(models.ChapterItem).filter(
        models.ChapterItem.id == body.text_item_id,
        models.ChapterItem.chapter_id == chapter_id,
        models.ChapterItem.item_type == "TEXT"
    ).first()
    if not text_item:
        raise HTTPException(status_code=404, detail="TEXT_ITEM_NOT_FOUND")

    # 사진 블록 아이템들 확인
    photo_items = db.query(models.ChapterItem).filter(
        models.ChapterItem.block_id == body.photo_block_id,
        models.ChapterItem.chapter_id == chapter_id,
        models.ChapterItem.item_type == "PHOTO"
    ).all()
    if not photo_items:
        raise HTTPException(status_code=404, detail="PHOTO_BLOCK_NOT_FOUND")

    # 텍스트 아이템에 block_id와 block_type 설정
    text_item.block_id = body.photo_block_id
    text_item.block_type = body.position  # 'side-left' | 'side-right'

    # 사진 아이템들도 block_type 동기화
    for photo_item in photo_items:
        photo_item.block_type = body.position

    db.commit()
    return {"message": "나란히 배치가 설정되었습니다."}


@router.put("/{chapter_id}/side-by-side/cancel")
def cancel_side_by_side(
    chapter_id: str,
    body: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Side-by-Side 해제 — 텍스트를 독립 블록으로 분리"""
    get_owned_chapter_or_404(chapter_id, current_user.id, db)

    text_item_id = body.get("text_item_id")
    text_item = db.query(models.ChapterItem).filter(
        models.ChapterItem.id == text_item_id,
        models.ChapterItem.chapter_id == chapter_id,
        models.ChapterItem.item_type == "TEXT"
    ).first()
    if not text_item:
        raise HTTPException(status_code=404, detail="TEXT_ITEM_NOT_FOUND")

    old_block_id = text_item.block_id

    # 텍스트를 독립 블록으로 분리
    text_item.block_id = text_item.id
    text_item.block_type = 'default'

    # 사진 블록도 default로 복구
    if old_block_id:
        photo_items = db.query(models.ChapterItem).filter(
            models.ChapterItem.block_id == old_block_id,
            models.ChapterItem.item_type == "PHOTO"
        ).all()
        for photo_item in photo_items:
            photo_item.block_type = 'default'

    db.commit()
    return {"message": "나란히 배치가 해제되었습니다."}


# 12. 사진 일괄 추가 (bulk)
class ChapterItemPhotoBulkAdd(BaseModel):
    photo_ids: List[str]

@router.post("/{chapter_id}/photos/bulk")
def bulk_add_photos_to_chapter(
    chapter_id: str,
    body: ChapterItemPhotoBulkAdd,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    get_owned_chapter_or_404(chapter_id, current_user.id, db)

    if not body.photo_ids:
        raise HTTPException(status_code=400, detail="PHOTO_IDS_EMPTY")

    # 이미 챕터에 있는 photo_id 목록을 한 번에 조회
    existing_ids = {
        row.photo_id for row in db.query(models.ChapterItem.photo_id).filter(
            models.ChapterItem.chapter_id == chapter_id,
            models.ChapterItem.item_type == "PHOTO",
            models.ChapterItem.photo_id.in_(body.photo_ids)
        ).all()
    }

    next_order = get_next_order_num(chapter_id, db)
    added = 0

    # bulk로 추가된 사진들은 같은 block_id 공유
    block_id = str(uuid.uuid4())
    order_in_block = 0

    for photo_id in body.photo_ids:
        if photo_id in existing_ids:
            continue
        db.add(models.ChapterItem(
            id=str(uuid.uuid4()),
            chapter_id=chapter_id,
            item_type="PHOTO",
            photo_id=photo_id,
            order_num=next_order,
            block_id=block_id,
            order_in_block=order_in_block,
            block_layout='grid'  # bulk 추가 기본값
        ))
        order_in_block += 1
        added += 1
    # next_order는 블록 하나이므로 1만 증가
    next_order += 1

    db.commit()
    return {"message": f"{added}장이 추가되었습니다.", "added": added, "skipped": len(body.photo_ids) - added}


@router.put("/{chapter_id}/blocks/{block_id}/reorder")
def reorder_block_photos(
    chapter_id: str,
    block_id: str,
    body: ChapterItemBlockReorder,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    get_owned_chapter_or_404(chapter_id, current_user.id, db)

    for index, item_id in enumerate(body.item_ids):
        db.query(models.ChapterItem).filter(
            models.ChapterItem.id == item_id,
            models.ChapterItem.block_id == block_id
        ).update({"order_in_block": index}, synchronize_session=False)
    db.commit()
    return {"message": "블록 내 순서가 변경되었습니다."}


class ChapterBlockLayoutUpdate(BaseModel):
    block_layout: Literal['grid', 'wide', 'single']


@router.put("/{chapter_id}/blocks/{block_id}/layout")
def update_block_layout(
    chapter_id: str,
    block_id: str,
    body: ChapterBlockLayoutUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """블록 단위 레이아웃 변경 — 같은 block_id를 공유하는 모든 아이템에 일괄 적용."""
    get_owned_chapter_or_404(chapter_id, current_user.id, db)

    updated = db.query(models.ChapterItem).filter(
        models.ChapterItem.chapter_id == chapter_id,
        models.ChapterItem.block_id == block_id
    ).update({"block_layout": body.block_layout}, synchronize_session=False)

    if updated == 0:
        raise HTTPException(status_code=404, detail="BLOCK_NOT_FOUND")

    db.commit()
    return {"message": "블록 레이아웃이 변경되었습니다.", "block_layout": body.block_layout}


# ── 하위 호환 엔드포인트 ────────────────────────────────────
# 기존 프론트엔드가 /photos 경로로 목록을 조회하는 코드가 있어
# 2단계(프론트 교체) 완료 전까지 유지. 교체 후 제거 예정.

@router.get("/{chapter_id}/photos")
def get_chapter_photos_legacy(
    chapter_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """[Deprecated] /items 로 마이그레이션 예정. PHOTO 타입 아이템만 반환."""
    get_owned_chapter_or_404(chapter_id, current_user.id, db)

    items = db.query(models.ChapterItem).filter(
        models.ChapterItem.chapter_id == chapter_id,
        models.ChapterItem.item_type == "PHOTO"
    ).order_by(models.ChapterItem.order_num).all()

    return [build_item_response(item) for item in items]


@router.delete("/{chapter_id}/photos/{photo_id}")
def remove_photo_legacy(
    chapter_id: str,
    photo_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """[Deprecated] /items/{item_id} 로 마이그레이션 예정."""
    get_owned_chapter_or_404(chapter_id, current_user.id, db)

    item = db.query(models.ChapterItem).filter(
        models.ChapterItem.chapter_id == chapter_id,
        models.ChapterItem.photo_id == photo_id,
        models.ChapterItem.item_type == "PHOTO"
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="PHOTO_NOT_FOUND")

    db.delete(item)
    db.commit()
    return {"message": "제거되었습니다"}


@router.put("/{chapter_id}/photos/{photo_id}")
def update_photo_order_legacy(
    chapter_id: str,
    photo_id: str,
    body: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """[Deprecated] /items/reorder 로 마이그레이션 예정."""
    get_owned_chapter_or_404(chapter_id, current_user.id, db)

    item = db.query(models.ChapterItem).filter(
        models.ChapterItem.chapter_id == chapter_id,
        models.ChapterItem.photo_id == photo_id,
        models.ChapterItem.item_type == "PHOTO"
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="PHOTO_NOT_IN_CHAPTER")

    item.order_num = body.get("order_num", item.order_num)
    db.commit()
    return {"message": "순서가 업데이트되었습니다"}