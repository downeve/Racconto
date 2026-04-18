import httpx
import requests
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.auth import get_current_user
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from app.routers.photos import delete_from_cloudflare, delete_cf_files_parallel
from app.email import send_notice_email
from datetime import datetime, timedelta
import os

router = APIRouter(prefix="/admin", tags=["admin"])

LINODE_TOKEN = os.getenv("LINODE_API_TOKEN")
CF_TOKEN = os.getenv("CF_API_TOKEN")
CF_ACCOUNT_ID = os.getenv("CF_ACCOUNT_ID")

class OrphanScanResult(BaseModel):
    orphan_ids: List[str]
    count: int
    scanned_cf: int
    scanned_db: int

class OrphanCleanupRequest(BaseModel):
    image_ids: List[str]

def _delete_cf_by_id(image_id: str):
    try:
        requests.delete(
            f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/images/v1/{image_id}",
            headers={"Authorization": f"Bearer {CF_TOKEN}"},
        )
    except Exception as e:
        print(f"CF orphan 삭제 실패 (무시): {e}")

def _delete_cf_ids_parallel(image_ids: List[str]):
    with ThreadPoolExecutor(max_workers=10) as executor:
        executor.map(_delete_cf_by_id, image_ids)


class UserLimitUpdate(BaseModel):
    project_limit: Optional[int] = None
    photo_limit: Optional[int] = None
    is_verified: Optional[bool] = None

class NoticeRequest(BaseModel):
    subject: str
    content: str
    verified_only: bool = True  # 인증된 유저에게만 발송 여부


def require_admin(current_user: models.User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="FORBIDDEN")
    return current_user


@router.get("/users")
def get_users(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin)
):
    users = db.query(models.User).order_by(models.User.created_at.asc()).all()

    project_counts = dict(
        db.query(models.Project.user_id, func.count(models.Project.id))
        .filter(models.Project.deleted_at == None)
        .group_by(models.Project.user_id)
        .all()
    )
    photo_counts = dict(
        db.query(models.Project.user_id, func.count(models.Photo.id))
        .join(models.Photo, models.Photo.project_id == models.Project.id)
        .filter(models.Project.deleted_at == None, models.Photo.deleted_at == None)
        .group_by(models.Project.user_id)
        .all()
    )

    return [
        {
            "id": u.id,
            "email": u.email,
            "is_verified": u.is_verified,
            "project_limit": u.project_limit,
            "photo_limit": u.photo_limit,
            "created_at": u.created_at,
            "project_count": project_counts.get(u.id, 0),
            "photo_count": photo_counts.get(u.id, 0),
        }
        for u in users
    ]

@router.put("/users/{user_id}")
def update_user(
    user_id: str,
    body: UserLimitUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
    if body.project_limit is not None:
        user.project_limit = body.project_limit
    if body.photo_limit is not None:
        user.photo_limit = body.photo_limit
    if body.is_verified is not None:
        user.is_verified = body.is_verified
    db.commit()
    return {"message": "UPDATED"}

@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="CANNOT_DELETE_SELF")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    # CF 이미지 URL 수집
    photo_urls = [
        p.image_url for p in db.query(models.Photo).filter(
            models.Photo.project_id.in_(
                db.query(models.Project.id).filter(
                    models.Project.user_id == user_id
                )
            ),
            models.Photo.image_url.isnot(None),
            models.Photo.image_url.contains("imagedelivery.net")
        ).all()
    ]

    # CF 이미지 백그라운드 삭제
    if photo_urls:
        background_tasks.add_task(delete_cf_files_parallel, photo_urls)

    # CASCADE로 모든 관련 데이터 자동 삭제
    db.delete(user)
    db.commit()

    return {"message": "DELETED"}

@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin)
):
    total_users = db.query(models.User).count()
    verified_users = db.query(models.User).filter(models.User.is_verified == True).count()
    total_projects = db.query(models.Project).filter(models.Project.deleted_at == None).count()
    total_photos = db.query(models.Photo).filter(models.Photo.deleted_at == None).count()
    total_notes = db.query(models.Note).filter(models.Note.deleted_at == None).count()

    return {
        "total_users": total_users,
        "verified_users": verified_users,
        "total_projects": total_projects,
        "total_photos": total_photos,
        "total_notes": total_notes,
    }

