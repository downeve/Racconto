"""기존 프로젝트에 slug 백필. 한 번만 실행."""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal
from app import models
from app.routers.projects import slugify


def generate_unique_slug_for_backfill(db, base: str, exclude_id: str) -> str:
    slug = slugify(base)
    candidate = slug
    counter = 2
    while db.query(models.Project).filter(
        models.Project.slug == candidate,
        models.Project.id != exclude_id
    ).first():
        candidate = f"{slug}-{counter}"
        counter += 1
    return candidate


def main():
    db = SessionLocal()
    try:
        projects = db.query(models.Project).filter(models.Project.slug == None).all()
        print(f"백필 대상: {len(projects)}개")
        for p in projects:
            base = p.title_en or p.title or p.id[:8]
            slug = generate_unique_slug_for_backfill(db, base, p.id)
            p.slug = slug
            print(f"  {p.id[:8]}... → {slug}")
        db.commit()
        print("완료")
    finally:
        db.close()


if __name__ == "__main__":
    main()
