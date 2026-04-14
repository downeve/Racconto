from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.auth import get_current_user
from app.routers.photos import delete_from_cloudflare, delete_cf_files_parallel
import uuid
import os

router = APIRouter(prefix="/projects", tags=["projects"])

class ReorderRequest(BaseModel):
    ids: list[str]

class ProjectCreate(BaseModel):
    title: str
    title_en: Optional[str] = None
    description: Optional[str] = None
    description_en: Optional[str] = None
    status: Optional[str] = "in_progress"
    location: Optional[str] = None
    shot_date: Optional[datetime] = None
    is_public: Optional[str] = "false"
    cover_image_url: Optional[str] = None

class ProjectResponse(BaseModel):
    id: str
    title: str
    title_en: Optional[str]
    description: Optional[str]
    description_en: Optional[str]
    status: models.ProjectStatus
    cover_image_url: Optional[str]
    location: Optional[str]
    shot_date: Optional[datetime]
    is_public: str
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# GET /projects/
@router.get("/", response_model=list[ProjectResponse])
def get_projects(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.Project).filter(
        models.Project.user_id == current_user.id,
        models.Project.deleted_at == None
    ).order_by(models.Project.order_num.asc(), models.Project.created_at.desc()).all()

# PATCH /projects/reorder
@router.patch("/reorder")
def reorder_projects(
    body: ReorderRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    for i, project_id in enumerate(body.ids):
        db.query(models.Project).filter(
            models.Project.id == project_id,
            models.Project.user_id == current_user.id
        ).update({"order_num": i})
    db.commit()
    return {"ok": True}

# GET /projects/trash
@router.get("/trash", response_model=list[ProjectResponse])
def get_trash(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.Project).filter(
        models.Project.user_id == current_user.id,
        models.Project.deleted_at != None
    ).order_by(models.Project.deleted_at.desc()).all()

# POST /projects/
@router.post("/", response_model=ProjectResponse)
def create_project(
    project: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
        # 프로젝트 생성 제한 체크
    project_count = db.query(models.Project).filter(
        models.Project.user_id == current_user.id,
        models.Project.deleted_at == None
    ).count()
    
    if project_count >= current_user.project_limit:
        raise HTTPException(
            status_code=403,
            detail={"code": "PROJECT_LIMIT_EXCEEDED", "limit": current_user.project_limit}
        )
    
    db_project = models.Project(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        title=project.title,
        title_en=project.title_en,
        description=project.description,
        description_en=project.description_en,
        status=models.ProjectStatus(project.status),
        location=project.location,
        shot_date=project.shot_date,
        is_public=project.is_public
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

# GET /projects/{project_id}
@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.user_id == current_user.id,
        models.Project.deleted_at == None
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="PROJECT_NOT_FOUND")
    return project

# PUT /projects/{project_id}
@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: str,
    project: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.user_id == current_user.id,
        models.Project.deleted_at == None
    ).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="PROJECT_NOT_FOUND")
    for key, value in project.dict(exclude_unset=True).items():
        if key == "status":
            setattr(db_project, key, models.ProjectStatus(value))
        else:
            setattr(db_project, key, value)
    db.commit()
    db.refresh(db_project)
    return db_project

# DELETE /projects/{project_id}
@router.delete("/{project_id}")
def delete_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.user_id == current_user.id,
        models.Project.deleted_at == None
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="PROJECT_NOT_FOUND")
    project.deleted_at = datetime.utcnow()

    # 연결된 노트 소프트 삭제 (photo 연결 노트 + 프로젝트 노트 모두)
    db.query(models.Note).filter(
        models.Note.project_id == project_id,
        models.Note.deleted_at == None
    ).update({"deleted_at": datetime.utcnow()}, synchronize_session=False)

    db.commit()
    return {"message": "MOVED_TO_TRASH"}

