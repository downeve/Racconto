from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import engine, SessionLocal
from sqlalchemy import text
import app.models as models
from app.routers import projects, photos, portfolio, notes, auth, chapters, settings, delivery, admin
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta
import os
import asyncio
import logging
from app.routers.photos import delete_cf_files_parallel

models.Base.metadata.create_all(bind=engine)

# 스키마 마이그레이션 — 버전이 올라간 경우에만 실행
SCHEMA_VERSION = 3

def _run_schema_migrations():
    with engine.connect() as conn:
        conn.execute(text(
            "CREATE TABLE IF NOT EXISTS _schema_version (version INTEGER NOT NULL)"
        ))
        row = conn.execute(text("SELECT version FROM _schema_version LIMIT 1")).fetchone()
        current = row[0] if row else 0
        if current >= SCHEMA_VERSION:
            return

        conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS order_num INTEGER NOT NULL DEFAULT 0"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS token_invalidated_at TIMESTAMP"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_users_oauth_id ON users(oauth_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_users_verify_token ON users(verify_token)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_users_reset_token ON users(reset_token)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_projects_user_id ON projects(user_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_projects_deleted_at ON projects(deleted_at)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_photos_project_id ON photos(project_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_photos_deleted_at ON photos(deleted_at)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_notes_project_id ON notes(project_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_notes_deleted_at ON notes(deleted_at)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_chapters_project_id ON chapters(project_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_chapter_items_chapter_id ON chapter_items(chapter_id)"))
        conn.execute(text("ALTER TABLE photos ADD COLUMN IF NOT EXISTS rotation INTEGER NOT NULL DEFAULT 0"))
        conn.execute(text("ALTER TABLE photos ADD COLUMN IF NOT EXISTS original_image_url VARCHAR"))
        conn.execute(text("ALTER TABLE photos ADD COLUMN IF NOT EXISTS is_rotating BOOLEAN NOT NULL DEFAULT false"))

        conn.execute(text("DELETE FROM _schema_version"))
        conn.execute(text(f"INSERT INTO _schema_version (version) VALUES ({SCHEMA_VERSION})"))
        conn.commit()
        print(f"스키마 마이그레이션 완료: version {SCHEMA_VERSION}")

_run_schema_migrations()

app = FastAPI(title="Racconto API")

app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SECRET_KEY", "change-this-in-production")
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://racconto.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router)
app.include_router(photos.router)
app.include_router(portfolio.router)
app.include_router(notes.router)
app.include_router(auth.router)
app.include_router(chapters.router)
app.include_router(settings.router)
app.include_router(delivery.router)
app.include_router(admin.router)

os.makedirs("app/uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="app/uploads"), name="uploads")

class SuppressRestoreByFilename404(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        msg = record.getMessage()
        return not ("POST /photos/restore-by-filename" in msg and "404" in msg)

logging.getLogger("uvicorn.access").addFilter(SuppressRestoreByFilename404())

# 휴지통 자동 삭제 스케줄러
def auto_delete_trash():
    db = SessionLocal()
    try:
        threshold = datetime.utcnow() - timedelta(days=30)
        old_projects = db.query(models.Project).filter(
            models.Project.deleted_at != None,
            models.Project.deleted_at < threshold
        ).all()
        if not old_projects:
            return

        project_ids = [p.id for p in old_projects]

        # 모든 프로젝트의 사진을 한 번에 조회
        photos = db.query(models.Photo).filter(
            models.Photo.project_id.in_(project_ids)
        ).all()

        # CF URL / 로컬 파일 분류
        cf_urls = [
            p.image_url for p in photos
            if p.image_url and "imagedelivery.net" in p.image_url
        ]
        local_paths = [
            f"app/uploads/{p.image_url.split('/uploads/')[-1]}"
            for p in photos
            if p.image_url and "imagedelivery.net" not in p.image_url
        ]

        # CF 병렬 삭제 (APScheduler 스레드에서 실행되므로 asyncio.run 사용)
        if cf_urls:
            asyncio.run(delete_cf_files_parallel(cf_urls))

        # 로컬 파일 삭제
        for path in local_paths:
            try:
                if os.path.exists(path):
                    os.remove(path)
            except Exception as e:
                print(f"로컬 파일 삭제 오류: {e}")

        for project in old_projects:
            db.delete(project)
        db.commit()
        print(f"자동 삭제: {len(old_projects)}개 프로젝트 영구 삭제됨")
    finally:
        db.close()

scheduler = BackgroundScheduler()
scheduler.add_job(auto_delete_trash, 'interval', hours=24)
scheduler.start()

@app.get("/")
def root():
    return {"message": "Racconto API is running"}