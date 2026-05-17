"""
포트폴리오 프로젝트 댓글 + 대댓글 — 공개 엔드포인트.

- 로그인 유저는 user_id 로 연결
- 비로그인 유저는 guest_name + delete_token 으로 식별
- 소프트 삭제만 (is_deleted=True), 행 삭제 금지
- IP 는 sha256 해싱 후 저장. 응답에 절대 포함 금지.
- 대댓글은 1단계만 허용. parent_id 가 있는 댓글에 다시 답글 불가.
- 비로그인(로그아웃) 조회자에게는 삭제된 댓글/대댓글을 응답에서 제외.
"""
from __future__ import annotations

import hashlib
import secrets
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.auth import get_optional_current_user

router = APIRouter(prefix="/comments", tags=["comments"])

DELETED_PLACEHOLDER = "삭제된 댓글입니다."


# ── helpers ────────────────────────────────────────────────────────────────

def _client_ip(request: Request) -> str:
    return (
        request.headers.get("CF-Connecting-IP")
        or request.headers.get("X-Real-IP")
        or request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        or (request.client.host if request.client else "")
    )


def _hash_ip(ip: str) -> str:
    return hashlib.sha256(ip.encode("utf-8")).hexdigest()


def _get_public_project_or_404(project_id: str, db: Session) -> models.Project:
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.is_public == True,  # noqa: E712
        models.Project.deleted_at == None,  # noqa: E711
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="PROJECT_NOT_FOUND")
    return project


def _serialize_comment(
    c: models.Comment,
    *,
    users_by_id: dict[str, models.User],
    project: models.Project,
    current_user_id: Optional[str],
    is_owner_viewer: bool,
) -> dict:
    author_user = users_by_id.get(c.user_id) if c.user_id else None
    author_name = (author_user.username if author_user else c.guest_name) or "익명"
    is_mine = bool(current_user_id and c.user_id and c.user_id == current_user_id)
    author_is_owner = bool(c.user_id and c.user_id == project.user_id)
    return {
        "id": c.id,
        "parent_id": c.parent_id,
        "author_name": author_name,
        "is_owner": is_owner_viewer,         # 현재 요청자가 포폴 주인인지 (스펙)
        "author_is_owner": author_is_owner,  # 댓글 작성자가 포폴 주인인지 (Author 배지)
        "is_mine": is_mine,
        "body": DELETED_PLACEHOLDER if c.is_deleted else c.body,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "is_deleted": c.is_deleted,
        "can_delete": bool((is_mine or is_owner_viewer) and not c.is_deleted),
    }


# ── schemas ────────────────────────────────────────────────────────────────

class CommentCreate(BaseModel):
    parent_id: Optional[str] = None
    guest_name: Optional[str] = Field(default=None, max_length=50)
    body: str = Field(min_length=1, max_length=500)


# ── endpoints ──────────────────────────────────────────────────────────────

@router.get("/{project_id}")
def list_comments(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_optional_current_user),
):
    project = _get_public_project_or_404(project_id, db)

    comments = db.query(models.Comment).filter(
        models.Comment.project_id == project.id
    ).order_by(models.Comment.created_at.asc()).all()

    # 작성자 username prefetch
    user_ids = {c.user_id for c in comments if c.user_id}
    users_by_id: dict[str, models.User] = {}
    if user_ids:
        for u in db.query(models.User).filter(models.User.id.in_(user_ids)).all():
            users_by_id[u.id] = u

    current_user_id = current_user.id if current_user else None
    is_owner_viewer = bool(current_user_id and current_user_id == project.user_id)

    # 표시 규칙 (모든 조회자 동일):
    #   1. 대댓글이 없는 상태에서 최상위 댓글이 삭제된 경우 → 응답에서 제외
    #   2. 대댓글이 있는 상태에서 최상위 댓글이 삭제된 경우 → "삭제된 댓글입니다." placeholder 로 자리 보존
    #   3. 대댓글이 삭제된 경우 → 응답에서 제외 (자식만 빠짐, 부모는 유지)
    children_by_parent: dict[str, list[models.Comment]] = {}
    top_levels: list[models.Comment] = []
    for c in comments:
        if c.parent_id is None:
            top_levels.append(c)
        else:
            children_by_parent.setdefault(c.parent_id, []).append(c)

    result = []
    for top in top_levels:
        # 살아있는 대댓글만 통과 (규칙 3)
        live_children = [r for r in children_by_parent.get(top.id, []) if not r.is_deleted]

        # 규칙 1: 삭제된 최상위 + 살아있는 자식 없음 → 전체 숨김
        if top.is_deleted and not live_children:
            continue

        # 규칙 2 는 _serialize_comment 의 is_deleted 처리에서 자동으로 placeholder 반환
        item = _serialize_comment(
            top,
            users_by_id=users_by_id,
            project=project,
            current_user_id=current_user_id,
            is_owner_viewer=is_owner_viewer,
        )
        item["replies"] = [
            _serialize_comment(
                ch,
                users_by_id=users_by_id,
                project=project,
                current_user_id=current_user_id,
                is_owner_viewer=is_owner_viewer,
            )
            for ch in live_children
        ]
        result.append(item)

    return result


