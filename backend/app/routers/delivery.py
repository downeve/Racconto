from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app import models
from app.auth import get_current_user_id
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


def _get_delivery_tag_color(db: Session, user_id: str) -> Optional[str]:
    """설정에서 납품 선택 자동 태그 컬러 조회.

    M8: 작가(user_id) 본인의 설정만 조회하도록 필터. 이전엔 임의 유저 setting을 가져옴.
    """
    setting = db.query(models.Setting).filter(
        models.Setting.user_id == user_id,
        models.Setting.key == 'delivery_tag_color',
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
    current_user_id: str = Depends(get_current_user_id),
):
    if not DELIVERY_ENABLED:  # 🆕 추가
        raise HTTPException(status_code=404, detail="Feature not available")

    # 프로젝트 소유권 검증
    project = db.query(models.Project).filter(
        models.Project.id == body.project_id,
        models.Project.user_id == current_user_id,
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
    current_user_id: str = Depends(get_current_user_id),
):
    if not DELIVERY_ENABLED:  # 🆕 추가
        raise HTTPException(status_code=404, detail="Feature not available")

    # 프로젝트 소유권 검증
    project = db.query(models.Project.id).filter(
        models.Project.id == project_id,
        models.Project.user_id == current_user_id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다")

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
    current_user_id: str = Depends(get_current_user_id),
):
    if not DELIVERY_ENABLED:  # 🆕 추가
        raise HTTPException(status_code=404, detail="Feature not available")

    # link → project → user_id 검증
    link = (
        db.query(models.DeliveryLink)
        .join(models.Project, models.DeliveryLink.project_id == models.Project.id)
        .filter(
            models.DeliveryLink.id == link_id,
            models.Project.user_id == current_user_id,
        )
        .first()
    )
    if not link:
        raise HTTPException(status_code=404, detail="링크를 찾을 수 없습니다")

    sels = (
        db.query(models.DeliverySelection)
        .filter(models.DeliverySelection.link_id == link_id)
        .all()
    )
    if not sels:
        return []

    # P-H2: 개별 SELECT 대신 IN 쿼리 1번
    photo_ids = [s.photo_id for s in sels]
    photos_map = {
        p.id: p
        for p in db.query(models.Photo).filter(models.Photo.id.in_(photo_ids)).all()
    }
    result = []
    for s in sels:
        photo = photos_map.get(s.photo_id)
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
    current_user_id: str = Depends(get_current_user_id),
):
    if not DELIVERY_ENABLED:  # 🆕 추가
        raise HTTPException(status_code=404, detail="Feature not available")

    # link → project → user_id 검증
    link = (
        db.query(models.DeliveryLink)
        .join(models.Project, models.DeliveryLink.project_id == models.Project.id)
        .filter(
            models.DeliveryLink.id == link_id,
            models.Project.user_id == current_user_id,
        )
        .first()
    )
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
    ).delete(synchronize_session=False)

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
    # P-H4 + M8: 작가(프로젝트 owner)의 설정 조회, photo 전수 로딩 없이 두 번의 UPDATE로 처리
    project = db.query(models.Project).filter(
        models.Project.id == link.project_id
    ).first()
    if project:
        tag_color = _get_delivery_tag_color(db, project.user_id)
        if tag_color:
            if selected_photo_ids:
                # 선택된 사진 → 태그 컬러 부여
                db.query(models.Photo).filter(
                    models.Photo.project_id == link.project_id,
                    models.Photo.id.in_(selected_photo_ids),
                ).update({"color_label": tag_color}, synchronize_session=False)
                # 선택 해제된 사진 중 기존 태그 컬러 → 제거
                db.query(models.Photo).filter(
                    models.Photo.project_id == link.project_id,
                    models.Photo.color_label == tag_color,
                    ~models.Photo.id.in_(selected_photo_ids),
                ).update({"color_label": None}, synchronize_session=False)
            else:
                # 전체 선택 해제 — 이 프로젝트에서 태그 컬러였던 사진 모두 NULL
                db.query(models.Photo).filter(
                    models.Photo.project_id == link.project_id,
                    models.Photo.color_label == tag_color,
                ).update({"color_label": None}, synchronize_session=False)

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