from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app import models
from app.routers.auth import verify_token
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid, bcrypt

import os

router = APIRouter(prefix="/api/delivery", tags=["delivery"])

# Feature Flag
DELIVERY_ENABLED = os.getenv("ENABLE_DELIVERY_FEATURE", "false").lower() == "true"

# ── Pydantic 스키마 ────────────────────────────────────────

class DeliveryLinkCreate(BaseModel):
    project_id: str
    label: Optional[str] = None
    password: Optional[str] = None
    expires_at: Optional[datetime] = None
    filter_rating: Optional[int] = None
    filter_color: Optional[str] = None

class DeliveryLinkOut(BaseModel):
    id: str
    project_id: str
    label: Optional[str]
    has_password: bool
    expires_at: Optional[datetime]
    created_at: datetime
    selection_count: int
    filter_rating: Optional[int]
    filter_color: Optional[str]

    class Config:
        from_attributes = True

class PasswordVerify(BaseModel):
    password: str

class SelectionItem(BaseModel):
    photo_id: str
    comment: Optional[str] = None

class SelectionsBatch(BaseModel):
    selections: List[SelectionItem]

class SelectionOut(BaseModel):
    photo_id: str
    comment: Optional[str]
    selected_at: datetime
    image_url: str
    caption: Optional[str]
    order: int

    class Config:
        from_attributes = True


# ── 헬퍼 ──────────────────────────────────────────────────

def _check_link(link_id: str, db: Session) -> models.DeliveryLink:
    link = db.query(models.DeliveryLink).filter(models.DeliveryLink.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="링크를 찾을 수 없습니다")
    if link.expires_at and link.expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="만료된 링크입니다")
    return link


def _filter_photos(query, link: models.DeliveryLink):
    """OR 조건: 별점 이상 또는 컬러 레이블"""
    if link.filter_rating is not None and link.filter_color is not None:
        query = query.filter(or_(
            models.Photo.rating >= link.filter_rating,
            models.Photo.color_label == link.filter_color
        ))
    elif link.filter_rating is not None:
        query = query.filter(models.Photo.rating >= link.filter_rating)
    elif link.filter_color is not None:
        query = query.filter(models.Photo.color_label == link.filter_color)
    return query


def _get_delivery_tag_color(db: Session) -> Optional[str]:
    """설정에서 납품 선택 자동 태그 컬러 조회"""
    setting = db.query(models.Setting).filter(
        models.Setting.key == 'delivery_tag_color'
    ).first()
    # 값이 없거나 빈 문자열이면 태그 안 함
    if not setting or not setting.value:
        return None
    return setting.value


# ── 작가용 엔드포인트 (JWT 필요) ───────────────────────────