@router.post("/{project_id}")
def create_comment(
    project_id: str,
    payload: CommentCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_optional_current_user),
):
    project = _get_public_project_or_404(project_id, db)

    body = payload.body.strip()
    if not body:
        raise HTTPException(status_code=400, detail="COMMENT_BODY_REQUIRED")

    # 대댓글 검증
    parent_id: Optional[str] = None
    if payload.parent_id:
        parent = db.query(models.Comment).filter(
            models.Comment.id == payload.parent_id
        ).first()
        if not parent or parent.project_id != project.id:
            raise HTTPException(status_code=404, detail="PARENT_COMMENT_NOT_FOUND")
        if parent.parent_id is not None:
            # 대댓글의 대댓글 금지 (1단계 제한)
            raise HTTPException(status_code=400, detail="REPLY_NESTING_NOT_ALLOWED")
        parent_id = parent.id

    ip_hash = _hash_ip(_client_ip(request))
    comment = models.Comment(
        project_id=project.id,
        parent_id=parent_id,
        ip_hash=ip_hash,
        body=body,
    )

    if current_user is not None:
        comment.user_id = current_user.id
        comment.guest_name = None
        comment.delete_token = None
    else:
        guest_name = (payload.guest_name or "").strip()
        if not guest_name:
            raise HTTPException(status_code=400, detail="GUEST_NAME_REQUIRED")
        if len(guest_name) > 50:
            raise HTTPException(status_code=400, detail="GUEST_NAME_TOO_LONG")
        comment.guest_name = guest_name
        comment.delete_token = secrets.token_urlsafe(32)

    db.add(comment)
    db.commit()
    db.refresh(comment)

    author_name = (
        current_user.username if current_user and current_user.username
        else comment.guest_name or "익명"
    )
    return {
        "id": comment.id,
        "parent_id": comment.parent_id,
        "author_name": author_name,
        "body": comment.body,
        "created_at": comment.created_at.isoformat() if comment.created_at else None,
        "delete_token": comment.delete_token,  # 비로그인 전용, 로그인 시 None
    }


@router.delete("/{comment_id}")
def delete_comment(
    comment_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_optional_current_user),
    token: Optional[str] = None,
):
    comment = db.query(models.Comment).filter(models.Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="COMMENT_NOT_FOUND")
    if comment.is_deleted:
        return {"ok": True}

    project = db.query(models.Project).filter(models.Project.id == comment.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="PROJECT_NOT_FOUND")

    authorized = False
    if current_user is not None:
        if comment.user_id and comment.user_id == current_user.id:
            authorized = True
        elif project.user_id == current_user.id:
            authorized = True

    if not authorized:
        if token and comment.delete_token and secrets.compare_digest(token, comment.delete_token):
            authorized = True

    if not authorized:
        raise HTTPException(status_code=403, detail="FORBIDDEN")

    comment.is_deleted = True
    db.commit()
    return {"ok": True}
