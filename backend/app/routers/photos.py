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
import requests
from PIL import Image as PilImage
from app.auth import get_current_user
import io

from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS

CF_ACCOUNT_ID = os.getenv("CF_ACCOUNT_ID")
CF_API_TOKEN = os.getenv("CF_API_TOKEN")
CF_UPLOAD_URL = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/images/v1"

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
                exif_data['taken_at'] = datetime.strptime(exif['DateTimeOriginal'], '%Y:%m:%d %H:%M:%S')
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

def upload_to_cloudflare(file_path: str, filename: str) -> str:
    """이미지를 장변 2400px로 리사이즈 후 CF Images에 업로드, CF URL 반환"""
    # PIL로 리사이즈
    img = PilImage.open(file_path)
    
    # EXIF orientation 보정
    try:
        from PIL import ImageOps
        img = ImageOps.exif_transpose(img)
    except:
        pass
    
    # 장변 2400px 리사이즈
    max_size = 2400
    w, h = img.size
    if max(w, h) > max_size:
        if w >= h:
            new_w, new_h = max_size, int(h * max_size / w)
        else:
            new_w, new_h = int(w * max_size / h), max_size
        img = img.resize((new_w, new_h), PilImage.LANCZOS)
    
    # 메모리 버퍼에 JPEG로 저장
    buf = io.BytesIO()
    img.convert('RGB').save(buf, format='JPEG', quality=88, optimize=True)
    buf.seek(0)
    
    # CF Images API 업로드
    res = requests.post(
        CF_UPLOAD_URL,
        headers={"Authorization": f"Bearer {CF_API_TOKEN}"},
        files={"file": (filename, buf, "image/jpeg")},
    )
    data = res.json()
    if not data.get("success"):
        raise Exception(f"CF 업로드 실패: {data}")
    
    return data["result"]["variants"][0]  # CF 이미지 URL 반환


def delete_from_cloudflare(image_url: str):
    """CF Images에서 이미지 삭제"""
    # CF URL에서 이미지 ID 추출
    # URL 형식: https://imagedelivery.net/{hash}/{image_id}/public
    try:
        image_id = image_url.rstrip('/').split('/')[-2]
        requests.delete(
            f"{CF_UPLOAD_URL}/{image_id}",
            headers={"Authorization": f"Bearer {CF_API_TOKEN}"},
        )
    except:
        pass

router = APIRouter(prefix="/photos", tags=["photos"])

UPLOAD_DIR = "app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class PhotoCreate(BaseModel):
    project_id: str
    image_url: str
    caption: Optional[str] = None
    caption_en: Optional[str] = None
    order: Optional[int] = 0
    rating: Optional[int] = None
    color_label: Optional[str] = None
    folder: Optional[str] = None
    original_filename: Optional[str] = None
    # Electron EXIF 필드
    taken_at: Optional[datetime] = None
    camera: Optional[str] = None
    lens: Optional[str] = None
    iso: Optional[str] = None
    shutter_speed: Optional[str] = None
    aperture: Optional[str] = None
    focal_length: Optional[str] = None
    gps_lat: Optional[str] = None
    gps_lng: Optional[str] = None

class PhotoResponse(BaseModel):
    id: str
    project_id: str
    image_url: str
    caption: Optional[str]
    caption_en: Optional[str]
    order: int
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
    original_filename: Optional[str] = None
    local_missing: bool = False

class Config:
    from_attributes = True

@router.get("/", response_model=list[PhotoResponse])
def get_photos(project_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Photo).filter(models.Photo.deleted_at == None)  # 삭제된 사진 제외
    if project_id:
        query = query.filter(models.Photo.project_id == project_id)
    return query.order_by(models.Photo.order).all()


@router.get("/cf-upload-url")
def get_upload_url(
    current_user: models.User = Depends(get_current_user)
):
    """Electron 앱용 CF 업로드 일회성 URL 발급"""
    print(f"CF_ACCOUNT_ID: {CF_ACCOUNT_ID}")
    print(f"CF_API_TOKEN: {CF_API_TOKEN[:10] if CF_API_TOKEN else None}")
    res = requests.post(
        f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/images/v2/direct_upload",
        headers={"Authorization": f"Bearer {CF_API_TOKEN}"},
    )
    print(f"CF 응답: {res.status_code} {res.text}")
    data = res.json()
    if not data.get("success"):
        raise HTTPException(status_code=500, detail="CF_UPLOAD_URL_FAILED")
    
    return {
        "uploadURL": data["result"]["uploadURL"],
        "id": data["result"]["id"]
    }


