from sqlalchemy import Column, String, Text, DateTime, Date, Enum, ForeignKey, Integer, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
import enum
import uuid

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=True)
    oauth_provider = Column(String, nullable=True)
    oauth_id = Column(String, nullable=True, index=True)
    apple_refresh_token = Column(String, nullable=True)
    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")
    settings = relationship("Setting", back_populates="owner", cascade="all, delete-orphan")
    is_verified = Column(Boolean, default=False)
    verify_token = Column(String, nullable=True, index=True)
    verify_token_expires_at = Column(DateTime, nullable=True)
    reset_token = Column(String, nullable=True, index=True)
    reset_token_expires_at = Column(DateTime, nullable=True)
    photo_limit = Column(Integer, default=1000)
    project_limit = Column(Integer, default=3)
    username = Column(String, unique=True, nullable=True, index=True)
    is_admin = Column(Boolean, default=False, nullable=False, server_default='false')
    tier = Column(String, default='open_beta', nullable=False, server_default='open_beta')
    created_at = Column(DateTime, default=datetime.utcnow)
    token_invalidated_at = Column(DateTime, nullable=True, default=None)

class ProjectStatus(enum.Enum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    PUBLISHED = "published"
    ARCHIVED = "archived"

class Project(Base):
    __tablename__ = "projects"
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    owner = relationship("User", back_populates="projects")
    title = Column(String, nullable=False)
    title_en = Column(String)
    description = Column(Text)
    description_en = Column(Text)
    status = Column(Enum(ProjectStatus), default=ProjectStatus.IN_PROGRESS)
    cover_image_url = Column(String)
    location = Column(String)
    shot_date = Column(DateTime)
    is_public = Column(Boolean, default=False, nullable=False, server_default='false')
    published_at = Column(DateTime, nullable=True)  # 마지막 포트폴리오 공개 시점 — 비공개 → 공개 전환 시마다 갱신
    view_count = Column(Integer, nullable=False, default=0, server_default='0')
    photos = relationship("Photo", back_populates="project", cascade="all, delete-orphan")
    pitches = relationship("Pitch", back_populates="project", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="project", cascade="all, delete-orphan")
    delivery_links = relationship("DeliveryLink", back_populates="project", cascade="all, delete-orphan")
    order_num = Column(Integer, default=0, nullable=False, server_default='0')
    slug = Column(String, unique=True, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True, default=None, index=True)
    folder_links = relationship("FolderLink", back_populates="project", cascade="all, delete-orphan", lazy="selectin")

    @property
    def linked_folders(self) -> list:
        return [fl.folder_path for fl in self.folder_links]

class FolderLink(Base):
    __tablename__ = "folder_links"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False, index=True)
    folder_path = Column(String, nullable=False)
    linked_at = Column(DateTime, default=datetime.utcnow)
    project = relationship("Project", back_populates="folder_links")

class Photo(Base):
    __tablename__ = "photos"
    id = Column(String, primary_key=True)
    project_id = Column(String, ForeignKey("projects.id"), index=True)
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
    deleted_at = Column(DateTime, nullable=True, index=True)
    folder = Column(String, nullable=True)
    original_filename = Column(String, nullable=True)
    local_missing = Column(Boolean, default=False, nullable=False)
    source = Column(String, nullable=True, default='web')
    rotation = Column(Integer, default=0, nullable=False, server_default='0')
    original_image_url = Column(String, nullable=True)
    is_rotating = Column(Boolean, default=False, nullable=False, server_default='false')
    # P-7: 이미지 원본 차원 — Portfolio 레이아웃 점프 제거용.
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)

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
    project_id = Column(String, ForeignKey("projects.id"), index=True)
    content = Column(Text, nullable=False)
    project = relationship("Project", back_populates="notes")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True, default=None, index=True)
    note_type = Column(String, nullable=True, default='memo')
    is_pinned = Column(Boolean, default=False, nullable=False)
    photo_id = Column(String, ForeignKey("photos.id", ondelete="SET NULL"), nullable=True)

