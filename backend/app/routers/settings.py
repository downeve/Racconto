from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from pydantic import BaseModel
from typing import Dict
from app.auth import get_current_user

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