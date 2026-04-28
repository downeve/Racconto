from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from dotenv import load_dotenv
from datetime import datetime
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
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
    from .models import Photo, Note, Chapter, ChapterItem, Project

    project_ids: set[str] = set()

    for obj in (*session.new, *session.dirty, *session.deleted):
        if isinstance(obj, Photo) and obj.project_id:
            project_ids.add(obj.project_id)
        elif isinstance(obj, Note) and obj.project_id:
            project_ids.add(obj.project_id)
        elif isinstance(obj, Chapter) and obj.project_id:
            project_ids.add(obj.project_id)
        elif isinstance(obj, ChapterItem) and obj.chapter_id:
            chapter = session.get(Chapter, obj.chapter_id)
            if chapter and chapter.project_id:
                project_ids.add(chapter.project_id)

    now = datetime.utcnow()
    for pid in project_ids:
        project = session.get(Project, pid)
        if project:
            project.updated_at = now