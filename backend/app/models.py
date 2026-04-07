from sqlalchemy import Column, String, Text, DateTime, Enum, ForeignKey, Integer, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
import enum

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    projects = relationship("Project", back_populates="owner")
    settings = relationship("Setting", back_populates="owner")
    is_verified = Column(Boolean, default=False)
    verify_token = Column(String, nullable=True)
    verify_token_expires_at = Column(DateTime, nullable=True)
    photo_limit = Column(Integer, default=300)
    project_limit = Column(Integer, default=3)
    username = Column(String, unique=True, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ProjectStatus(enum.Enum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    PUBLISHED = "published"
    ARCHIVED = "archived"

class Project(Base):
    __tablename__ = "projects"
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    owner = relationship("User", back_populates="projects")
    title = Column(String, nullable=False)
    title_en = Column(String)
    description = Column(Text)
    description_en = Column(Text)
    status = Column(Enum(ProjectStatus), default=ProjectStatus.IN_PROGRESS)
    cover_image_url = Column(String)
    location = Column(String)
    shot_date = Column(DateTime)
    is_public = Column(String, default="false")
    photos = relationship("Photo", back_populates="project")
    pitches = relationship("Pitch", back_populates="project")
    notes = relationship("Note", back_populates="project")
    delivery_links = relationship("DeliveryLink", back_populates="project")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True, default=None)

class Photo(Base):
    __tablename__ = "photos"
    id = Column(String, primary_key=True)
    project_id = Column(String, ForeignKey("projects.id"))
    image_url = Column(String, nullable=False)
    caption = Column(Text)
    caption_en = Column(Text)
    order = Column(Integer, default=0)
    taken_at = Column(DateTime, nullable=True)
    camera = Column(String, nullable=True)
    lens = Column(String, nullable=True)
    iso = Column(String, nullable=True)
    shutter_speed = Column(String, nullable=True)
    aperture = Column(String, nullable=True)
    focal_length = Column(String, nullable=True)
    gps_lat = Column(String, nullable=True)
    gps_lng = Column(String, nullable=True)
    rating = Column(Integer, nullable=True)
    color_label = Column(String, nullable=True)
    project = relationship("Project", back_populates="photos")
    created_at = Column(DateTime, default=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)
    folder = Column(String, nullable=True)
    original_filename = Column(String, nullable=True)

class Pitch(Base):
    __tablename__ = "pitches"
    id = Column(String, primary_key=True)
    project_id = Column(String, ForeignKey("projects.id"))
    media_name = Column(String, nullable=False)
    editor_name = Column(String)
    editor_email = Column(String)
    sent_date = Column(DateTime)
    status = Column(String, default="sent")
    note = Column(Text)
    project = relationship("Project", back_populates="pitches")
    created_at = Column(DateTime, default=datetime.utcnow)

class Note(Base):
    __tablename__ = "notes"
    id = Column(String, primary_key=True)
    project_id = Column(String, ForeignKey("projects.id"))
    content = Column(Text, nullable=False)
    project = relationship("Project", back_populates="notes")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Chapter(Base):
    __tablename__ = "chapters"
    id = Column(String, primary_key=True)
    project_id = Column(String, ForeignKey("projects.id"))
    parent_id = Column(String, ForeignKey("chapters.id", ondelete="CASCADE"), nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    order_num = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    photos = relationship("ChapterPhoto", back_populates="chapter")

class ChapterPhoto(Base):
    __tablename__ = "chapter_photos"
    id = Column(String, primary_key=True)
    chapter_id = Column(String, ForeignKey("chapters.id"))
    photo_id = Column(String, ForeignKey("photos.id"))
    order_num = Column(Integer, default=0)
    chapter = relationship("Chapter", back_populates="photos")
    photo = relationship("Photo")

class Setting(Base):
    __tablename__ = "settings"
    user_id = Column(String, ForeignKey("users.id"), primary_key=True)
    key = Column(String, primary_key=True)
    value = Column(String, nullable=False)

    owner = relationship("User", back_populates="settings")

# ── 납품 링크 ──────────────────────────────────────────────

class DeliveryLink(Base):
    __tablename__ = "delivery_links"
    id = Column(String, primary_key=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    label = Column(String, nullable=True)
    password_hash = Column(String, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    # 사진 필터 조건
    # filter_rating: 이 값 이상인 사진만 포함 (NULL이면 조건 없음)
    # filter_color:  이 컬러 레이블 사진만 포함 (NULL이면 조건 없음)
    # 둘 다 지정하면 AND 조건 (별점 AND 컬러 둘 다 만족해야 포함)
    filter_rating = Column(Integer, nullable=True)
    filter_color = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="delivery_links")
    selections = relationship("DeliverySelection", back_populates="link", cascade="all, delete-orphan")


class DeliverySelection(Base):
    __tablename__ = "delivery_selections"
    id = Column(String, primary_key=True)
    link_id = Column(String, ForeignKey("delivery_links.id"), nullable=False)
    photo_id = Column(String, ForeignKey("photos.id"), nullable=False)
    comment = Column(Text, nullable=True)
    selected_at = Column(DateTime, default=datetime.utcnow)

    link = relationship("DeliveryLink", back_populates="selections")
    photo = relationship("Photo")