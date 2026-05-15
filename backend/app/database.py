from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from dotenv import load_dotenv
from datetime import datetime
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# DB 커넥션 풀 크기 — 환경변수로 조정 (P-L1).
# PG 기본 max_connections=100. uvicorn worker × (pool_size + max_overflow) 가 이를 넘지 않도록.
# 단일 워커 기준 보수적 기본값 사용. 멀티워커 스케일 시 줄이거나 PG max_connections 늘릴 것.
_DB_POOL_SIZE = int(os.getenv("DB_POOL_SIZE", "10"))
_DB_MAX_OVERFLOW = int(os.getenv("DB_MAX_OVERFLOW", "10"))

engine = create_engine(
    DATABASE_URL,
    pool_size=_DB_POOL_SIZE,
    max_overflow=_DB_MAX_OVERFLOW,
    pool_timeout=30,    # 커넥션 대기 최대 시간(초)
    pool_recycle=1800,  # 30분마다 커넥션 재생성 (DB 세션 만료 방지)
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@event.listens_for(Session, "before_flush")
def _touch_project_on_related_change(session, flush_context, instances):
    # Photo, Note, Chapter, ChapterItem 변경 시 부모 Project.updated_at 갱신
    from sqlalchemy import update as sa_update
    from .models import Photo, Note, Chapter, ChapterItem, Project

    project_ids: set[str] = set()
    chapter_ids_to_resolve: set[str] = set()

    for obj in (*session.new, *session.dirty, *session.deleted):
        if isinstance(obj, Photo) and obj.project_id:
            project_ids.add(obj.project_id)
        elif isinstance(obj, Note) and obj.project_id:
            project_ids.add(obj.project_id)
        elif isinstance(obj, Chapter) and obj.project_id:
            project_ids.add(obj.project_id)
        elif isinstance(obj, ChapterItem) and obj.chapter_id:
            chapter_ids_to_resolve.add(obj.chapter_id)

    # ChapterItem이 가리키는 Chapter들의 project_id를 일괄 조회 (개별 session.get 대신)
    if chapter_ids_to_resolve:
        rows = session.execute(
            Chapter.__table__.select()
            .with_only_columns(Chapter.project_id)
            .where(Chapter.id.in_(chapter_ids_to_resolve))
        ).all()
        for row in rows:
            if row[0]:
                project_ids.add(row[0])

    if not project_ids:
        return

    # session.get 루프 대신 단일 UPDATE 문으로 일괄 갱신
    now = datetime.utcnow()
    session.execute(
        sa_update(Project)
        .where(Project.id.in_(project_ids))
        .values(updated_at=now)
    )