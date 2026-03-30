from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.auth import verify_password, create_access_token, verify_token, get_password_hash
from app.database import get_db
from sqlalchemy.orm import Session
from app import models
from pydantic import BaseModel
import os

router = APIRouter(prefix="/auth", tags=["auth"])

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD_HASH = os.getenv("ADMIN_PASSWORD_HASH", "")

class Token(BaseModel):
    access_token: str
    token_type: str

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

def get_password_hash_from_db(db: Session) -> str:
    setting = db.query(models.Setting).filter(models.Setting.key == "admin_password_hash").first()
    if setting and setting.value:
        return setting.value
    return ADMIN_PASSWORD_HASH

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    if form_data.username != ADMIN_USERNAME:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="아이디 또는 비밀번호가 틀렸습니다"
        )
    current_hash = get_password_hash_from_db(db)
    if not current_hash or not verify_password(form_data.password, current_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="아이디 또는 비밀번호가 틀렸습니다"
        )
    access_token = create_access_token(data={"sub": form_data.username})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me")
def get_me(username: str = Depends(verify_token)):
    return {"username": username}

@router.put("/password")
def change_password(
    body: PasswordChange,
    username: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    current_hash = get_password_hash_from_db(db)
    if not verify_password(body.current_password, current_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="현재 비밀번호가 틀렸습니다"
        )
    new_hash = get_password_hash(body.new_password)
    
    # DB에 새 해시 저장
    setting = db.query(models.Setting).filter(models.Setting.key == "admin_password_hash").first()
    if setting:
        setting.value = new_hash
    else:
        setting = models.Setting(key="admin_password_hash", value=new_hash)
        db.add(setting)
    db.commit()
    
    return {"message": "비밀번호가 변경되었습니다"}