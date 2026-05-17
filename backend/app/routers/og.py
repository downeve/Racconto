import os
import re
import html as html_lib
from fastapi import APIRouter, Depends
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from .. import models
from ..database import get_db

router = APIRouter(prefix="/og", tags=["og"])

FRONTEND_DIST_PATH = os.environ.get(
    "FRONTEND_DIST_PATH",
    "/var/www/Racconto/frontend/dist/index.html",
)
BASE_URL = os.environ.get("BASE_URL", "https://racconto.app")


def _read_index() -> str:
    with open(FRONTEND_DIST_PATH, encoding="utf-8") as f:
        return f.read()


def _cf_public(url: str | None) -> str | None:
    if not url or "imagedelivery.net" not in url:
        return url
    return re.sub(r"/[^/]+$", "/public", url)


def _inject_og(html: str, title: str, description: str, image: str | None, url: str) -> str:
    esc = html_lib.escape
    tags = (
        f'    <meta property="og:title" content="{esc(title)}" />\n'
        f'    <meta property="og:description" content="{esc(description)}" />\n'
        f'    <meta property="og:url" content="{esc(url)}" />\n'
        f'    <meta property="og:type" content="website" />\n'
        f'    <meta name="twitter:card" content="summary_large_image" />\n'
    )
    if image:
        tags += f'    <meta property="og:image" content="{esc(image)}" />\n'
        tags += f'    <meta name="twitter:image" content="{esc(image)}" />\n'
    # <head> 시작 직후에 주입 — Facebook/Twitter 크롤러는 head 앞쪽만 파싱함
    return html.replace("<head>", "<head>\n" + tags, 1)


@router.api_route("/{username}", methods=["GET", "HEAD"], response_class=HTMLResponse)
def og_portfolio(username: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        return HTMLResponse(content=_read_index())

    projects = (
        db.query(models.Project)
        .filter(
            models.Project.user_id == user.id,
            models.Project.is_public == True,
            models.Project.deleted_at == None,
        )
        .order_by(models.Project.order_num)
        .all()
    )

    title = f"@{username}의 포트폴리오 — Racconto"
    description = projects[0].description or f"{username}의 Racconto 포트폴리오" if projects else f"{username}의 Racconto 포트폴리오"
    image = _cf_public(projects[0].cover_image_url) if projects else None
    url = f"{BASE_URL}/{username}"

    return HTMLResponse(content=_inject_og(_read_index(), title, description, image, url))


@router.api_route("/{username}/{slug}", methods=["GET", "HEAD"], response_class=HTMLResponse)
def og_project(username: str, slug: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        return HTMLResponse(content=_read_index())

    project = (
        db.query(models.Project)
        .filter(
            models.Project.user_id == user.id,
            models.Project.slug == slug,
            models.Project.is_public == True,
            models.Project.deleted_at == None,
        )
        .first()
    )
    if not project:
        return HTMLResponse(content=_read_index())

    title = f"{project.title} — Racconto"
    description = project.description or f"@{username}의 프로젝트"
    image = _cf_public(project.cover_image_url)
    url = f"{BASE_URL}/{username}/{slug}"

    return HTMLResponse(content=_inject_og(_read_index(), title, description, image, url))
