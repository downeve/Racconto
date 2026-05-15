import httpx
import logging
import requests
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Response
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

logger = logging.getLogger(__name__)
security_logger = logging.getLogger("racconto.security")

router = APIRouter(prefix="/racconto-admin", tags=["admin"])

LINODE_TOKEN = os.getenv("LINODE_API_TOKEN")
CF_TOKEN = os.getenv("CF_API_TOKEN")
CF_ACCOUNT_ID = os.getenv("CF_ACCOUNT_ID")

# 관리자 이메일 화이트리스트 (쉼표 구분, 환경변수)
# 예: ADMIN_EMAILS=admin@racconto.app,backup@racconto.app
# 프로덕션에서는 필수 — 미세팅 시 startup 실패. 개발 환경(ENV != "production")에서는
# 비어 있어도 허용하되 시작 시 경고.
_raw = os.getenv("ADMIN_EMAILS", "")
ADMIN_WHITELIST: set[str] = {e.strip() for e in _raw.split(",") if e.strip()}
_IS_PROD = os.getenv("ENV", "development") == "production"

if not ADMIN_WHITELIST:
    if _IS_PROD:
        raise RuntimeError(
            "ADMIN_EMAILS 환경변수가 설정되지 않았습니다. "
            "프로덕션에서는 어드민 화이트리스트가 필수입니다."
        )
    logger.warning("ADMIN_EMAILS 미설정 — 개발 환경. 프로덕션 배포 전 반드시 설정하세요.")

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
        logger.warning("CF orphan 삭제 실패 (무시): %s", e)

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

class EmailTemplateUpdate(BaseModel):
    subject:  Optional[str] = None
    title:    Optional[str] = None
    desc:     Optional[str] = None
    validity: Optional[str] = None
    button:   Optional[str] = None
    ignore:   Optional[str] = None
    body:     Optional[str] = None
    closing:  Optional[str] = None


def require_admin(current_user: models.User = Depends(get_current_user)):
    if not current_user.is_admin:
        security_logger.warning(
            "Unauthorized admin access attempt user_id=%s email=%s",
            current_user.id, current_user.email,
        )
        raise HTTPException(status_code=403, detail="FORBIDDEN")
    # 화이트리스트가 비어 있고 프로덕션이면 위에서 이미 startup이 실패했으므로
    # 여기까지 도달하면 dev 환경. 그래도 fail-closed로 강제하려면 아래 조건을 강화 가능.
    if not ADMIN_WHITELIST:
        security_logger.warning(
            "Admin access without whitelist (dev mode) user_id=%s email=%s",
            current_user.id, current_user.email,
        )
    elif current_user.email not in ADMIN_WHITELIST:
        security_logger.warning(
            "Admin whitelist rejected user_id=%s email=%s",
            current_user.id, current_user.email,
        )
        raise HTTPException(status_code=403, detail="FORBIDDEN")
    return current_user


def _resolve_ip_countries(db, unresolved: list) -> None:
    """ip-api.com 배치 API로 IP → 국가코드 해석 후 DB에 캐시"""
    from collections import defaultdict
    ip_to_ids: dict[str, list[int]] = defaultdict(list)
    local_ips = {'', '127.0.0.1', '::1', 'localhost'}
    for a in unresolved:
        if a.ip_address and a.ip_address not in local_ips:
            ip_to_ids[a.ip_address].append(a.id)
        else:
            a.ip_country = 'LOCAL'

    unique_ips = list(ip_to_ids.keys())
    ip_country_map: dict[str, str] = {}

    for i in range(0, len(unique_ips), 100):
        batch = unique_ips[i:i + 100]
        try:
            res = requests.post(
                "http://ip-api.com/batch?fields=countryCode,query",
                json=[{"query": ip} for ip in batch],
                timeout=5,
            )
            if res.status_code == 200:
                for item in res.json():
                    cc = item.get("countryCode", "")
                    if cc and cc != "":
                        ip_country_map[item["query"]] = cc
        except Exception as e:
            logger.warning("[ip-api] resolve error: %s", e)

    for a in unresolved:
        if a.ip_address in ip_country_map:
            a.ip_country = ip_country_map[a.ip_address]
    try:
        db.commit()
    except Exception:
        db.rollback()


