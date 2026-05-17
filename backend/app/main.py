from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import engine, SessionLocal
from sqlalchemy import text
import app.models as models
from app.routers import projects, photos, portfolio, notes, auth, chapters, settings, delivery, admin, folder_links, og, comments
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta
import os
import asyncio
import logging
from app.routers.photos import delete_cf_files_parallel, _safe_local_upload_path

logger = logging.getLogger(__name__)

models.Base.metadata.create_all(bind=engine)

# 스키마 마이그레이션 — 버전이 올라간 경우에만 실행
SCHEMA_VERSION = 9

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

        # v4 — 인덱스 추가 + is_public Boolean 마이그레이션
        # P-M7: 자주 쿼리되는 컬럼 인덱스 추가
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_delivery_links_project_id ON delivery_links(project_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_delivery_selections_link_id ON delivery_selections(link_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_chapter_items_photo_id ON chapter_items(photo_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_chapter_items_block_id ON chapter_items(block_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_photos_project_filename ON photos(project_id, original_filename)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_photos_project_folder ON photos(project_id, folder)"))

        # P-M6: projects.is_public String → Boolean 마이그레이션 (idempotent)
        col_type = conn.execute(text(
            "SELECT data_type FROM information_schema.columns "
            "WHERE table_name='projects' AND column_name='is_public'"
        )).scalar()
        if col_type and col_type.lower() not in ("boolean", "bool"):
            conn.execute(text(
                "ALTER TABLE projects ALTER COLUMN is_public DROP DEFAULT"
            ))
            conn.execute(text(
                "ALTER TABLE projects ALTER COLUMN is_public TYPE BOOLEAN "
                "USING (CASE WHEN lower(is_public) IN ('true','t','1','yes') THEN true ELSE false END)"
            ))
            conn.execute(text(
                "ALTER TABLE projects ALTER COLUMN is_public SET DEFAULT false"
            ))
            conn.execute(text(
                "ALTER TABLE projects ALTER COLUMN is_public SET NOT NULL"
            ))

        # v5 — 프로젝트 조회수 컬럼
        conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0"))

        # v6 — 댓글 테이블
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS comments (
                id           VARCHAR PRIMARY KEY,
                project_id   VARCHAR NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                user_id      VARCHAR REFERENCES users(id) ON DELETE SET NULL,
                guest_name   VARCHAR(50),
                guest_email  VARCHAR(255),
                delete_token VARCHAR(64),
                ip_hash      VARCHAR(64) NOT NULL,
                body         TEXT NOT NULL,
                is_deleted   BOOLEAN NOT NULL DEFAULT FALSE,
                created_at   TIMESTAMP NOT NULL DEFAULT NOW()
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_comments_project_id ON comments(project_id)"))

        # v7 — 대댓글 지원 (parent_id 컬럼 + FK + 인덱스)
        conn.execute(text(
            "ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id VARCHAR"
        ))
        # FK 추가는 IF NOT EXISTS 미지원 — information_schema 로 존재 여부 확인 후 추가
        fk_exists = conn.execute(text(
            "SELECT 1 FROM information_schema.table_constraints "
            "WHERE table_name='comments' AND constraint_name='comments_parent_id_fkey'"
        )).scalar()
        if not fk_exists:
            conn.execute(text(
                "ALTER TABLE comments ADD CONSTRAINT comments_parent_id_fkey "
                "FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE"
            ))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_comments_parent_id ON comments(parent_id)"))

        # v8 — 댓글 알림 기능 제거: guest_email 컬럼 삭제
        conn.execute(text("ALTER TABLE comments DROP COLUMN IF EXISTS guest_email"))

        # v9 — 프로젝트 공개 시점(published_at) 추가 + 기존 공개 프로젝트 백필
        conn.execute(text(
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS published_at TIMESTAMP"
        ))
        conn.execute(text(
            "UPDATE projects SET published_at = created_at "
            "WHERE is_public = TRUE AND published_at IS NULL"
        ))

        conn.execute(text("DELETE FROM _schema_version"))
        conn.execute(text(f"INSERT INTO _schema_version (version) VALUES ({SCHEMA_VERSION})"))
        conn.commit()
        logger.info("스키마 마이그레이션 완료: version %d", SCHEMA_VERSION)

_run_schema_migrations()

app = FastAPI(title="Racconto API")

# SessionMiddleware secret — JWT용 SECRET_KEY와 분리.
# 미세팅 시 startup 실패 (OAuth state 쿠키 보안에 직접 영향).
SESSION_SECRET_KEY = os.getenv("SESSION_SECRET_KEY") or os.getenv("SECRET_KEY")
if not SESSION_SECRET_KEY:
    raise RuntimeError("SESSION_SECRET_KEY (또는 SECRET_KEY) 환경변수가 설정되지 않았습니다.")

app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET_KEY,
    same_site="lax",
    https_only=os.getenv("ENV", "development") == "production",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://racconto.app",
        "https://www.racconto.app",
        "https://test.racconto.app",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Delivery-Password"],
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
app.include_router(folder_links.router)
app.include_router(og.router)
app.include_router(comments.router)

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
            _safe_local_upload_path(p.image_url)
            for p in photos
            if p.image_url and "imagedelivery.net" not in p.image_url
        ]

        # CF 병렬 삭제 (APScheduler 스레드에서 실행되므로 asyncio.run 사용)
        if cf_urls:
            asyncio.run(delete_cf_files_parallel(cf_urls))

        # 로컬 파일 삭제 (path traversal 방어된 경로만)
        for path in local_paths:
            if not path:
                continue
            try:
                if os.path.exists(path):
                    os.remove(path)
            except Exception as e:
                logger.warning("로컬 파일 삭제 오류: %s", e)

        for project in old_projects:
            db.delete(project)
        db.commit()
        logger.info("자동 삭제: %d개 프로젝트 영구 삭제됨", len(old_projects))
    finally:
        db.close()

scheduler = BackgroundScheduler()
scheduler.add_job(auto_delete_trash, 'interval', hours=24)
scheduler.start()

@app.get("/")
def root():
    return {"message": "Racconto API is running"}

@app.api_route("/health", methods=["GET", "HEAD"])
def health():
    return {"status": "ok"}