class Chapter(Base):
    __tablename__ = "chapters"
    id = Column(String, primary_key=True)
    project_id = Column(String, ForeignKey("projects.id"), index=True)
    parent_id = Column(String, ForeignKey("chapters.id", ondelete="CASCADE"), nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    order_num = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    # ↓ chapter_photos → chapter_items 로 relationship 이름 변경
    items = relationship("ChapterItem", back_populates="chapter", cascade="all, delete-orphan")


# ── ChapterPhoto → ChapterItem ─────────────────────────────
# 기존 chapter_photos 테이블을 chapter_items 로 교체.
# item_type: 'PHOTO' (기본) | 'TEXT'
# - PHOTO: photo_id 에 값, text_content 는 NULL
# - TEXT:  text_content 에 값, photo_id 는 NULL
# ──────────────────────────────────────────────────────────
class ChapterItem(Base):
    __tablename__ = "chapter_items"
    id = Column(String, primary_key=True)
    chapter_id = Column(String, ForeignKey("chapters.id", ondelete="CASCADE"), nullable=False, index=True)
    order_num = Column(Integer, default=0, nullable=False)

    # 아이템 타입 구분
    item_type = Column(String, nullable=False, default='PHOTO')  # 'PHOTO' | 'TEXT'

    # PHOTO 전용 필드 (TEXT 일 때는 NULL)
    photo_id = Column(String, ForeignKey("photos.id", ondelete="CASCADE"), nullable=True)

    # TEXT 전용 필드 (PHOTO 일 때는 NULL)
    text_content = Column(Text, nullable=True)

    block_type = Column(String, nullable=False, default='default', server_default='default')
    # 'default' | 'side-left' | 'side-right'

    chapter = relationship("Chapter", back_populates="items")
    photo = relationship("Photo")

    block_id = Column(String, nullable=True)          # 같은 블록의 PHOTO끼리 공유
    order_in_block = Column(Integer, default=0, nullable=False)  # 블록 내 사진 순서
    block_layout = Column(String, nullable=False, default='grid', server_default='grid')
    # 블록 단위 레이아웃: 'grid'(3열) | 'wide'(2열) | 'single'(전체 너비)


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


class EmailTemplate(Base):
    __tablename__ = "email_templates"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(50), nullable=False)    # verification / password_reset / welcome / social_welcome / farewell
    lang = Column(String(5), nullable=False)    # ko / en / ja
    subject = Column(String(300))
    title = Column(String(300))
    desc = Column(Text)        # verification, password_reset
    validity = Column(String(300))  # verification, password_reset
    button = Column(String(200))
    ignore = Column(String(500))   # verification, password_reset
    body = Column(Text)        # welcome, social_welcome, farewell
    closing = Column(Text)     # welcome, social_welcome, farewell
    __table_args__ = (UniqueConstraint('key', 'lang', name='uq_email_template_key_lang'),)


class InfraCost(Base):
    __tablename__ = "infra_costs"
    id = Column(Integer, primary_key=True, index=True)
    service = Column(String, nullable=False)
    plan = Column(String, nullable=True)
    cost_text = Column(String, nullable=True)       # 표시용 문자열 e.g. "$13.2 / mo"
    cost_monthly = Column(String, nullable=True)    # 월 환산 숫자 문자열 e.g. "13.2" (합계 계산용)
    note = Column(Text, nullable=True)
    order_num = Column(Integer, default=0, nullable=False, server_default='0')
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Comment(Base):
    __tablename__ = "comments"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    parent_id = Column(String, ForeignKey("comments.id", ondelete="CASCADE"), nullable=True, index=True)  # 대댓글 전용. 최상위 댓글은 NULL.
    user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    guest_name = Column(String(50), nullable=True)        # 비로그인 전용
    delete_token = Column(String(64), nullable=True)      # 비로그인 삭제용
    ip_hash = Column(String(64), nullable=False)          # 스팸 방지, 내부 전용
    body = Column(Text, nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False, server_default='false')
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class UserActivity(Base):
    __tablename__ = "user_activities"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    ip_address = Column(String, nullable=True)
    ip_country = Column(String(2), nullable=True)  # ISO 국가코드, ip-api.com으로 lazy resolve
    __table_args__ = (UniqueConstraint('user_id', 'date', name='uq_user_activity_user_date'),)