@router.get("/activity-stats")
def get_activity_stats(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    from datetime import date, timedelta
    today = date.today()

    # 미해석 IP 일괄 처리
    unresolved = db.query(models.UserActivity).filter(
        models.UserActivity.ip_country == None
    ).all()
    if unresolved:
        _resolve_ip_countries(db, unresolved)

    # DAU / WAU / MAU
    def active_users(days_back: int) -> int:
        return db.query(func.count(func.distinct(models.UserActivity.user_id))).filter(
            models.UserActivity.date >= today - timedelta(days=days_back - 1)
        ).scalar() or 0

    dau = active_users(1)
    wau = active_users(7)
    mau = active_users(30)

    # 최근 30일 일별 활성 유저 수
    daily_rows = (
        db.query(
            models.UserActivity.date,
            func.count(func.distinct(models.UserActivity.user_id)).label("count"),
        )
        .filter(models.UserActivity.date >= today - timedelta(days=29))
        .group_by(models.UserActivity.date)
        .order_by(models.UserActivity.date)
        .all()
    )

    # 최근 30일 국가 분포
    country_rows = (
        db.query(
            models.UserActivity.ip_country,
            func.count(func.distinct(models.UserActivity.user_id)).label("count"),
        )
        .filter(
            models.UserActivity.date >= today - timedelta(days=29),
            models.UserActivity.ip_country != None,
            models.UserActivity.ip_country != "LOCAL",
        )
        .group_by(models.UserActivity.ip_country)
        .order_by(func.count(func.distinct(models.UserActivity.user_id)).desc())
        .all()
    )

    return {
        "dau": dau,
        "wau": wau,
        "mau": mau,
        "daily": [{"date": str(r.date), "count": r.count} for r in daily_rows],
        "countries": [{"country": r.ip_country, "count": r.count} for r in country_rows],
    }


@router.get("/users")
def get_users(
    response: Response,
    limit: int = 500,
    offset: int = 0,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin)
):
    # 페이지네이션 (P-M4) — 기본 500명, 최대 2000명. 총 개수는 헤더로.
    limit = max(1, min(limit, 2000))
    offset = max(0, offset)

    total = db.query(func.count(models.User.id)).scalar()
    response.headers["X-Total-Count"] = str(total or 0)
    response.headers["X-Limit"] = str(limit)
    response.headers["X-Offset"] = str(offset)

    users = (
        db.query(models.User)
        .order_by(models.User.created_at.asc())
        .limit(limit)
        .offset(offset)
        .all()
    )
    user_ids = [u.id for u in users]

    project_counts: dict = {}
    photo_counts: dict = {}
    if user_ids:
        project_counts = dict(
            db.query(models.Project.user_id, func.count(models.Project.id))
            .filter(
                models.Project.user_id.in_(user_ids),
                models.Project.deleted_at == None,
            )
            .group_by(models.Project.user_id)
            .all()
        )
        photo_counts = dict(
            db.query(models.Project.user_id, func.count(models.Photo.id))
            .join(models.Photo, models.Photo.project_id == models.Project.id)
            .filter(
                models.Project.user_id.in_(user_ids),
                models.Project.deleted_at == None,
                models.Photo.deleted_at == None,
            )
            .group_by(models.Project.user_id)
            .all()
        )

    # 응답 shape는 List로 유지 (프론트엔드 호환). 페이지네이션 정보는 위에서 헤더로 설정.
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

        except Exception:
            logger.exception("Stats Error")
            raise HTTPException(status_code=500, detail="STATS_FETCH_FAILED")

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
            if len(images) < per_page:
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
    if os.getenv("APP_ENV") != "production":
        raise HTTPException(status_code=403, detail="로컬 환경에서는 실제 이미지 삭제가 금지되어 있습니다.")
    if not body.image_ids:
        return {"deleted": 0}
    background_tasks.add_task(_delete_cf_ids_parallel, body.image_ids)
    return {"deleted": len(body.image_ids), "message": "CLEANUP_QUEUED"}


# ─── Email Templates ──────────────────────────────────────────────────────────

TEMPLATE_KEYS = ["verification", "password_reset", "welcome", "social_welcome", "farewell"]
LANGS = ["ko", "en", "ja"]

@router.get("/email-templates")
def get_email_templates(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin)
):
    rows = db.query(models.EmailTemplate).all()
    result: Dict[str, Any] = {}
    for row in rows:
        result[f"{row.key}__{row.lang}"] = {
            "key": row.key, "lang": row.lang,
            "subject": row.subject, "title": row.title,
            "desc": row.desc, "validity": row.validity,
            "button": row.button, "ignore": row.ignore,
            "body": row.body, "closing": row.closing,
        }
    return result


# ─── Infrastructure Costs ────────────────────────────────────────────────────

class InfraCostBody(BaseModel):
    service: str
    plan: Optional[str] = None
    cost_text: Optional[str] = None
    cost_monthly: Optional[str] = None
    note: Optional[str] = None
    order_num: Optional[int] = 0

@router.get("/infra-costs")
def get_infra_costs(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin)
):
    rows = db.query(models.InfraCost).order_by(models.InfraCost.order_num, models.InfraCost.id).all()
    return [
        {
            "id": r.id, "service": r.service, "plan": r.plan,
            "cost_text": r.cost_text, "cost_monthly": r.cost_monthly,
            "note": r.note, "order_num": r.order_num,
        }
        for r in rows
    ]

@router.post("/infra-costs")
def create_infra_cost(
    body: InfraCostBody,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin)
):
    row = models.InfraCost(
        service=body.service, plan=body.plan,
        cost_text=body.cost_text, cost_monthly=body.cost_monthly,
        note=body.note, order_num=body.order_num or 0,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id, "service": row.service, "plan": row.plan,
            "cost_text": row.cost_text, "cost_monthly": row.cost_monthly,
            "note": row.note, "order_num": row.order_num}

@router.put("/infra-costs/{cost_id}")
def update_infra_cost(
    cost_id: int,
    body: InfraCostBody,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin)
):
    row = db.query(models.InfraCost).filter_by(id=cost_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="NOT_FOUND")
    row.service = body.service
    row.plan = body.plan
    row.cost_text = body.cost_text
    row.cost_monthly = body.cost_monthly
    row.note = body.note
    if body.order_num is not None:
        row.order_num = body.order_num
    db.commit()
    return {"ok": True}

@router.delete("/infra-costs/{cost_id}")
def delete_infra_cost(
    cost_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin)
):
    row = db.query(models.InfraCost).filter_by(id=cost_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="NOT_FOUND")
    db.delete(row)
    db.commit()
    return {"ok": True}


@router.put("/email-templates/{key}/{lang}")
def upsert_email_template(
    key: str,
    lang: str,
    body: EmailTemplateUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin)
):
    if key not in TEMPLATE_KEYS or lang not in LANGS:
        raise HTTPException(status_code=400, detail="INVALID_KEY_OR_LANG")
    row = db.query(models.EmailTemplate).filter_by(key=key, lang=lang).first()
    if not row:
        row = models.EmailTemplate(key=key, lang=lang)
        db.add(row)
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(row, field, val)
    db.commit()
    return {"ok": True}
