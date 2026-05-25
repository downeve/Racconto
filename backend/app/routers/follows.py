"""
커뮤니티 팔로우 — Phase 4.

보안 원칙 (지시서 명시):
- 다른 유저의 팔로워 수 / 목록을 조회하는 엔드포인트는 만들지 않는다.
- 본인 팔로워 수는 GET /follows/me/count 로만 접근.
- 팔로우 상태(/status) 는 본인이 대상 유저를 팔로우 중인지 boolean 만 반환.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import uuid

from app.database import get_db
from app import models
from app.auth import get_current_user_id, get_optional_current_user

router = APIRouter(prefix="/follows", tags=["follows"])


def _get_target_user(username: str, db: Session) -> models.User:
    target = db.query(models.User).filter(models.User.username == username).first()
    if not target:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
    return target


@router.post("/{username}")
def follow_user(
    username: str,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id),
):
    """대상 유저 팔로우. 이미 팔로우 중이면 그대로 200 OK (idempotent)."""
    target = _get_target_user(username, db)
    if target.id == current_user_id:
        raise HTTPException(status_code=400, detail="CANNOT_FOLLOW_SELF")

    try:
        follow = models.Follow(
            id=str(uuid.uuid4()),
            follower_id=current_user_id,
            following_id=target.id,
        )
        db.add(follow)
        db.commit()
    except IntegrityError:
        db.rollback()  # 이미 팔로우 중 — 무시
    return {"following": True}


@router.delete("/{username}")
def unfollow_user(
    username: str,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id),
):
    target = _get_target_user(username, db)
    db.query(models.Follow).filter(
        models.Follow.follower_id == current_user_id,
        models.Follow.following_id == target.id,
    ).delete()
    db.commit()
    return {"following": False}


@router.get("/status/{username}")
def get_follow_status(
    username: str,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_optional_current_user),
):
    """현재 사용자가 대상 유저를 팔로우 중인지 boolean. 비로그인은 무조건 false."""
    if not current_user:
        return {"following": False}
    target = _get_target_user(username, db)
    if target.id == current_user.id:
        # 본인은 자기 자신을 팔로우할 수 없음 → false
        return {"following": False, "is_self": True}
    exists = db.query(models.Follow).filter(
        models.Follow.follower_id == current_user.id,
        models.Follow.following_id == target.id,
    ).first() is not None
    return {"following": exists}


@router.get("/me/count")
def get_my_follower_count(
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id),
):
    """
    본인 팔로워 수 — 본인만 접근.
    절대 다른 유저의 카운트를 반환하지 않는다.
    """
    count = db.query(models.Follow).filter(
        models.Follow.following_id == current_user_id,
    ).count()
    return {"follower_count": count}
