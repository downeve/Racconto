from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import engine
import app.models as models
from app.routers import projects, photos, portfolio, notes
import os

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="FotoPM API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router)
app.include_router(photos.router)
app.include_router(portfolio.router)
app.include_router(notes.router)

os.makedirs("app/uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="app/uploads"), name="uploads")

@app.get("/")
def root():
    return {"message": "FotoPM API is running"}