@router.get("/external-stats")
async def get_external_stats(current_user: models.User = Depends(require_admin)):
    
    stats: Dict[str, Any] = {
        "cloudflare": None,
        "linode": None
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            # 1. Cloudflare 
            cf_url = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/images/v1/stats"
            cf_res = await client.get(cf_url, headers={"Authorization": f"Bearer {CF_TOKEN}"})
            cf_json = cf_res.json()
            if cf_json.get("success"):
                res_data = cf_json.get("result", {})
                stats["cloudflare"] = {
                    "current": res_data.get("count", {}).get("current", 0),
                    "limit": res_data.get("count", {}).get("allowed", 0)
                }

            # 2. Linode 인스턴스 정보
            linode_res = await client.get("https://api.linode.com/v4/linode/instances", headers={"Authorization": f"Bearer {LINODE_TOKEN}"})
            if linode_res.status_code == 200:
                nodes = linode_res.json().get("data", [])
                if nodes:
                    target_node = next((n for n in nodes if "172.104.99.68" in n.get("ipv4", [])), nodes[0])
                    
                    # [중요] 여기서 linode 딕셔너리를 먼저 초기화해야 합니다.
                    stats["linode"] = {
                        "label": target_node.get("label"),
                        "status": target_node.get("status"),
                        "ipv4": target_node.get("ipv4", [""])[0],
                        "specs": target_node.get("specs", {}),
                        "cpu_usage": 0,
                        "net_out": 0
                    }

                    # 3. Linode 상세 통계 (CPU, Net)
                    node_id = target_node.get("id")
                    if node_id:
                        usage_res = await client.get(f"https://api.linode.com/v4/linode/instances/{node_id}/stats", headers={"Authorization": f"Bearer {LINODE_TOKEN}"})
                        if usage_res.status_code == 200:
                            u_data = usage_res.json().get("data", {})
                            
                            cpu_list = u_data.get("cpu", [])
                            if cpu_list:
                                stats["linode"]["cpu_usage"] = round(cpu_list[-1][1], 2)
                            
                            net_list = u_data.get("net_v4", {}).get("out", [])
                            if net_list:
                                stats["linode"]["net_out"] = round(net_list[-1][1] / 1024 / 1024, 2)

        except Exception as e:
            print(f"Stats Error: {e}")
            raise HTTPException(status_code=500, detail="외부 API 정보 조회 중 오류가 발생했습니다.")

    return stats

@router.post("/notify")
def send_notice(
    body: NoticeRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin)
):
    query = db.query(models.User)
    if body.verified_only:
        query = query.filter(models.User.is_verified == True)
    users = query.all()

    def send_all(users, subject, content):
        for user in users:
            send_notice_email(user.email, subject, content)

    background_tasks.add_task(send_all, users, body.subject, body.content)

    return {"message": "NOTICE_QUEUED", "recipients": len(users)}


@router.get("/orphan-images/scan", response_model=OrphanScanResult)
async def scan_orphan_images(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin)
):
    # 1. DB에 등록된 CF 이미지 ID 수집 (삭제된 사진 포함)
    db_photos = db.query(models.Photo.image_url).filter(
        models.Photo.image_url.contains("imagedelivery.net")
    ).all()
    db_cf_ids: set[str] = set()
    for (url,) in db_photos:
        try:
            db_cf_ids.add(url.rstrip('/').split('/')[-2])
        except Exception:
            pass

    # 2. CF API 전체 이미지 목록 수집 (페이지네이션)
    cf_images = []
    page = 1
    per_page = 100
    async with httpx.AsyncClient(timeout=30.0) as client:
        while True:
            res = await client.get(
                f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/images/v1",
                headers={"Authorization": f"Bearer {CF_TOKEN}"},
                params={"page": page, "per_page": per_page},
            )
            data = res.json()
            if not data.get("success"):
                raise HTTPException(status_code=500, detail="CF_API_ERROR")
            images = data["result"].get("images", [])
            cf_images.extend(images)
            total_pages = data["result"].get("total_pages", 1)
            if page >= total_pages or len(images) < per_page:
                break
            page += 1

    # 3. DB에 없고 업로드 24시간 경과된 이미지 = 고아
    cutoff = datetime.utcnow() - timedelta(hours=24)
    orphan_ids: List[str] = []
    for img in cf_images:
        if img["id"] in db_cf_ids:
            continue
        try:
            uploaded_dt = datetime.fromisoformat(
                img.get("uploaded", "").replace("Z", "+00:00")
            ).replace(tzinfo=None)
            if uploaded_dt < cutoff:
                orphan_ids.append(img["id"])
        except Exception:
            orphan_ids.append(img["id"])

    return OrphanScanResult(
        orphan_ids=orphan_ids,
        count=len(orphan_ids),
        scanned_cf=len(cf_images),
        scanned_db=len(db_cf_ids),
    )


@router.post("/orphan-images/cleanup")
def cleanup_orphan_images(
    body: OrphanCleanupRequest,
    background_tasks: BackgroundTasks,
    _: models.User = Depends(require_admin)
):
    if not body.image_ids:
        return {"deleted": 0}
    background_tasks.add_task(_delete_cf_ids_parallel, body.image_ids)
    return {"deleted": len(body.image_ids), "message": "CLEANUP_QUEUED"}