# POST /projects/{project_id}/restore
@router.post("/{project_id}/restore", response_model=ProjectResponse)
def restore_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # 복구 전 제한 체크 추가
    project_count = db.query(models.Project).filter(
        models.Project.user_id == current_user.id,
        models.Project.deleted_at == None
    ).count()
    if project_count >= current_user.project_limit:
        raise HTTPException(
            status_code=403,
            detail={"code": "PROJECT_LIMIT_EXCEEDED", "limit": current_user.project_limit}
        )
    
    # [추가됨] 총 사진 업로드 한도(1000장) 체크
    # 현재 활성화된(휴지통에 없는) 프로젝트들의 사진 총합
    active_photo_count = db.query(models.Photo).join(models.Project).filter(
        models.Project.user_id == current_user.id,
        models.Project.deleted_at == None,
        models.Photo.deleted_at == None
    ).count()

    # 복구하려는 프로젝트 안에 들어있는 사진의 총합
    restoring_photo_count = db.query(models.Photo).filter(
        models.Photo.project_id == project_id,
        models.Photo.deleted_at == None
    ).count()

    # 두 개를 합쳤을 때 유저의 전체 한도를 넘는지 검사
    if active_photo_count + restoring_photo_count > current_user.photo_limit:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "PHOTO_LIMIT_EXCEEDED", 
                "limit": current_user.photo_limit
            }
        )

    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.user_id == current_user.id,
        models.Project.deleted_at != None
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="PROJECT_NOT_FOUND")
    project.deleted_at = None

    # 연결된 노트 복원
    db.query(models.Note).filter(
        models.Note.project_id == project_id,
        models.Note.deleted_at != None
    ).update({"deleted_at": None}, synchronize_session=False)

    db.commit()
    db.refresh(project)
    return project

def delete_photo_files_in_background(photo_urls: list[str]):
    cf_urls = [u for u in photo_urls if "imagedelivery.net" in u]
    local_urls = [u for u in photo_urls if "imagedelivery.net" not in u]
    
    # CF 이미지 병렬 삭제
    if cf_urls:
        delete_cf_files_parallel(cf_urls)
    
    # 로컬 파일 삭제
    for url in local_urls:
        try:
            file_path = url.split('/uploads/')[-1]
            full_path = f"app/uploads/{file_path}"
            if os.path.exists(full_path):
                os.remove(full_path)
        except Exception as e:
            print(f"로컬 파일 삭제 실패: {e}")

# DELETE /projects/{project_id}/permanent
@router.delete("/{project_id}/permanent")
def permanent_delete(
    project_id: str,
    background_tasks: BackgroundTasks, # 💡 3. 파라미터에 background_tasks 추가
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.user_id == current_user.id,
        models.Project.deleted_at != None
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="PROJECT_NOT_FOUND")
    
    # --- 외래키 충돌 방지를 위해 자식 데이터들을 명시적으로 먼저 삭제 ---
    # 1. 챕터-사진 매핑, 2. 챕터 본체, 3. 납품 링크 선택, 4. 납품 링크 본체 삭제 (기존 코드와 동일)
    chapters = db.query(models.Chapter).filter(models.Chapter.project_id == project_id).all()
    chapter_ids = [c.id for c in chapters]
    if chapter_ids:
        db.query(models.ChapterPhoto).filter(models.ChapterPhoto.chapter_id.in_(chapter_ids)).delete(synchronize_session=False)
        
    db.query(models.Chapter).filter(models.Chapter.project_id == project_id).delete(synchronize_session=False)

    links = db.query(models.DeliveryLink).filter(models.DeliveryLink.project_id == project_id).all()
    link_ids = [l.id for l in links]
    if link_ids:
        db.query(models.DeliverySelection).filter(models.DeliverySelection.link_id.in_(link_ids)).delete(synchronize_session=False)

    db.query(models.DeliveryLink).filter(models.DeliveryLink.project_id == project_id).delete(synchronize_session=False)

    # 💡 5. [수정됨] 사진 파일 삭제를 백그라운드 작업으로 넘김
    photos = db.query(models.Photo).filter(models.Photo.project_id == project_id).all()
    # 주의: DB 세션이 닫힌 뒤에 객체에 접근하면 에러가 나므로, URL만 뽑아서 리스트로 만듭니다.
    photo_urls = [photo.image_url for photo in photos if photo.image_url]
    
    if photo_urls:
        # 백그라운드 큐(Queue)에 파일 삭제 함수를 밀어넣습니다.
        background_tasks.add_task(delete_photo_files_in_background, photo_urls)

    # 6. 기타 자식 데이터들(Note, Pitch, Photo DB) 삭제 (기존과 동일)
    db.query(models.Note).filter(models.Note.project_id == project_id).delete(synchronize_session=False)
    db.query(models.Pitch).filter(models.Pitch.project_id == project_id).delete(synchronize_session=False)
    db.query(models.Photo).filter(models.Photo.project_id == project_id).delete(synchronize_session=False)

    # 7. 최종적으로 프로젝트 본체 삭제
    db.delete(project)
    db.commit()
    
    # 💡 파일은 아직 안 지워졌어도, DB는 지웠으니 바로 프론트엔드에 응답을 줍니다! (딜레이 0초)
    return {"message": "PERMANENTLY_DELETED"}