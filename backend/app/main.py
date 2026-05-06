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
import logging
# ⭕️ 다음과 같이 수정 (app.routers.photos 로 변경)
from app.routers.photos import delete_from_cloudflare

models.Base.metadata.create_all(bind=engine)

# projects.order_num 컬럼 마이그레이션 (기존 DB에 없을 경우 추가)
with engine.connect() as conn:
    conn.execute(text(
        "ALTER TABLE projects ADD COLUMN IF NOT EXISTS order_num INTEGER NOT NULL DEFAULT 0"
    ))
    conn.commit()

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
        for project in old_projects:
            photos = db.query(models.Photo).filter(models.Photo.project_id == project.id).all()
            for photo in photos:
                try:
                    # [수정됨] 클라우드플레어 이미지인지 확인 후 삭제
                    if photo.image_url and "imagedelivery.net" in photo.image_url:
                        delete_from_cloudflare(photo.image_url)
                    else:
                        # 로컬 이미지 삭제 로직
                        file_path = photo.image_url.split('/uploads/')[-1]
                        full_path = f"app/uploads/{file_path}"
                        if os.path.exists(full_path):
                            os.remove(full_path)
                except Exception as e:
                    print(f"자동 삭제 중 이미지 삭제 오류: {e}")
                    pass
            db.delete(project)
        db.commit()
        if old_projects:
            print(f"자동 삭제: {len(old_projects)}개 프로젝트 영구 삭제됨")
    finally:
        db.close()

scheduler = BackgroundScheduler()
scheduler.add_job(auto_delete_trash, 'interval', hours=24)
scheduler.start()

@app.get("/")
def root():
    return {"message": "Racconto API is running"}