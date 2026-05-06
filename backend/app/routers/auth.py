from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from fastapi.security import OAuth2PasswordRequestForm
from app.auth import verify_password, create_access_token, get_password_hash, get_current_user
from app.database import get_db
from sqlalchemy.orm import Session
from app import models
from pydantic import BaseModel, EmailStr
import uuid
from app.email import send_verification_email, send_password_reset_email, send_farewell_email, send_welcome_email
from datetime import datetime, timedelta
from typing import Optional
from app.routers.photos import delete_cf_files_parallel
import secrets
import httpx
import jwt as pyjwt
import time
import os
from starlette.requests import Request
from starlette.responses import RedirectResponse

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")

APPLE_CLIENT_ID = os.getenv("APPLE_CLIENT_ID")
APPLE_TEAM_ID = os.getenv("APPLE_TEAM_ID")
APPLE_KEY_ID = os.getenv("APPLE_KEY_ID")
APPLE_PRIVATE_KEY = os.getenv("APPLE_PRIVATE_KEY", "")

BACKEND_URL = os.getenv("BACKEND_URL", "https://racconto.app")
FRONTEND_URL = os.getenv("BASE_URL", "https://racconto.app")

router = APIRouter(prefix="/auth", tags=["auth"])

class Token(BaseModel):
    access_token: str
    token_type: str

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    lang: Optional[str] = 'ko'

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class ResendVerification(BaseModel):
    email: str

class UsernameUpdate(BaseModel):
    username: str

class WithdrawRequest(BaseModel):
    password: str
    lang: str = 'ko'

class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    lang: Optional[str] = 'ko'

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/resend-verification")
def resend_verification(body: ResendVerification, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == body.email).first()
    if not user:
        # 보안상 존재 여부 노출 안 함
        return {"message": "VERFICATION_SENT"}
    if user.is_verified:
        raise HTTPException(
            status_code=400,
            detail="EMAIL_ALREADY_VERIFIED"
        )
    user.verify_token = secrets.token_urlsafe(32)
    user.verify_token_expires_at = datetime.utcnow() + timedelta(hours=24)
    db.commit()
    send_verification_email(body.email, user.verify_token)
    return {"message": "VERIFICATION_SENT"}


@router.post("/forgot-password")
def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == body.email).first()
    if user and user.is_verified:
        user.reset_token = secrets.token_urlsafe(32)
        user.reset_token_expires_at = datetime.utcnow() + timedelta(hours=1)
        db.commit()
        send_password_reset_email(body.email, user.reset_token, lang=body.lang)
    return {"message": "RESET_EMAIL_SENT"}


@router.post("/reset-password")
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="PASSWORD_TOO_SHORT")
    user = db.query(models.User).filter(
        models.User.reset_token == body.token
    ).first()
    if not user or not user.reset_token_expires_at or user.reset_token_expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="INVALID_TOKEN")
    user.password_hash = get_password_hash(body.new_password)
    user.reset_token = None
    user.reset_token_expires_at = None
    db.commit()
    return {"message": "PASSWORD_RESET"}


@router.post("/register", status_code=201)
def register(body: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == body.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="EMAIL_ALREADY_EXISTS"
        )
    
    verify_token = secrets.token_urlsafe(32)
    
    user = models.User(
        id=str(uuid.uuid4()),
        email=body.email,
        password_hash=get_password_hash(body.password),
        is_verified=False,
        verify_token=verify_token,
        verify_token_expires_at=datetime.utcnow() + timedelta(hours=24),
        photo_limit=1000,
        tier='open_beta',
    )
    db.add(user)
    db.commit()

    send_verification_email(body.email, verify_token, lang=body.lang)

    return {"message": "REGISTER_SUCCESS"}


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="INVALID_CREDENTIALS"
        )
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="EMAIL_NOT_VERIFIED"
        )
    access_token = create_access_token(data={"sub": user.id, "is_admin": user.is_admin})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me")
