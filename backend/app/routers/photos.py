from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid
import os
import requests
from PIL import Image as PilImage
from app.auth import get_current_user
from concurrent.futures import ThreadPoolExecutor
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


def rotate_and_upload_to_cloudflare(image_bytes: bytes, filename: str, direction: str) -> str:
    """이미지 바이트를 받아 회전 후 CF Images에 업로드, 새 CF URL 반환. exif_transpose 적용 없음."""
    img = PilImage.open(io.BytesIO(image_bytes))
    if direction == "left":
        img = img.rotate(90, expand=True)
    elif direction == "right":
        img = img.rotate(-90, expand=True)
    else:
        raise ValueError(f"Invalid direction: {direction}")

    max_size = 3200
    w, h = img.size
    if max(w, h) > max_size:
        if w >= h:
            new_w, new_h = max_size, int(h * max_size / w)
        else:
            new_w, new_h = int(w * max_size / h), max_size
        img = img.resize((new_w, new_h), PilImage.LANCZOS)

    buf = io.BytesIO()
    img.convert('RGB').save(buf, format='JPEG', quality=88, optimize=True)
    buf.seek(0)
    res = requests.post(
        CF_UPLOAD_URL,
        headers={"Authorization": f"Bearer {CF_API_TOKEN}"},
        files={"file": (filename, buf, "image/jpeg")},
    )
    data = res.json()
    if not data.get("success"):
        raise Exception(f"CF 업로드 실패: {data}")
    return data["result"]["variants"][0]


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
    except Exception as e:
        print(f"CF 이미지 삭제 실패 (무시): {e}")

def delete_cf_files_parallel(urls: list[str]):
    """CF 이미지 병렬 삭제 (최대 10개 동시)"""
    with ThreadPoolExecutor(max_workers=10) as executor:
        executor.map(delete_from_cloudflare, urls)


def touch_project(project_id: str, db: Session):
    db.query(models.Project).filter(models.Project.id == project_id).update(
        {"updated_at": datetime.utcnow()}, synchronize_session=False
    )

def clear_cover_if_deleted(project_id: str, image_url: str, db: Session):
    """삭제된 사진이 커버이면 커버 초기화"""
    project = db.query(models.Project).filter(
        models.Project.id == project_id
    ).first()
    if project and project.cover_image_url == image_url:
        project.cover_image_url = None


def get_owned_photo_or_404(
    photo_id: str,
    user_id: str,
    db: Session,
    *,
    require_deleted: bool = False
) -> models.Photo:
    """photo 조회 및 현재 유저 소유 검증"""
    query = db.query(models.Photo).join(models.Project).filter(
        models.Photo.id == photo_id,
        models.Project.user_id == user_id,
    )
    if require_deleted:
        query = query.filter(models.Photo.deleted_at != None)
    else:
        query = query.filter(models.Photo.deleted_at == None)
    photo = query.first()
    if not photo:
        raise HTTPException(status_code=404, detail="PHOTO_NOT_FOUND")
    return photo


router = APIRouter(prefix="/photos", tags=["photos"])


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
    source: Optional[str] = 'web'  # ← 추가
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
    source: Optional[str] = 'web'
    local_missing: bool = False
    deleted_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class BulkExistsRequest(BaseModel):
    project_id: str
    filenames: list[str]

class BulkDeleteRequest(BaseModel):
    photo_ids: list[str]

class RestoreByFilenameRequest(BaseModel):
    project_id: str
    original_filename: str

class BulkPermanentDeleteRequest(BaseModel):
    photo_ids: list[str]

class RotateRequest(BaseModel):
    direction: str  # "left" 또는 "right"

class LocalMissingUpdate(BaseModel):
    local_missing: bool

class BulkLocalMissingUpdate(BaseModel):
    updates: list[dict]  # [{"filename": "...", "local_missing": True/False}, ...]


