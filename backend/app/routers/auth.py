from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.auth import verify_password, create_access_token, get_password_hash, get_current_user
from app.database import get_db
from sqlalchemy.orm import Session
from app import models
from pydantic import BaseModel, EmailStr
import uuid
from app.email import send_verification_email
from datetime import datetime, timedelta
import secrets

router = APIRouter(prefix="/auth", tags=["auth"])

class Token(BaseModel):
    access_token: str
    token_type: str

class UserRegister(BaseModel):
    email: EmailStr
    password: str

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class ResendVerification(BaseModel):
    email: str

class UsernameUpdate(BaseModel):
    username: str


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
    )
    db.add(user)
    db.commit()

    send_verification_email(body.email, verify_token)

    return {"message": "REGTISTER_SUCCESS"}


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
    access_token = create_access_token(data={"sub": user.id})
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

    # 프로젝트별 사진 수 최대값 (가장 많은 프로젝트 기준)
    from sqlalchemy import func
    photo_counts = db.query(
        models.Photo.project_id,
        func.count(models.Photo.id).label('count')
    ).filter(
        models.Photo.deleted_at == None,
        models.Photo.project_id.in_(
            db.query(models.Project.id).filter(
                models.Project.user_id == current_user.id
            )
        )
    ).group_by(models.Photo.project_id).all()

    max_photo_count = max((r.count for r in photo_counts), default=0)

    return {
        "user_id": current_user.id,
        "email": current_user.email,
        "username": current_user.username,
        "project_count": project_count,
        "project_limit": current_user.project_limit,
        "photo_count": max_photo_count,
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
def verify_email(token: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        models.User.verify_token == token
    ).first()
    
    if not user:
        raise HTTPException(status_code=400, detail="INVALID_TOKEN")
    
    if user.verify_token_expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="INVALID_TOKEN")
    
    user.is_verified = True
    user.verify_token = None
    user.verify_token_expires_at = None
    db.commit()
    
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
    if not body.username or len(body.username) < 3:
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