@router.get("/exists")
def check_photo_exists(
    project_id: str,
    filename: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Electron 앱용 파일 중복 체크"""
    exists = db.query(models.Photo).filter(
        models.Photo.project_id == project_id,
        models.Photo.original_filename == filename,
        models.Photo.deleted_at == None
    ).first()
    return { "exists": exists is not None }


@router.patch("/by-filename/local-missing")
def update_local_missing_by_filename(
    project_id: str,
    filename: str,
    body: LocalMissingUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """파일명으로 local_missing 업데이트 (Electron 삭제 감지용)"""
    photo = db.query(models.Photo).filter(
        models.Photo.project_id == project_id,
        models.Photo.original_filename == filename,
        models.Photo.deleted_at == None
    ).first()
    if not photo:
        raise HTTPException(status_code=404, detail="PHOTO_NOT_FOUND")
    photo.local_missing = body.local_missing
    db.commit()
    db.refresh(photo)
    return photo


@router.get("/{photo_id}", response_model=PhotoResponse)
def get_photo(photo_id: str, db: Session = Depends(get_db)):
    photo = db.query(models.Photo).filter(models.Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="PHOTO_NOT_FOUND")
    return photo


@router.post("/", response_model=PhotoResponse)
def create_photo(photo: PhotoCreate, db: Session = Depends(get_db)):
    # order 자동 계산
    last_photo = db.query(models.Photo).filter(
        models.Photo.project_id == photo.project_id,
        models.Photo.deleted_at == None
    ).order_by(models.Photo.order.desc()).first()
    next_order = (last_photo.order + 1) if last_photo else 0

    db_photo = models.Photo(
        id=str(uuid.uuid4()),
        project_id=photo.project_id,
        image_url=photo.image_url,
        caption=photo.caption,
        caption_en=photo.caption_en,
        order=photo.order if photo.order else next_order,
        folder=photo.folder,
        original_filename=photo.original_filename,
        taken_at=photo.taken_at,
        camera=photo.camera,
        lens=photo.lens,
        iso=photo.iso,
        shutter_speed=photo.shutter_speed,
        aperture=photo.aperture,
        focal_length=photo.focal_length,
        gps_lat=photo.gps_lat,
        gps_lng=photo.gps_lng,
    )
    db.add(db_photo)
    db.commit()
    db.refresh(db_photo)
    return db_photo


@router.put("/{photo_id}", response_model=PhotoResponse)
def update_photo(photo_id: str, photo: PhotoCreate, db: Session = Depends(get_db)):
    db_photo = db.query(models.Photo).filter(models.Photo.id == photo_id).first()
    if not db_photo:
        raise HTTPException(status_code=404, detail="PHOTO_NOT_FOUND")
    for key, value in photo.dict(exclude_unset=True).items():
        setattr(db_photo, key, value)
    db.commit()
    db.refresh(db_photo)
    return db_photo

@router.delete("/{photo_id}")
def delete_photo(photo_id: str, db: Session = Depends(get_db)):
    """소프트 삭제: 휴지통으로 이동"""
    photo = db.query(models.Photo).filter(
        models.Photo.id == photo_id,
        models.Photo.deleted_at == None  # 이미 삭제된 사진 제외
    ).first()
    if not photo:
        raise HTTPException(status_code=404, detail="PHOTO_NOT_FOUND")
    
    photo.deleted_at = datetime.utcnow()
    db.commit()
    return {"message": "Moved to trash"}

@router.post("/upload")
async def upload_photo(
    project_id: str,
    file: UploadFile = File(...),
    folder: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
        # 프로젝트당 사진 업로드 제한 체크
    photo_count = db.query(models.Photo).filter(
        models.Photo.project_id == project_id,
        models.Photo.deleted_at == None
    ).count()
    
    if photo_count >= current_user.photo_limit:
        raise HTTPException(
            status_code=403,
            detail={"code": "PHOTO_LIMIT_EXCEEDED", "limit": current_user.photo_limit}
        )
    
    ext = file.filename.split(".")[-1].lower()
    if ext not in ["jpg", "jpeg", "png", "webp"]:
        # 💡 [수정] 400 에러를 던지면 업로드가 멈추므로, 무시할 수 있는 메시지로 처리하거나 프론트엔드에서 필터링해야 합니다.
        # 일단 백엔드에서는 에러를 던지되, 프론트에서 이 파일을 걸러서 올리는 것이 가장 좋습니다.
        raise HTTPException(status_code=400, detail="UNSUPPORTED_FILE_FORMAT")

    file_id = str(uuid.uuid4())
    original_filename = file.filename
    filename = f"{file_id}.{ext}"
    file_path = f"{UPLOAD_DIR}/{filename}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        # 💡 1. 파일을 지우기 전에 EXIF 데이터를 가장 먼저 추출합니다!
        exif = extract_exif(file_path)

        # 💡 2. CF에 업로드하고 URL 받기
        image_url = upload_to_cloudflare(file_path, filename)
        
    finally:
        # 💡 3. 로컬 임시 파일 삭제 (성공하든 에러가 나든 무조건 마지막에 지우도록 finally로 감쌈)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                print(f"⚠️ 임시 파일 삭제 실패: {file_path} - {e}")

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
        folder=folder,
        taken_at=exif.get('taken_at'),
        camera=exif.get('camera'),
        lens=exif.get('lens'),
        iso=exif.get('iso'),
        shutter_speed=exif.get('shutter_speed'),
        aperture=exif.get('aperture'),
        focal_length=exif.get('focal_length'),
        gps_lat=exif.get('gps_lat'),
        gps_lng=exif.get('gps_lng'),
        original_filename=original_filename
    )
    db.add(db_photo)
    db.commit()
    db.refresh(db_photo)
    return db_photo


@router.get("/trash/{project_id}")
def get_project_trash(project_id: str, db: Session = Depends(get_db)):
    """프로젝트별 휴지통 조회"""
    return db.query(models.Photo).filter(
        models.Photo.project_id == project_id,
        models.Photo.deleted_at != None
    ).order_by(models.Photo.deleted_at.desc()).all()


@router.post("/{photo_id}/restore")
def restore_photo(
    photo_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    photo = db.query(models.Photo).filter(
        models.Photo.id == photo_id,
        models.Photo.deleted_at != None
    ).first()
    if not photo:
        raise HTTPException(status_code=404, detail="PHOTO_NOT_FOUND")

    photo_count = db.query(models.Photo).filter(
        models.Photo.project_id == photo.project_id,
        models.Photo.deleted_at == None
    ).count()
    if photo_count >= current_user.photo_limit:
        raise HTTPException(
            status_code=403,
            detail={"code": "PHOTO_LIMIT_EXCEEDED", "limit": current_user.photo_limit}
        )

    photo.deleted_at = None
    db.commit()
    db.refresh(photo)
    return photo


@router.delete("/{photo_id}/permanent")
def permanent_delete_photo(photo_id: str, db: Session = Depends(get_db)):
    """영구 삭제 (파일 및 관련 데이터 모두 삭제)"""
    photo = db.query(models.Photo).filter(
        models.Photo.id == photo_id,
        models.Photo.deleted_at != None
    ).first()
    
    if not photo:
        raise HTTPException(status_code=404, detail="PHOTO_NOT_FOUND")
    
    # 1. ⭐ [추가] 챕터 매핑 데이터(ChapterPhoto) 먼저 삭제
    # 이 부분이 빠져서 에러가 났던 것입니다.
    db.query(models.ChapterPhoto).filter(models.ChapterPhoto.photo_id == photo_id).delete(synchronize_session=False)

    # 2. [기존 로직] CF 또는 로컬 파일 물리적 삭제
    try:
        if photo.image_url and "imagedelivery.net" in photo.image_url:
            delete_from_cloudflare(photo.image_url)
        elif photo.image_url:
            file_path = photo.image_url.split('/uploads/')[-1]
            full_path = f"app/uploads/{file_path}"
            if os.path.exists(full_path):
                os.remove(full_path)
    except Exception as e:
        print(f"파일 삭제 실패 (무시하고 계속 진행): {e}")

    # 3. 사진 데이터 삭제 및 커밋
    db.delete(photo)
    db.commit()
    
    return {"message": "PERMANENTLY_DELETED"}


class LocalMissingUpdate(BaseModel):
    local_missing: bool

@router.patch("/{photo_id}/local-missing")
def update_local_missing(
    photo_id: str,
    body: LocalMissingUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """로컬 파일 누락 상태 업데이트 (Electron 앱에서 호출)"""
    photo = db.query(models.Photo).filter(
        models.Photo.id == photo_id,
        models.Photo.deleted_at == None
    ).first()
    if not photo:
        raise HTTPException(status_code=404, detail="PHOTO_NOT_FOUND")
    
    photo.local_missing = body.local_missing
    db.commit()
    db.refresh(photo)
    return photo


class BulkLocalMissingUpdate(BaseModel):
    updates: list[dict]  # [{"filename": "...", "local_missing": True/False}, ...]

@router.patch("/bulk-local-missing")
def bulk_update_local_missing(
    project_id: str,
    body: BulkLocalMissingUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """앱 시작 시 local_missing 일괄 동기화 (Electron용)"""
    updated = 0
    for item in body.updates:
        photo = db.query(models.Photo).filter(
            models.Photo.project_id == project_id,
            models.Photo.original_filename == item["filename"],
            models.Photo.deleted_at == None
        ).first()
        if photo:
            photo.local_missing = item["local_missing"]
            updated += 1
    db.commit()
    return {"updated": updated}