@router.get("/", response_model=list[PhotoResponse])
def get_photos(
    project_id: Optional[str] = None,
    include_deleted: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if project_id:
        project = db.query(models.Project).filter(
            models.Project.id == project_id,
            models.Project.user_id == current_user.id,
        ).first()
        if not project:
            raise HTTPException(status_code=403, detail="FORBIDDEN")
        query = db.query(models.Photo).filter(
            models.Photo.project_id == project_id
        )
        if not include_deleted:
            query = query.filter(models.Photo.deleted_at == None)
    else:
        my_project_ids = db.query(models.Project.id).filter(
            models.Project.user_id == current_user.id
        ).subquery()
        query = db.query(models.Photo).filter(
            models.Photo.project_id.in_(my_project_ids)
        )
        if not include_deleted:
            query = query.filter(models.Photo.deleted_at == None)
    return query.order_by(models.Photo.order).all()


@router.get("/cf-upload-url")
def get_upload_url(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """CF 업로드 일회성 URL 발급 (웹/Electron 공용)"""
    photo_count = db.query(models.Photo).join(models.Project).filter(
        models.Project.user_id == current_user.id,
        models.Photo.deleted_at == None
    ).count()
    if photo_count >= current_user.photo_limit:
        raise HTTPException(
            status_code=403,
            detail={"code": "PHOTO_LIMIT_EXCEEDED", "limit": current_user.photo_limit}
        )

    res = requests.post(
        f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/images/v2/direct_upload",
        headers={"Authorization": f"Bearer {CF_API_TOKEN}"},
    )
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


@router.post("/bulk-exists")
def bulk_check_exists(
    body: BulkExistsRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Electron 앱용 파일 중복 배치 체크"""
    existing = db.query(models.Photo.original_filename).filter(
        models.Photo.project_id == body.project_id,
        models.Photo.original_filename.in_(body.filenames),
        models.Photo.deleted_at == None
    ).all()
    existing_set = {row[0] for row in existing}
    return {"existing": list(existing_set)}


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


@router.delete("/by-folder")
def delete_photos_by_folder(
    project_id: str,
    folder: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """폴더 연결 해제 시 해당 폴더의 사진 일괄 소프트 삭제"""
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.user_id == current_user.id,
        models.Project.deleted_at == None
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="PROJECT_NOT_FOUND")

    # 이미 휴지통에 있던 사진도 local_missing = True로 업데이트 (연동 해제 전 삭제된 사진 포함)
    db.query(models.Photo).filter(
        models.Photo.project_id == project_id,
        models.Photo.folder == folder,
        models.Photo.deleted_at != None
    ).update({"local_missing": True}, synchronize_session=False)

    photos = db.query(models.Photo).filter(
        models.Photo.project_id == project_id,
        models.Photo.folder == folder,
        models.Photo.deleted_at == None
    ).all()

    now = datetime.utcnow()
    for photo in photos:
        photo.deleted_at = now
        photo.local_missing = True
        clear_cover_if_deleted(project_id, photo.image_url, db)
        db.query(models.Note).filter(
            models.Note.photo_id == photo.id,
            models.Note.deleted_at == None
        ).update({"deleted_at": now}, synchronize_session=False)

    if photos:
        touch_project(project_id, db)
    db.commit()
    return {"deleted": len(photos)}


@router.delete("/bulk-delete")
def bulk_delete_photos(
    body: BulkDeleteRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    photos = db.query(models.Photo).join(models.Project).filter(
        models.Photo.id.in_(body.photo_ids),
        models.Photo.deleted_at == None,
        models.Project.user_id == current_user.id
    ).all()
    project_ids = {p.project_id for p in photos}
    for photo in photos:
        photo.deleted_at = datetime.utcnow()
        clear_cover_if_deleted(photo.project_id, photo.image_url, db)
        # 연결된 노트 소프트 삭제
        db.query(models.Note).filter(
            models.Note.photo_id == photo.id,
            models.Note.deleted_at == None
        ).update({"deleted_at": datetime.utcnow()}, synchronize_session=False)
    for pid in project_ids:
        touch_project(pid, db)
    db.commit()
    return {"deleted": len(body.photo_ids)}


@router.delete("/bulk-permanent")
def bulk_permanent_delete_photos(
    body: BulkPermanentDeleteRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    photos = db.query(models.Photo).join(models.Project).filter(
        models.Photo.id.in_(body.photo_ids),
        models.Project.user_id == current_user.id
    ).all()

    cf_urls = []
    for photo in photos:
        # side-by-side 블록 block_id 수집 (ChapterItem 삭제 전)
        side_block_ids = {
            row.block_id
            for row in db.query(models.ChapterItem.block_id).filter(
                models.ChapterItem.photo_id == photo.id,
                models.ChapterItem.block_type.in_(('side-left', 'side-right')),
                models.ChapterItem.block_id != None
            ).all()
            if row.block_id
        }

        db.query(models.ChapterItem).filter(
            models.ChapterItem.photo_id == photo.id
        ).delete(synchronize_session=False)

        # PHOTO 없는 side-by-side 블록의 TEXT 아이템을 단독 블록으로 전환
        for block_id in side_block_ids:
            remaining = db.query(models.ChapterItem).filter(
                models.ChapterItem.block_id == block_id,
                models.ChapterItem.item_type == 'PHOTO'
            ).count()
            if remaining == 0:
                for text_item in db.query(models.ChapterItem).filter(
                    models.ChapterItem.block_id == block_id,
                    models.ChapterItem.item_type == 'TEXT'
                ).all():
                    text_item.block_id = text_item.id
                    text_item.block_type = 'default'

        clear_cover_if_deleted(photo.project_id, photo.image_url, db)
        if photo.image_url and "imagedelivery.net" in photo.image_url:
            cf_urls.append(photo.image_url)
        elif photo.image_url:
            # 로컬 파일은 즉시 삭제
            try:
                file_path = photo.image_url.split('/uploads/')[-1]
                full_path = f"app/uploads/{file_path}"
                if os.path.exists(full_path):
                    os.remove(full_path)
            except Exception as e:
                print(f"로컬 파일 삭제 실패 (무시): {e}")

    # DB에서 먼저 삭제 (빠른 응답)
    db.query(models.Photo).filter(
        models.Photo.id.in_(body.photo_ids)
    ).delete(synchronize_session=False)
    project_ids = {p.project_id for p in photos}
    for pid in project_ids:
        touch_project(pid, db)
    db.commit()

    if cf_urls:
        background_tasks.add_task(delete_cf_files_parallel, cf_urls)

    return {"deleted": len(body.photo_ids)}


@router.post("/restore-by-filename", response_model=PhotoResponse)
def restore_photo_by_filename(
    body: RestoreByFilenameRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """파일명으로 휴지통 사진 복구 (수동 재업로드 시 새 레코드 생성 대신 복구)"""
    project = db.query(models.Project).filter(
        models.Project.id == body.project_id,
        models.Project.user_id == current_user.id,
        models.Project.deleted_at == None
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="PROJECT_NOT_FOUND")

    photo = db.query(models.Photo).filter(
        models.Photo.project_id == body.project_id,
        models.Photo.original_filename == body.original_filename,
        models.Photo.deleted_at != None
    ).order_by(models.Photo.deleted_at.desc()).first()

    if not photo:
        raise HTTPException(status_code=404, detail="PHOTO_NOT_FOUND_IN_TRASH")

    photo.deleted_at = None
    db.query(models.Note).filter(
        models.Note.photo_id == photo.id,
        models.Note.deleted_at != None
    ).update({"deleted_at": None}, synchronize_session=False)
    db.commit()
    db.refresh(photo)
    return photo


@router.get("/{photo_id}", response_model=PhotoResponse)
def get_photo(
    photo_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # deleted_at 필터 없음 — 휴지통 사진도 조회 가능해야 함
    photo = db.query(models.Photo).join(models.Project).filter(
        models.Photo.id == photo_id,
        models.Project.user_id == current_user.id,
    ).first()
    if not photo:
        raise HTTPException(status_code=404, detail="PHOTO_NOT_FOUND")
    return photo


@router.post("/", response_model=PhotoResponse)
def create_photo(
    photo: PhotoCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    project = db.query(models.Project).filter(
        models.Project.id == photo.project_id,
        models.Project.user_id == current_user.id,
        models.Project.deleted_at == None,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="PROJECT_NOT_FOUND")

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
        source=photo.source,
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
    touch_project(photo.project_id, db)
    db.commit()
    db.refresh(db_photo)
    return db_photo


@router.put("/{photo_id}", response_model=PhotoResponse)
def update_photo(
    photo_id: str,
    photo: PhotoCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_photo = get_owned_photo_or_404(photo_id, current_user.id, db)
    for key, value in photo.dict(exclude_unset=True).items():
        setattr(db_photo, key, value)
    db.commit()
    db.refresh(db_photo)
    return db_photo

@router.delete("/{photo_id}")
def delete_photo(
    photo_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """소프트 삭제: 휴지통으로 이동"""
    photo = get_owned_photo_or_404(photo_id, current_user.id, db)
    
    photo.deleted_at = datetime.utcnow()
    clear_cover_if_deleted(photo.project_id, photo.image_url, db)

    # 연결된 노트 소프트 삭제
    db.query(models.Note).filter(
        models.Note.photo_id == photo_id,
        models.Note.deleted_at == None
    ).update({"deleted_at": datetime.utcnow()}, synchronize_session=False)

    touch_project(photo.project_id, db)
    db.commit()
    return {"message": "Moved to trash"}


@router.get("/trash/{project_id}")
def get_project_trash(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """프로젝트별 휴지통 조회"""
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.user_id == current_user.id,
    ).first()
    if not project:
        raise HTTPException(status_code=403, detail="FORBIDDEN")
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

    # 💡 유저 계정당 총 사진 업로드 제한 체크 (복원 시)
    photo_count = db.query(models.Photo).join(models.Project).filter(
        models.Project.user_id == current_user.id,
        models.Photo.deleted_at == None
    ).count()
    if photo_count >= current_user.photo_limit:
        raise HTTPException(
            status_code=403,
            detail={"code": "PHOTO_LIMIT_EXCEEDED", "limit": current_user.photo_limit}
        )

    photo.deleted_at = None
    # 연결된 노트 복원
    db.query(models.Note).filter(
        models.Note.photo_id == photo_id,
        models.Note.deleted_at != None
    ).update({"deleted_at": None}, synchronize_session=False)
    touch_project(photo.project_id, db)
    db.commit()
    db.refresh(photo)
    return photo


@router.delete("/{photo_id}/permanent")
def permanent_delete_photo(
    photo_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """영구 삭제 (파일 및 관련 데이터 모두 삭제)"""
    photo = get_owned_photo_or_404(photo_id, current_user.id, db, require_deleted=True)
    
    # 1. ⭐ [추가] 챕터 매핑 데이터(ChapterItem) 먼저 삭제
    db.query(models.ChapterItem).filter(models.ChapterItem.photo_id == photo_id).delete(synchronize_session=False)
    clear_cover_if_deleted(photo.project_id, photo.image_url, db)

    # 2. CF 또는 로컬 파일 삭제 (백그라운드)
    if photo.image_url and "imagedelivery.net" in photo.image_url:
        background_tasks.add_task(delete_from_cloudflare, photo.image_url)
    elif photo.image_url:
        try:
            file_path = photo.image_url.split('/uploads/')[-1]
            full_path = f"app/uploads/{file_path}"
            if os.path.exists(full_path):
                os.remove(full_path)
        except Exception as e:
            print(f"로컬 파일 삭제 실패 (무시): {e}")

    # 3. 사진 데이터 삭제 및 커밋
    db.delete(photo)
    db.commit()
    
    return {"message": "PERMANENTLY_DELETED"}


@router.post("/{photo_id}/rotate", response_model=PhotoResponse)
def rotate_photo(
    photo_id: str,
    body: RotateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    photo = get_owned_photo_or_404(photo_id, current_user.id, db)

    if body.direction not in ("left", "right"):
        raise HTTPException(status_code=400, detail="INVALID_DIRECTION")

    try:
        response = requests.get(photo.image_url, timeout=30)
        response.raise_for_status()
        image_bytes = response.content
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"이미지 다운로드 실패: {e}")

    old_image_url = photo.image_url
    filename = f"{photo_id}_rotated.jpg"
    try:
        new_image_url = rotate_and_upload_to_cloudflare(image_bytes, filename, body.direction)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"회전 업로드 실패: {e}")

    photo.image_url = new_image_url

    project = db.query(models.Project).filter(models.Project.id == photo.project_id).first()
    if project and project.cover_image_url == old_image_url:
        project.cover_image_url = new_image_url

    db.commit()
    db.refresh(photo)

    if "imagedelivery.net" in old_image_url:
        background_tasks.add_task(delete_from_cloudflare, old_image_url)

    return photo


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
        ).first()
        if photo:
            photo.local_missing = item["local_missing"]
            updated += 1
    db.commit()
    return {"updated": updated}