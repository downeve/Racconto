from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.auth import get_current_user
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

router = APIRouter(prefix="/notes", tags=["notes"])

NOTE_TYPES = ['memo', 'concept', 'research', 'client']

class NoteCreate(BaseModel):
    project_id: str
    content: str
    note_type: Optional[str] = 'memo'
    is_pinned: Optional[bool] = False
    photo_id: Optional[str] = None

class NoteUpdate(BaseModel):
    content: str
    note_type: Optional[str] = 'memo'
    is_pinned: Optional[bool] = False
    photo_id: Optional[str] = None

class NoteResponse(BaseModel):
    id: str
    project_id: str
    content: str
    note_type: Optional[str] = 'memo'
    is_pinned: bool = False
    photo_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class Config:
    from_attributes = True


def get_owned_note_or_404(note_id: str, user_id: str, db: Session) -> models.Note:
    note = db.query(models.Note).join(models.Project).filter(
        models.Note.id == note_id,
        models.Project.user_id == user_id,
        models.Note.deleted_at == None
    ).first()
    if not note:
        raise HTTPException(status_code=404, detail="NOTE_NOT_FOUND")
    return note


@router.post("/", response_model=NoteResponse)
def create_note(
    note: NoteCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    project = db.query(models.Project).filter(
        models.Project.id == note.project_id,
        models.Project.user_id == current_user.id,
    ).first()
    if not project:
        raise HTTPException(status_code=403, detail="FORBIDDEN")

    db_note = models.Note(
        id=str(uuid.uuid4()),
        project_id=note.project_id,
        content=note.content,
        note_type=note.note_type,
        is_pinned=note.is_pinned,
        photo_id=note.photo_id,
    )
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note


@router.put("/{note_id}", response_model=NoteResponse)
def update_note(
    note_id: str,
    note: NoteUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_note = get_owned_note_or_404(note_id, current_user.id, db)
    db_note.content = note.content
    db_note.note_type = note.note_type
    db_note.is_pinned = note.is_pinned
    db_note.photo_id = note.photo_id
    db.commit()
    db.refresh(db_note)
    return db_note


@router.patch("/{note_id}/pin")
def toggle_pin(
    note_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_note = get_owned_note_or_404(note_id, current_user.id, db)
    db_note.is_pinned = not db_note.is_pinned
    db.commit()
    db.refresh(db_note)
    return db_note


@router.delete("/{note_id}")
def delete_note(
    note_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_note = get_owned_note_or_404(note_id, current_user.id, db)
    db.delete(db_note)
    db.commit()
    return {"message": "NOTE_DELETED"}


@router.get("/", response_model=list[NoteResponse])
def get_notes(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.user_id == current_user.id,
    ).first()
    if not project:
        raise HTTPException(status_code=403, detail="FORBIDDEN")

    return db.query(models.Note).filter(
        models.Note.project_id == project_id,
        models.Note.deleted_at == None
    ).order_by(
        models.Note.is_pinned.desc(),
        models.Note.updated_at.desc()
    ).all()
