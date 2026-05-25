"""
커뮤니티 탐색 피드 — /explore

원칙:
- 좋아요 / 알고리즘 없음 (시간순)
- show_in_explore = True 인 모든 포폴 (작가가 explore 에 공개한 것 전부 노출)
- 사진 5 장 이상 (최소 품질)
- 인증 불필요 (공개)
"""

from typing import Optional, Literal
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, func, or_, and_
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app import models

router = APIRouter(prefix="/explore", tags=["explore"])


def _serialize_explore_item(p: models.Project, photo_count: int) -> dict:
    return {
        "id": p.id,
        "title": p.title,
        "slug": p.slug,
        "cover_image_url": p.cover_image_url,
        "camera_type": p.camera_type,
        "tags": p.tags or [],
        "photo_count": photo_count,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
        "published_at": p.published_at.isoformat() if p.published_at else None,
        "author": {
            "username": p.owner.username if p.owner else None,
        },
    }


@router.get("/feed")
def get_explore_feed(
    cursor: Optional[str] = Query(None, description="ISO datetime — 이 시각 이전 포폴"),
    limit: int = Query(24, ge=1, le=48),
    camera_type: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    show_in_explore = True 인 모든 포폴을 '가장 최근 공개 시점' 내림차순으로 노출.
    정렬 키: COALESCE(published_at, updated_at). 비공개→공개 전환 시점이 우선.
    필터: camera_type, tag (선택).
    """

    # photo_count subquery (deleted_at IS NULL 만 카운트)
    photo_count_sq = (
        db.query(
            models.Photo.project_id.label('project_id'),
            func.count(models.Photo.id).label('photo_count')
        )
        .filter(models.Photo.deleted_at == None)
        .group_by(models.Photo.project_id)
        .subquery()
    )

    # 정렬 키 — 공개 시점 우선. published_at 백필되지 않은 잔존 레코드는 updated_at fallback.
    sort_key = func.coalesce(models.Project.published_at, models.Project.updated_at)

    query = (
        db.query(models.Project, photo_count_sq.c.photo_count)
        .join(photo_count_sq, photo_count_sq.c.project_id == models.Project.id)
        .options(joinedload(models.Project.owner))
        .filter(
            models.Project.is_public == True,
            models.Project.show_in_explore == True,
            models.Project.deleted_at == None,
            photo_count_sq.c.photo_count >= 5,
        )
    )

    if camera_type:
        query = query.filter(models.Project.camera_type == camera_type)
    if tag:
        # JSONB contains — Postgres 의존
        query = query.filter(models.Project.tags.contains([tag.lower()]))

    if cursor:
        try:
            cursor_dt = datetime.fromisoformat(cursor)
            query = query.filter(sort_key < cursor_dt)
        except ValueError:
            pass  # cursor 형식이 잘못되면 무시하고 첫 페이지부터

    rows = query.order_by(desc(sort_key)).limit(limit + 1).all()

    has_more = len(rows) > limit
    rows = rows[:limit]
    if has_more and rows:
        last = rows[-1][0]
        next_cursor_dt = last.published_at or last.updated_at
        next_cursor = next_cursor_dt.isoformat() if next_cursor_dt else None
    else:
        next_cursor = None

    return {
        "items": [_serialize_explore_item(p, pc) for p, pc in rows],
        "next_cursor": next_cursor,
        "has_more": has_more,
    }


@router.get("/search")
def search(
    q: str = Query(..., min_length=2, max_length=50),
    type: Literal['user', 'portfolio', 'all'] = 'all',
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """
    유저명 prefix + 포폴 제목/태그 검색.
    Phase 3 의 일부로 함께 구현 — 우선 ILIKE 기반, 다국어 FTS 는 추후.
    """
    q_lower = q.lower()
    results: dict = {"users": [], "portfolios": []}

    if type in ('user', 'all'):
        # show_in_explore 포폴이 있는 사진가만 노출. 각 사진가의 최신 explore 포폴 cover 동봉.
        latest_explore_pf_sq = (
            db.query(
                models.Project.user_id.label('user_id'),
                func.max(models.Project.updated_at).label('latest_at'),
            )
            .filter(
                models.Project.is_public == True,
                models.Project.show_in_explore == True,
                models.Project.deleted_at == None,
            )
            .group_by(models.Project.user_id)
            .subquery()
        )

        user_rows = (
            db.query(models.User, models.Project)
            .join(latest_explore_pf_sq, latest_explore_pf_sq.c.user_id == models.User.id)
            .join(
                models.Project,
                and_(
                    models.Project.user_id == latest_explore_pf_sq.c.user_id,
                    models.Project.updated_at == latest_explore_pf_sq.c.latest_at,
                )
            )
            .filter(
                models.User.username != None,
                models.User.username.ilike(f"{q}%"),
                models.Project.is_public == True,
                models.Project.show_in_explore == True,
                models.Project.deleted_at == None,
            )
            .order_by(desc(models.Project.updated_at))
            .limit(limit)
            .all()
        )
        results["users"] = [
            {
                "username": u.username,
                "cover_image_url": p.cover_image_url,
                "latest_slug": p.slug,
            }
            for u, p in user_rows
            if u.username
        ]

    if type in ('portfolio', 'all'):
        photo_count_sq = (
            db.query(
                models.Photo.project_id.label('project_id'),
                func.count(models.Photo.id).label('photo_count')
            )
            .filter(models.Photo.deleted_at == None)
            .group_by(models.Photo.project_id)
            .subquery()
        )

        portfolios = (
            db.query(models.Project, photo_count_sq.c.photo_count)
            .outerjoin(photo_count_sq, photo_count_sq.c.project_id == models.Project.id)
            .options(joinedload(models.Project.owner))
            .filter(
                models.Project.is_public == True,
                models.Project.show_in_explore == True,
                models.Project.deleted_at == None,
                or_(
                    models.Project.title.ilike(f"%{q}%"),
                    models.Project.tags.contains([q_lower]),
                ),
            )
            .order_by(desc(models.Project.updated_at))
            .limit(limit)
            .all()
        )
        results["portfolios"] = [
            _serialize_explore_item(p, pc or 0) for p, pc in portfolios
        ]

    return results