@router.post("", response_model=DeliveryLinkOut)
def create_link(
    body: DeliveryLinkCreate,
    db: Session = Depends(get_db),
    _=Depends(verify_token),
):
    if not DELIVERY_ENABLED:  # 🆕 추가
        raise HTTPException(status_code=404, detail="Feature not available")

    project = db.query(models.Project).filter(
        models.Project.id == body.project_id,
        models.Project.deleted_at == None,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다")

    pw_hash = None
    if body.password:
        pw_hash = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()

    link = models.DeliveryLink(
        id=str(uuid.uuid4()),
        project_id=body.project_id,
        label=body.label,
        password_hash=pw_hash,
        expires_at=body.expires_at,
        filter_rating=body.filter_rating,
        filter_color=body.filter_color,
    )
    db.add(link)
    db.commit()
    db.refresh(link)

    return _link_out(link)


@router.get("/project/{project_id}", response_model=List[DeliveryLinkOut])
def list_links(
    project_id: str,
    db: Session = Depends(get_db),
    _=Depends(verify_token),
):
    if not DELIVERY_ENABLED:  # 🆕 추가
        raise HTTPException(status_code=404, detail="Feature not available")

    links = (
        db.query(models.DeliveryLink)
        .filter(models.DeliveryLink.project_id == project_id)
        .order_by(models.DeliveryLink.created_at.desc())
        .all()
    )
    return [_link_out(l) for l in links]


@router.get("/{link_id}/selections", response_model=List[SelectionOut])
def get_selections(
    link_id: str,
    db: Session = Depends(get_db),
    _=Depends(verify_token),
):
    if not DELIVERY_ENABLED:  # 🆕 추가
        raise HTTPException(status_code=404, detail="Feature not available")

    link = db.query(models.DeliveryLink).filter(models.DeliveryLink.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="링크를 찾을 수 없습니다")

    sels = (
        db.query(models.DeliverySelection)
        .filter(models.DeliverySelection.link_id == link_id)
        .all()
    )
    result = []
    for s in sels:
        photo = db.query(models.Photo).filter(models.Photo.id == s.photo_id).first()
        if photo:
            result.append(SelectionOut(
                photo_id=s.photo_id,
                comment=s.comment,
                selected_at=s.selected_at,
                image_url=photo.image_url,
                caption=photo.caption,
                order=photo.order,
            ))
    return result


@router.delete("/{link_id}")
def delete_link(
    link_id: str,
    db: Session = Depends(get_db),
    _=Depends(verify_token),
):
    if not DELIVERY_ENABLED:  # 🆕 추가
        raise HTTPException(status_code=404, detail="Feature not available")

    link = db.query(models.DeliveryLink).filter(models.DeliveryLink.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="링크를 찾을 수 없습니다")
    db.delete(link)
    db.commit()
    return {"ok": True}


# ── 클라이언트용 엔드포인트 (공개) ────────────────────────
@router.get("/{link_id}")
def get_link_public(link_id: str, db: Session = Depends(get_db)):
    if not DELIVERY_ENABLED:  # 🆕 추가
        raise HTTPException(status_code=404, detail="Feature not available")

    link = _check_link(link_id, db)
    project = db.query(models.Project).filter(models.Project.id == link.project_id).first()
    return {
        "id": link.id,
        "project_title": project.title if project else "",
        "label": link.label,
        "has_password": link.password_hash is not None,
        "expires_at": link.expires_at,
    }

@router.post("/{link_id}/verify")
def verify_password(link_id: str, body: PasswordVerify, db: Session = Depends(get_db)):
    if not DELIVERY_ENABLED:  # 🆕 추가
        raise HTTPException(status_code=404, detail="Feature not available")

    link = _check_link(link_id, db)
    if not link.password_hash:
        return {"ok": True}
    if not bcrypt.checkpw(body.password.encode(), link.password_hash.encode()):
        raise HTTPException(status_code=401, detail="비밀번호가 올바르지 않습니다")
    return {"ok": True}


@router.get("/{link_id}/photos")
def get_link_photos(
    link_id: str,
    x_delivery_password: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    if not DELIVERY_ENABLED:  # 🆕 추가
        raise HTTPException(status_code=404, detail="Feature not available")
    
    link = _check_link(link_id, db)

    if link.password_hash:
        if not x_delivery_password:
            raise HTTPException(status_code=401, detail="비밀번호가 필요합니다")
        if not bcrypt.checkpw(x_delivery_password.encode(), link.password_hash.encode()):
            raise HTTPException(status_code=401, detail="비밀번호가 올바르지 않습니다")

    query = db.query(models.Photo).filter(models.Photo.project_id == link.project_id)
    query = _filter_photos(query, link)
    photos = query.order_by(models.Photo.order).all()

    selected_ids = {
        s.photo_id: s.comment
        for s in db.query(models.DeliverySelection)
        .filter(models.DeliverySelection.link_id == link_id)
        .all()
    }

    return [
        {
            "id": p.id,
            "image_url": p.image_url,
            "caption": p.caption,
            "order": p.order,
            "is_selected": p.id in selected_ids,
            "comment": selected_ids.get(p.id),
        }
        for p in photos
    ]

@router.put("/{link_id}/selections")
def save_selections(
    link_id: str,
    body: SelectionsBatch,
    x_delivery_password: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    if not DELIVERY_ENABLED:  # 🆕 추가
        raise HTTPException(status_code=404, detail="Feature not available")

    link = _check_link(link_id, db)

    if link.password_hash:
        if not x_delivery_password:
            raise HTTPException(status_code=401, detail="비밀번호가 필요합니다")
        if not bcrypt.checkpw(x_delivery_password.encode(), link.password_hash.encode()):
            raise HTTPException(status_code=401, detail="비밀번호가 올바르지 않습니다")

    # 기존 선택 삭제 후 재삽입
    db.query(models.DeliverySelection).filter(
        models.DeliverySelection.link_id == link_id
    ).delete()

    selected_photo_ids = []
    for item in body.selections:
        sel = models.DeliverySelection(
            id=str(uuid.uuid4()),
            link_id=link_id,
            photo_id=item.photo_id,
            comment=item.comment,
        )
        db.add(sel)
        selected_photo_ids.append(item.photo_id)

    # ── 자동 컬러 레이블 태깅 ──────────────────────────────
    tag_color = _get_delivery_tag_color(db)
    if tag_color:
        # 이 링크의 프로젝트 사진 전체 조회
        all_photos = db.query(models.Photo).filter(
            models.Photo.project_id == link.project_id
        ).all()

        for photo in all_photos:
            if photo.id in selected_photo_ids:
                # 선택된 사진 → 태그 컬러 부여
                photo.color_label = tag_color
            else:
                # 선택 해제된 사진 → 기존에 태그 컬러였으면 제거
                if photo.color_label == tag_color:
                    photo.color_label = None

    db.commit()
    return {"ok": True, "count": len(selected_photo_ids)}


# ── 내부 헬퍼 ──────────────────────────────────────────────

def _link_out(link: models.DeliveryLink) -> DeliveryLinkOut:
    return DeliveryLinkOut(
        id=link.id,
        project_id=link.project_id,
        label=link.label,
        has_password=link.password_hash is not None,
        expires_at=link.expires_at,
        created_at=link.created_at,
        selection_count=len(link.selections),
        filter_rating=link.filter_rating,
        filter_color=link.filter_color,
    )