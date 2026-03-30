from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import engine, SessionLocal
import app.models as models
from app.routers import projects, photos, portfolio, notes, auth, chapters, settings
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta
import os

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="FotoPM API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://fotopm.fototime.kr"],
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

os.makedirs("app/uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="app/uploads"), name="uploads")

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
            # 사진 파일 삭제
            photos = db.query(models.Photo).filter(models.Photo.project_id == project.id).all()
            for photo in photos:
                try:
                    file_path = photo.image_url.split('/uploads/')[-1]
                    full_path = f"app/uploads/{file_path}"
                    if os.path.exists(full_path):
                        os.remove(full_path)
                except:
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
    return {"message": "FotoPM API is running"}