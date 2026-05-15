from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from pydantic import BaseModel
from typing import Dict
from app.auth import get_current_user, get_current_user_id

SETTING_VALUE_MAX_LEN = 5000

# 허용된 setting 키 (M7) — 클라이언트가 임의 키를 만들지 못하도록 화이트리스트.
# 새 설정 추가 시 여기에 명시.
_ALLOWED_SETTING_KEYS: set[str] = {
    "portfolio_theme",       # 'light' | 'dark'
    "delivery_tag_color",    # 컬러 레이블 키
    "default_grid_cols",     # '1' | '2' | '3'
    "default_show_exif",     # 'true' | 'false'
    "default_sort_by",       # 정렬 기준
    "default_sort_order",    # 'asc' | 'desc'
}


def _validate_setting(key: str, value: str):
    if key not in _ALLOWED_SETTING_KEYS:
        raise HTTPException(status_code=400, detail="SETTING_KEY_NOT_ALLOWED")
    if len(value) > SETTING_VALUE_MAX_LEN:
        raise HTTPException(status_code=400, detail="SETTING_VALUE_TOO_LONG")

router = APIRouter(prefix="/settings", tags=["settings"])

class SettingUpdate(BaseModel):
    value: str

@router.get("/")
def get_settings(
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    settings = db.query(models.Setting).filter(
        models.Setting.user_id == current_user_id
    ).all()
    return {s.key: s.value for s in settings}


@router.put("/{key}")
def update_setting(
    key: str,
    setting: SettingUpdate,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    _validate_setting(key, setting.value)
    db_setting = db.query(models.Setting).filter(
        models.Setting.user_id == current_user_id,
        models.Setting.key == key
    ).first()
    if db_setting:
        db_setting.value = setting.value
    else:
        db_setting = models.Setting(
            user_id=current_user_id,
            key=key,
            value=setting.value
        )
        db.add(db_setting)
    db.commit()
    return {"key": key, "value": setting.value}


@router.put("/batch/update")
def update_settings_batch(
    settings: Dict[str, str],
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    for key, value in settings.items():
        _validate_setting(key, value)

    existing = {
        s.key: s
        for s in db.query(models.Setting).filter(
            models.Setting.user_id == current_user_id,
            models.Setting.key.in_(settings.keys())
        ).all()
    }
    for key, value in settings.items():
        if key in existing:
            existing[key].value = value
        else:
            db.add(models.Setting(user_id=current_user_id, key=key, value=value))
    db.commit()
    return {"message": "저장되었습니다"}