def get_me(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project_count = db.query(models.Project).filter(
        models.Project.user_id == current_user.id,
        models.Project.deleted_at == None
    ).count()

    # 유저 계정 전체 사진 수 합계 (업로드 제한과 동일 기준, 삭제된 프로젝트 제외)
    total_photo_count = db.query(models.Photo).join(models.Project).filter(
        models.Project.user_id == current_user.id,
        models.Project.deleted_at == None,
        models.Photo.deleted_at == None
    ).count()

    return {
        "user_id": current_user.id,
        "email": current_user.email,
        "username": current_user.username,
        "is_admin": current_user.is_admin,
        "tier": current_user.tier,
        "project_count": project_count,
        "project_limit": current_user.project_limit,
        "photo_count": total_photo_count,
        "photo_limit": current_user.photo_limit,
    }


@router.put("/password")
def change_password(
    body: PasswordChange,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="WRONG_PASSWORD"
        )
    current_user.password_hash = get_password_hash(body.new_password)
    db.commit()
    return {"message": "PASSWORD_CHANGED"}


@router.get("/verify-email")
def verify_email(token: str, background_tasks: BackgroundTasks, lang: str = 'ko', db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        models.User.verify_token == token
    ).first()

    if not user:
        raise HTTPException(status_code=400, detail="INVALID_TOKEN")

    if not user.verify_token_expires_at or user.verify_token_expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="INVALID_TOKEN")

    user.is_verified = True
    user.verify_token = None
    user.verify_token_expires_at = None
    db.commit()

    background_tasks.add_task(send_welcome_email, user.email, lang)

    return {"message": "EMAIL_VERIFIED"}


@router.get("/check-username/{username}")
def check_username(username: str, db: Session = Depends(get_db)):
    exists = db.query(models.User).filter(models.User.username == username).first()
    return {"available": exists is None}


@router.put("/username")
def update_username(
    body: UsernameUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 💡 [추가] 1. 값이 없거나 빈 칸("")인 경우: 유저네임 삭제 처리
    if not body.username:
        current_user.username = None # DB에는 Null로 저장하는 것이 안전합니다.
        db.commit()
        return {"message": "USERNAME_CLEARED", "username": ""}

    # 💡 2. 값이 입력된 경우: 기존 유효성 검사 진행
    if len(body.username) < 3:
        raise HTTPException(status_code=400, detail="USERNAME_TOO_SHORT")
    if len(body.username) > 30:
        raise HTTPException(status_code=400, detail="USERNAME_TOO_LONG")
    
    import re
    if not re.match(r'^[a-zA-Z0-9_-]+$', body.username):
        raise HTTPException(status_code=400, detail="USERNAME_INVALID_CHARS")
        
    existing = db.query(models.User).filter(
        models.User.username == body.username,
        models.User.id != current_user.id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="USERNAME_ALREADY_TAKEN")
        
    current_user.username = body.username
    db.commit()
    
    return {"message": "USERNAME_UPDATED", "username": body.username}


@router.get("/google/login")
async def google_login(request: Request):
    state = secrets.token_urlsafe(16)
    request.session["oauth_state"] = state
    redirect_uri = f"{BACKEND_URL}/api/auth/google/callback"
    google_auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={GOOGLE_CLIENT_ID}"
        f"&redirect_uri={redirect_uri}"
        "&response_type=code"
        "&scope=openid email profile"
        f"&state={state}"
    )
    return RedirectResponse(google_auth_url)


@router.get("/google/callback")
async def google_callback(request: Request, code: str, state: str, db: Session = Depends(get_db)):
    saved_state = request.session.get("oauth_state")
    if not saved_state or saved_state != state:
        raise HTTPException(status_code=400, detail="INVALID_STATE")

    redirect_uri = f"{BACKEND_URL}/api/auth/google/callback"

    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            }
        )
        token_data = token_resp.json()

    if "error" in token_data:
        raise HTTPException(status_code=400, detail="GOOGLE_TOKEN_ERROR")

    id_token = token_data.get("id_token")
    payload = pyjwt.decode(id_token, options={"verify_signature": False})

    google_id = payload["sub"]
    email = payload.get("email")

    user = db.query(models.User).filter(
        models.User.oauth_provider == "google",
        models.User.oauth_id == google_id
    ).first()

    if not user:
        user = db.query(models.User).filter(models.User.email == email).first()
        if user:
            user.oauth_provider = "google"
            user.oauth_id = google_id
            user.is_verified = True
        else:
            username = email.split("@")[0] if email else f"user_{google_id[:8]}"
            existing = db.query(models.User).filter(models.User.username == username).first()
            if existing:
                username = f"{username}_{secrets.token_hex(3)}"
            user = models.User(
                id=str(uuid.uuid4()),
                email=email,
                username=username,
                password_hash=None,
                oauth_provider="google",
                oauth_id=google_id,
                is_verified=True,
            )
            db.add(user)
        db.commit()
        db.refresh(user)

    access_token = create_access_token(data={"sub": user.id, "is_admin": user.is_admin})
    return RedirectResponse(f"{FRONTEND_URL}/auth/social-callback?token={access_token}")


