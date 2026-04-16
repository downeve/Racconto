from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from pydantic import BaseModel
from typing import Dict
from app.auth import get_current_user

SETTING_KEY_MAX_LEN = 100
SETTING_VALUE_MAX_LEN = 5000


def _validate_setting(key: str, value: str):
    if len(key) > SETTING_KEY_MAX_LEN:
        raise HTTPException(status_code=400, detail="SETTING_KEY_TOO_LONG")
    if len(value) > SETTING_VALUE_MAX_LEN:
        raise HTTPException(status_code=400, detail="SETTING_VALUE_TOO_LONG")

router = APIRouter(prefix="/settings", tags=["settings"])

class SettingUpdate(BaseModel):
    value: str

@router.get("/")
def get_settings(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    settings = db.query(models.Setting).filter(
        models.Setting.user_id == current_user.id
    ).all()
    return {s.key: s.value for s in settings}


@router.put("/{key}")
def update_setting(
    key: str,
    setting: SettingUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    _validate_setting(key, setting.value)
    db_setting = db.query(models.Setting).filter(
        models.Setting.user_id == current_user.id,
        models.Setting.key == key
    ).first()
    if db_setting:
        db_setting.value = setting.value
    else:
        db_setting = models.Setting(
            user_id=current_user.id,
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
    current_user: models.User = Depends(get_current_user)
):
    for key, value in settings.items():
        _validate_setting(key, value)
        db_setting = db.query(models.Setting).filter(
            models.Setting.user_id == current_user.id,
            models.Setting.key == key
        ).first()
        if db_setting:
            db_setting.value = value
        else:
            db_setting = models.Setting(
                user_id=current_user.id,
                key=key,
                value=value
            )
            db.add(db_setting)
    db.commit()
    return {"message": "저장되었습니다"}