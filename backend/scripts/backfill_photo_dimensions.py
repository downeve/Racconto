"""
P-7 백필 스크립트 — 기존 photos의 width/height NULL 컬럼을 채움.

데이터 소스:
1. Cloudflare Images: imagedelivery.net URL → CF API로 메타데이터 조회 (정확)
2. 자기 호스팅 /uploads: 파일을 PIL로 직접 읽음
3. CF API가 width/height를 반환 안 하면 public variant를 HTTP GET 받아 PIL 로드 (느리지만 정확)

실행:
    cd backend
    python -m scripts.backfill_photo_dimensions

옵션:
    --dry-run        실제 UPDATE 없이 결과만 출력
    --limit N        N개만 처리
    --project ID     특정 프로젝트만 처리

진행률 print, 실패는 건너뛰고 다음 사진 계속.
"""
from __future__ import annotations

import argparse
import io
import logging
import os
import sys

# 패키지 경로 보정 — `python -m scripts.backfill_photo_dimensions` 호출 가정
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx
from PIL import Image
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app import models

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
logger = logging.getLogger(__name__)

CF_ACCOUNT_ID = os.getenv("CF_ACCOUNT_ID")
CF_API_TOKEN = os.getenv("CF_API_TOKEN")


def _cf_image_id_from_url(image_url: str) -> str | None:
    """https://imagedelivery.net/{accountHash}/{imageId}/{variant} → imageId"""
    if "imagedelivery.net" not in image_url:
        return None
    parts = image_url.rstrip("/").split("/")
    # ['https:', '', 'imagedelivery.net', accountHash, imageId, variant]
    if len(parts) >= 5:
        return parts[4]
    return None


def _fetch_dimensions_from_url(image_url: str) -> tuple[int, int] | None:
    """이미지 URL을 GET해서 PIL로 차원 측정. 마지막 폴백."""
    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.get(image_url)
            if resp.status_code != 200:
                return None
            img = Image.open(io.BytesIO(resp.content))
            return img.size  # (w, h)
    except Exception as e:
        logger.warning("fetch_dimensions 실패: %s — %s", image_url[:60], e)
        return None


def _fetch_dimensions_local(image_url: str) -> tuple[int, int] | None:
    """자기 호스팅 /uploads 경로면 로컬 파일에서 직접 측정."""
    if "/uploads/" not in image_url:
        return None
    # /uploads/foo.jpg → app/uploads/foo.jpg
    filename = image_url.split("/uploads/", 1)[1]
    path = os.path.join("app", "uploads", filename)
    if not os.path.exists(path):
        return None
    try:
        img = Image.open(path)
        return img.size
    except Exception as e:
        logger.warning("local PIL 실패: %s — %s", path, e)
        return None


def backfill(db: Session, dry_run: bool, limit: int | None, project_id: str | None) -> None:
    q = db.query(models.Photo).filter(
        (models.Photo.width.is_(None)) | (models.Photo.height.is_(None))
    )
    if project_id:
        q = q.filter(models.Photo.project_id == project_id)
    if limit:
        q = q.limit(limit)
    photos = q.all()
    total = len(photos)
    logger.info("백필 대상: %d개 사진", total)

    success = 0
    failed = 0
    for i, photo in enumerate(photos, 1):
        if not photo.image_url:
            failed += 1
            continue

        dims = _fetch_dimensions_local(photo.image_url)
        if dims is None:
            dims = _fetch_dimensions_from_url(photo.image_url)

        if dims is None:
            failed += 1
            if i % 20 == 0:
                logger.info("진행: %d/%d (실패 %d)", i, total, failed)
            continue

        w, h = dims
        if not dry_run:
            photo.width = w
            photo.height = h

        success += 1
        if i % 20 == 0:
            logger.info("진행: %d/%d (성공 %d, 실패 %d)", i, total, success, failed)

    if not dry_run:
        db.commit()
        logger.info("커밋 완료")
    else:
        logger.info("DRY RUN — DB 변경 없음")
    logger.info("최종: 총 %d, 성공 %d, 실패 %d", total, success, failed)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--project", type=str, default=None, help="특정 project_id만 처리")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        backfill(db, dry_run=args.dry_run, limit=args.limit, project_id=args.project)
    finally:
        db.close()


if __name__ == "__main__":
    main()