def _generate_apple_client_secret() -> str:
    now = int(time.time())
    payload = {
        "iss": APPLE_TEAM_ID,
        "iat": now,
        "exp": now + 86400 * 180,
        "aud": "https://appleid.apple.com",
        "sub": APPLE_CLIENT_ID,
    }
    headers = {"kid": APPLE_KEY_ID, "alg": "ES256"}
    return pyjwt.encode(payload, APPLE_PRIVATE_KEY, algorithm="ES256", headers=headers)


@router.get("/apple/login")
async def apple_login(request: Request):
    state = secrets.token_urlsafe(16)
    request.session["oauth_state"] = state
    redirect_uri = f"{BACKEND_URL}/api/auth/apple/callback"
    apple_auth_url = (
        "https://appleid.apple.com/auth/authorize"
        f"?client_id={APPLE_CLIENT_ID}"
        f"&redirect_uri={redirect_uri}"
        "&response_type=code"
        "&scope=name email"
        "&response_mode=form_post"
        f"&state={state}"
    )
    return RedirectResponse(apple_auth_url)


@router.post("/apple/callback")
async def apple_callback(request: Request, db: Session = Depends(get_db)):
    form = await request.form()
    code = form.get("code")
    state = form.get("state")
    user_info_str = form.get("user")

    saved_state = request.session.get("oauth_state")
    if not saved_state or saved_state != state:
        raise HTTPException(status_code=400, detail="INVALID_STATE")

    redirect_uri = f"{BACKEND_URL}/api/auth/apple/callback"
    client_secret = _generate_apple_client_secret()

    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://appleid.apple.com/auth/token",
            data={
                "client_id": APPLE_CLIENT_ID,
                "client_secret": client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        token_data = token_resp.json()

    if "error" in token_data:
        raise HTTPException(status_code=400, detail="APPLE_TOKEN_ERROR")

    id_token = token_data.get("id_token")
    payload = pyjwt.decode(id_token, options={"verify_signature": False})

    apple_id = payload["sub"]
    email = payload.get("email")

    if user_info_str:
        import json as _json
        user_data = _json.loads(user_info_str)
        first = user_data.get("name", {}).get("firstName", "")
        last = user_data.get("name", {}).get("lastName", "")

    user = db.query(models.User).filter(
        models.User.oauth_provider == "apple",
        models.User.oauth_id == apple_id
    ).first()

    if not user:
        if email:
            user = db.query(models.User).filter(models.User.email == email).first()
            if user:
                user.oauth_provider = "apple"
                user.oauth_id = apple_id
                user.is_verified = True

        if not user:
            username_base = email.split("@")[0] if email else f"user_{apple_id[:8]}"
            username = username_base
            existing = db.query(models.User).filter(models.User.username == username).first()
            if existing:
                username = f"{username}_{secrets.token_hex(3)}"
            user = models.User(
                id=str(uuid.uuid4()),
                email=email or f"{apple_id}@privaterelay.appleid.apple.com",
                username=username,
                password_hash=None,
                oauth_provider="apple",
                oauth_id=apple_id,
                is_verified=True,
            )
            db.add(user)
        db.commit()
        db.refresh(user)

    access_token = create_access_token(data={"sub": user.id, "is_admin": user.is_admin})
    return RedirectResponse(f"{FRONTEND_URL}/auth/social-callback?token={access_token}", status_code=303)


@router.delete("/withdraw")
def withdraw(
    body: WithdrawRequest,
    background_tasks: BackgroundTasks,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 비밀번호 확인
    if not verify_password(body.password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="WRONG_PASSWORD")
    
    """회원 탈퇴 — CF 이미지 삭제 후 유저 및 관련 데이터 삭제"""
    from app.routers.photos import delete_from_cloudflare
    from fastapi import BackgroundTasks

    # CF 이미지 URL 수집
    photo_urls = [
        p.image_url for p in db.query(models.Photo).filter(
            models.Photo.project_id.in_(
                db.query(models.Project.id).filter(
                    models.Project.user_id == current_user.id
                )
            ),
            models.Photo.image_url.isnot(None),
            models.Photo.image_url.contains("imagedelivery.net")
        ).all()
    ]

    # 탈퇴 전 이메일·언어 저장 (DB 삭제 후엔 참조 불가)
    user_email = current_user.email
    user_lang = body.lang

    # CF 이미지 백그라운드 삭제
    if photo_urls:
        background_tasks.add_task(delete_cf_files_parallel, photo_urls)

    # CASCADE로 모든 관련 데이터 자동 삭제
    db.delete(current_user)
    db.commit()

    background_tasks.add_task(send_farewell_email, user_email, user_lang)

    return {"message": "WITHDRAWN"}
