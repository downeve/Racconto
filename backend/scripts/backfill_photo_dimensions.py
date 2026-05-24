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
from PIL import Image, ImageOps
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


def _normalize_to_public(image_url: str) -> str:
    """imagedelivery.net URL 의 variant 부분을 강제로 'public' 으로 교체.

    DB 에 저장된 image_url 이 일관되지 않게 'thumb' 등 작은 variant 로 들어 있는 경우가 있어,
    그대로 fetch 하면 작은 dims 가 측정되어 프론트의 셀 비율 계산이 부정확해진다.
    프론트는 어차피 cfUrl(url, 'public') 로 항상 public 으로 바꿔 렌더링하므로,
    측정 기준도 public 으로 통일해야 일관성 확보.
    """
    if "imagedelivery.net" not in image_url:
        return image_url
    # 마지막 path 세그먼트(variant 명)를 'public' 으로 교체
    parts = image_url.rstrip("/").split("/")
    if len(parts) >= 6:
        parts[-1] = "public"
        return "/".join(parts)
    return image_url


def _measure_dims(img: Image.Image) -> tuple[int, int]:
    """EXIF orientation 을 적용해 브라우저가 실제로 표시하는 dims 와 일치시킴.

    PIL 은 기본적으로 EXIF Orientation 태그를 무시하고 raw 픽셀 dims 를 반환하지만,
    브라우저는 orientation 을 자동 적용. 둘을 맞춰야 프론트 ratio 계산이 정확해짐.
    """
    transposed = ImageOps.exif_transpose(img)
    return transposed.size if transposed else img.size


def _fetch_dimensions_from_url(image_url: str) -> tuple[int, int] | None:
    """이미지 URL을 GET해서 PIL로 차원 측정. 마지막 폴백.

    imagedelivery.net 의 경우 항상 public variant 로 fetch (DB image_url 이 thumb 등
    다른 variant 를 가리켜도 측정 기준을 통일).
    """
    fetch_url = _normalize_to_public(image_url)
    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.get(fetch_url)
            if resp.status_code != 200:
                return None
            img = Image.open(io.BytesIO(resp.content))
            return _measure_dims(img)
    except Exception as e:
        logger.warning("fetch_dimensions 실패: %s — %s", fetch_url[:60], e)
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
        return _measure_dims(img)
    except Exception as e:
        logger.warning("local PIL 실패: %s — %s", path, e)
        return None


def backfill(db: Session, dry_run: bool, limit: int | None, project_id: str | None, force: bool) -> None:
    q = db.query(models.Photo).filter(models.Photo.deleted_at.is_(None))
    if not force:
        q = q.filter(
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
    parser.add_argument("--force", action="store_true", help="이미 width/height 가 있는 사진도 다시 측정 (잘못 저장된 값 교정용)")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        backfill(db, dry_run=args.dry_run, limit=args.limit, project_id=args.project, force=args.force)
    finally:
        db.close()


if __name__ == "__main__":
    main()
