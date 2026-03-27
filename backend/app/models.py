from sqlalchemy import Column, String, Text, DateTime, Enum, ForeignKey, Integer
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
import enum

class ProjectStatus(enum.Enum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    PUBLISHED = "published"
    ARCHIVED = "archived"

class Project(Base):
    __tablename__ = "projects"
    id = Column(String, primary_key=True)
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
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Photo(Base):
    __tablename__ = "photos"
    id = Column(String, primary_key=True)
    project_id = Column(String, ForeignKey("projects.id"))
    image_url = Column(String, nullable=False)
    caption = Column(Text)
    caption_en = Column(Text)
    order = Column(Integer, default=0)
    is_portfolio = Column(String, default="false")
    project = relationship("Project", back_populates="photos")
    created_at = Column(DateTime, default=datetime.utcnow)

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