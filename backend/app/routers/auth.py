from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.auth import verify_password, create_access_token, get_password_hash, get_current_user
from app.database import get_db
from sqlalchemy.orm import Session
from app import models
from pydantic import BaseModel, EmailStr
import uuid

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


@router.post("/register", status_code=201)
def register(body: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == body.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 사용 중인 이메일입니다"
        )
    user = models.User(
        id=str(uuid.uuid4()),
        email=body.email,
        password_hash=get_password_hash(body.password),
    )
    db.add(user)
    db.commit()
    return {"message": "회원가입이 완료되었습니다", "user_id": user.id}


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 틀렸습니다"
        )
    access_token = create_access_token(data={"sub": user.id})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me")
def get_me(current_user: models.User = Depends(get_current_user)):
    return {"user_id": current_user.id, "email": current_user.email}


@router.put("/password")
def change_password(
    body: PasswordChange,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="현재 비밀번호가 틀렸습니다"
        )
    current_user.password_hash = get_password_hash(body.new_password)
    db.commit()
    return {"message": "비밀번호가 변경되었습니다"}