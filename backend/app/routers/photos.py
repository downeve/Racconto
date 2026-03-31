from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid
import os
import shutil

from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
from datetime import datetime as dt

def extract_exif(file_path: str) -> dict:
    exif_data = {}
    try:
        image = Image.open(file_path)
        raw_exif = image._getexif()
        if not raw_exif:
            return exif_data

        exif = {TAGS.get(k, k): v for k, v in raw_exif.items()}

        # 촬영일
        if 'DateTimeOriginal' in exif:
            try:
                exif_data['taken_at'] = dt.strptime(exif['DateTimeOriginal'], '%Y:%m:%d %H:%M:%S')
            except:
                pass

        # 카메라
        make = exif.get('Make', '')
        model = exif.get('Model', '')
        if make or model:
            exif_data['camera'] = f"{make} {model}".strip()

        # 렌즈
        if 'LensModel' in exif:
            exif_data['lens'] = str(exif['LensModel'])

        # ISO
        if 'ISOSpeedRatings' in exif:
            exif_data['iso'] = f"ISO {exif['ISOSpeedRatings']}"

        # 셔터스피드
        if 'ExposureTime' in exif:
            et = exif['ExposureTime']
            if hasattr(et, 'numerator'):
                if et.numerator == 1:
                    exif_data['shutter_speed'] = f"1/{et.denominator}s"
                else:
                    exif_data['shutter_speed'] = f"{float(et):.1f}s"
            else:
                exif_data['shutter_speed'] = str(et)

        # 조리개
        if 'FNumber' in exif:
            fn = exif['FNumber']
            if hasattr(fn, 'numerator'):
                exif_data['aperture'] = f"f/{float(fn):.1f}"
            else:
                exif_data['aperture'] = f"f/{fn}"

        # 초점거리
        if 'FocalLength' in exif:
            fl = exif['FocalLength']
            if hasattr(fl, 'numerator'):
                exif_data['focal_length'] = f"{float(fl):.0f}mm"
            else:
                exif_data['focal_length'] = f"{fl}mm"

        # GPS
        if 'GPSInfo' in exif:
            gps_info = {GPSTAGS.get(k, k): v for k, v in exif['GPSInfo'].items()}
            if 'GPSLatitude' in gps_info and 'GPSLongitude' in gps_info:
                def to_degrees(values):
                    d, m, s = [float(x) for x in values]
                    return d + m/60 + s/3600
                lat = to_degrees(gps_info['GPSLatitude'])
                lng = to_degrees(gps_info['GPSLongitude'])
                if gps_info.get('GPSLatitudeRef') == 'S':
                    lat = -lat
                if gps_info.get('GPSLongitudeRef') == 'W':
                    lng = -lng
                exif_data['gps_lat'] = str(lat)
                exif_data['gps_lng'] = str(lng)

    except Exception as e:
        print(f"EXIF 추출 오류: {e}")

    return exif_data

router = APIRouter(prefix="/photos", tags=["photos"])

UPLOAD_DIR = "app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class PhotoCreate(BaseModel):
    project_id: str
    image_url: str
    caption: Optional[str] = None
    caption_en: Optional[str] = None
    order: Optional[int] = 0
    is_portfolio: Optional[str] = "false"
    rating: Optional[int] = None
    color_label: Optional[str] = None
    folder: Optional[str] = None

class PhotoResponse(BaseModel):
    id: str
    project_id: str
    image_url: str
    caption: Optional[str]
    caption_en: Optional[str]
    order: int
    is_portfolio: str
    taken_at: Optional[datetime]
    camera: Optional[str]
    lens: Optional[str]
    iso: Optional[str]
    shutter_speed: Optional[str]
    aperture: Optional[str]
    focal_length: Optional[str]
    gps_lat: Optional[str]
    gps_lng: Optional[str]
    rating: Optional[int] = None
    color_label: Optional[str] = None
    created_at: datetime
    folder: Optional[str] = None

class Config:
    from_attributes = True

@router.get("/", response_model=list[PhotoResponse])
def get_photos(project_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Photo)
    if project_id:
        query = query.filter(models.Photo.project_id == project_id)
    return query.order_by(models.Photo.order).all()

@router.get("/{photo_id}", response_model=PhotoResponse)
def get_photo(photo_id: str, db: Session = Depends(get_db)):
    photo = db.query(models.Photo).filter(models.Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="사진을 찾을 수 없습니다")
    return photo

@router.post("/", response_model=PhotoResponse)
def create_photo(photo: PhotoCreate, db: Session = Depends(get_db)):
    db_photo = models.Photo(
        id=str(uuid.uuid4()),
        project_id=photo.project_id,
        image_url=photo.image_url,
        caption=photo.caption,
        caption_en=photo.caption_en,
        order=photo.order,
        is_portfolio=photo.is_portfolio
    )
    db.add(db_photo)
    db.commit()
    db.refresh(db_photo)
    return db_photo

@router.put("/{photo_id}", response_model=PhotoResponse)
def update_photo(photo_id: str, photo: PhotoCreate, db: Session = Depends(get_db)):
    db_photo = db.query(models.Photo).filter(models.Photo.id == photo_id).first()
    if not db_photo:
        raise HTTPException(status_code=404, detail="사진을 찾을 수 없습니다")
    for key, value in photo.dict(exclude_unset=True).items():
        setattr(db_photo, key, value)
    db.commit()
    db.refresh(db_photo)
    return db_photo

@router.delete("/{photo_id}")
def delete_photo(photo_id: str, db: Session = Depends(get_db)):
    photo = db.query(models.Photo).filter(models.Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="사진을 찾을 수 없습니다")
    
    # 실제 파일 삭제
    try:
        file_path = photo.image_url.split('/uploads/')[-1]
        full_path = f"{UPLOAD_DIR}/{file_path}"
        if os.path.exists(full_path):
            os.remove(full_path)
    except Exception as e:
        print(f"파일 삭제 오류: {e}")
    
    db.delete(photo)
    db.commit()
    return {"message": "삭제되었습니다"}

@router.post("/upload")
async def upload_photo(
    project_id: str,
    file: UploadFile = File(...),
    folder: Optional[str] = None,
    db: Session = Depends(get_db)
):
    ext = file.filename.split(".")[-1].lower()
    if ext not in ["jpg", "jpeg", "png", "webp"]:
        raise HTTPException(status_code=400, detail="지원하지 않는 파일 형식이에요")

    file_id = str(uuid.uuid4())
    filename = f"{file_id}.{ext}"
    file_path = f"{UPLOAD_DIR}/{filename}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")
    image_url = f"{BASE_URL}/uploads/{filename}"

    # EXIF 추출
    exif = extract_exif(file_path)

    # 현재 프로젝트의 마지막 order 값 + 1
    last_photo = db.query(models.Photo).filter(
        models.Photo.project_id == project_id
    ).order_by(models.Photo.order.desc()).first()
    next_order = (last_photo.order + 1) if last_photo else 0

    db_photo = models.Photo(
        id=file_id,
        project_id=project_id,
        image_url=image_url,
        order=next_order,
        is_portfolio="false",
        folder=folder,
        taken_at=exif.get('taken_at'),
        camera=exif.get('camera'),
        lens=exif.get('lens'),
        iso=exif.get('iso'),
        shutter_speed=exif.get('shutter_speed'),
        aperture=exif.get('aperture'),
        focal_length=exif.get('focal_length'),
        gps_lat=exif.get('gps_lat'),
        gps_lng=exif.get('gps_lng')
    )
    db.add(db_photo)
    db.commit()
    db.refresh(db_photo)
    return db_photo