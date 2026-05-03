import { useEffect, useState, useRef, memo } from 'react'
import { useTranslation } from 'react-i18next'
import Cropper from 'react-easy-crop'
import PhotoNotePanel from './PhotoNotePanel'
import { BookOpen, FileText, AlertTriangle, Check } from 'lucide-react'
import { getEditStyle, type EditParams } from '../utils/editStyle'
import { RotatedCanvas } from './RotatedCanvas'

// ── 공통 타입 ──────────────────────────────────────────────

export interface Project {
  id: string
  title: string
  title_en: string
  description: string
  description_en: string
  status: string
  location: string
  is_public: string
  cover_image_url: string
}

export interface ChapterPhotoResponse {
  photo_id: string
  chapter_id: string
}

export interface NoteResponse {
  id: string
  photo_id: string | null
}

export interface Photo {
  id: string
  image_url: string
  caption: string
  caption_en: string
  folder: string | null
  original_filename?: string | null
  order: number
  taken_at: string | null
  camera: string | null
  lens: string | null
  iso: string | null
  shutter_speed: string | null
  aperture: string | null
  focal_length: string | null
  gps_lat: string | null
  gps_lng: string | null
  rating: number | null
  color_label: string | null
  source?: string | null
  local_missing?: boolean
  deleted_at?: string | null
  edit_params?: EditParams | null
}

export interface ColorLabel {
  value: string
  color: string
  label: string
}

// ── Lightbox ───────────────────────────────────────────────

interface LightboxProps {
  photo: Photo
  photos: Photo[]
  colorLabels: ColorLabel[]
  chapterPhotoIds: Set<string>
  onClose: () => void
  onNavigate: (p: Photo) => void
  onSetRating: (p: Photo, r: number) => void
  onSetColorLabel: (p: Photo, l: string) => void
  showExif: boolean
  chapters: { id: string; title: string; parent_id?: string | null; order_num?: number }[]
  photoChapterMap: Map<string, string>
  onAddToChapter: (photoId: string, chapterId: string) => void
  projectId: string
  onNoteChange: () => void
  // 비파괴 편집 props
  editMode: 'crop' | 'brightness' | null
  pendingCrop: { x: number; y: number }
  pendingBrightness: number
  editSaving: boolean
  onRotateLeft: () => void
  onRotateRight: () => void
  onEnterEditMode: (mode: 'crop' | 'brightness') => void
  onCropChange: (crop: { x: number; y: number }) => void
  onCropComplete: (croppedArea: { x: number; y: number; width: number; height: number }, croppedAreaPixels: any) => void
  onBrightnessChange: (value: number) => void
  onSaveEdit: () => void
  onResetEdit: () => void
  onCancelEdit: () => void
}

export function Lightbox({
  photo, photos, colorLabels, chapterPhotoIds,
  onClose, onNavigate, onSetRating, onSetColorLabel,
  showExif, chapters, onAddToChapter, projectId, onNoteChange,
  photoChapterMap,
  editMode, pendingCrop, pendingBrightness, editSaving,
  onRotateLeft, onRotateRight, onEnterEditMode,
  onCropChange, onCropComplete, onBrightnessChange,
  onSaveEdit, onResetEdit, onCancelEdit,
}: LightboxProps) {
  const idx = photos.findIndex(p => p.id === photo.id)
  const [showChapterMenu, setShowChapterMenu] = useState(false)

  const [showNotePanel, setShowNotePanel] = useState(false)
  const { t, i18n } = useTranslation()
  const inChapter = chapterPhotoIds.has(photo.id)

  const [hoverRating, setHoverRating] = useState<{ id: string; star: number } | null>(null)

  useEffect(() => {
    setShowNotePanel(false)
    setShowChapterMenu(false)
  }, [photo.id])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'Escape') { if (editMode) { onCancelEdit(); return } onClose() }
      if (editMode) return
      if ((e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') && idx < photos.length - 1) onNavigate(photos[idx + 1])
      if ((e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') && idx > 0) onNavigate(photos[idx - 1])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [photo, photos, onClose, onNavigate, idx, editMode, onCancelEdit])

  useEffect(() => {
    const preload = (url: string) => {
      const img = new Image()
      img.src = url
    }
    if (idx > 0) preload(photos[idx - 1].image_url)
    if (idx < photos.length - 1) preload(photos[idx + 1].image_url)
  }, [idx, photos])

  const getAssignedChapterInfo = () => {
    const assignedChapterId = photoChapterMap.get(photo.id)
    if (!assignedChapterId) return t('story.chapterIncl')

    const assignedChapter = chapters.find(c => c.id === assignedChapterId)
    if (!assignedChapter) return t('story.chapterIncl')

    if (assignedChapter.parent_id) {
      const parent = chapters.find(c => c.id === assignedChapter.parent_id)
      const parentIdx = chapters.filter(c => !c.parent_id).findIndex(c => c.id === parent?.id) + 1
      const childIdx = chapters.filter(c => c.parent_id === parent?.id).findIndex(c => c.id === assignedChapter.id) + 1
      return `${parentIdx}.${childIdx}. ${assignedChapter.title}`
    } else {
      const parentIdx = chapters.filter(c => !c.parent_id).findIndex(c => c.id === assignedChapter.id) + 1
      return `${parentIdx}. ${assignedChapter.title}`
    }
  }

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col" onClick={onClose}>

      {/* 상단 바 (왼쪽/중앙/오른쪽 3분할 구조) */}
      <div
        className="flex items-center justify-between px-6 pt-3 pb-0 shrink-0 relative"
        style={{ paddingTop: window.racconto ? '2rem' : undefined }}
        onClick={e => e.stopPropagation()}
      >
        {/* 1. 왼쪽: 인덱스 및 경고 (flex-1로 남는 공간 차지) */}
        <div className="flex-1 flex items-center gap-3 justify-start min-w-0">
          <span className="text-card text-small whitespace-nowrap">{idx + 1} / {photos.length}</span>
          {photo.local_missing && (
            <span className="flex items-center gap-1 text-yellow-400 text-eyebrow font-bold px-2 py-0.5 bg-yellow-400/20 rounded-full whitespace-nowrap">
              <AlertTriangle size={12} strokeWidth={1.5} />{t('project.noLocalFile')}
            </span>
          )}
        </div>

        {/* 2. 중앙: 컨트롤 버튼들 (shrink-0으로 자기 크기 유지) */}
        <div className="flex items-center justify-center gap-4 flex-wrap shrink-0 px-3">
          
          {/* 별점 */}
          <div className="flex gap-1" onMouseLeave={() => setHoverRating(null)}>
            {[1, 2, 3, 4, 5].map(star => {
              const isHoveringThis = hoverRating?.id === photo.id
              const isHoveredStar = isHoveringThis && hoverRating!.star >= star
              const isRatedStar = photo.rating && photo.rating >= star
              let colorClass = 'text-white/20'
              if (isHoveredStar) colorClass = 'text-yellow-300'
              else if (!isHoveringThis && isRatedStar) colorClass = 'text-yellow-400'
              return (
                <button
                  key={star}
                  onMouseEnter={() => setHoverRating({ id: photo.id, star })}
                  onClick={() => onSetRating(photo, star)}
                  className={`text-body rounded-card transition-[background,color,border] duration-150 ease-out ${colorClass}`}
                >★</button>
              )
            })}
          </div>

          <div className="w-px h-3 bg-card/30" />

          {/* 컬러 라벨 */}
          <div className="flex gap-1.5">
            {colorLabels.map(label => (
              <button
                key={label.value}
                onClick={() => onSetColorLabel(photo, label.value)}
                title={label.label}
                className={`w-4 h-4 text-body rounded-full ${label.color} transition-all ${
                  photo.color_label === label.value
                    ? 'ring-2 ring-offset-2 ring-offset-black ring-white scale-110'
                    : 'opacity-40 hover:opacity-80'
                }`}
              />
            ))}
          </div>

          <div className="w-px h-3 bg-card/30" />

          {/* 챕터 추가 / 정보 표시 */}
          <div className="flex items-center" onClick={e => e.stopPropagation()}>
            {inChapter ? (
              <span className="flex items-center gap-1.5 text-small text-blue-400 px-3 py-1.5 border border-transparent font-medium">
                <BookOpen size={13} strokeWidth={1.5} />{getAssignedChapterInfo()}
              </span>
            ) : (
              <button
                onClick={() => setShowChapterMenu(v => !v)}
                className="flex items-center gap-1.5 text-small px-3 py-1.5 border border-card/20 text-faint hover:text-white hover:border-white/50 rounded transition-[background,color,border] duration-150 ease-out"
              >
                <BookOpen size={13} strokeWidth={1.5} />{t('story.addToChapter')}
              </button>
            )}
          </div>

          <div className="w-px h-3 bg-card/30" />

          {/* 노트 버튼 */}
          <button
            onClick={() => setShowNotePanel(v => !v)}
            className={`flex items-center gap-1.5 text-small px-3 py-1.5 border rounded-card transition-[background,color,border] duration-150 ease-out ${
              showNotePanel
                ? 'border-card/50 text-card'
                : 'border-card/20 text-card/60 hover:text-card hover:border-card/50'
            }`}
          >
            <FileText size={13} strokeWidth={1.5} />{t('note.title')}
          </button>

          <div className="w-px h-3 bg-card/30" />

          {/* 회전 / 편집 버튼 */}
          {!editMode && (
            <div className="flex items-center gap-1">
              <button
                onClick={onRotateLeft}
                title={t('photo.rotateLeft')}
                className="flex items-center gap-1 text-small px-2.5 py-1.5 border rounded-card border-card/20 text-card/60 hover:text-card hover:border-card/50 transition-[background,color,border] duration-150 ease-out"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                  <path d="M3 3v5h5"/>
                </svg>
              </button>
              <button
                onClick={onRotateRight}
                title={t('photo.rotateRight')}
                className="flex items-center gap-1 text-small px-2.5 py-1.5 border rounded-card border-card/20 text-card/60 hover:text-card hover:border-card/50 transition-[background,color,border] duration-150 ease-out"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                  <path d="M21 3v5h-5"/>
                </svg>
              </button>

              <div className="w-px h-3 bg-card/30 mx-0.5" />

              <button
                onClick={() => onEnterEditMode('crop')}
                className="flex items-center gap-1 text-small px-2.5 py-1.5 border rounded-card border-card/20 text-card/60 hover:text-card hover:border-card/50 transition-[background,color,border] duration-150 ease-out"
              >
                {t('photo.crop')}
              </button>
              <button
                onClick={() => onEnterEditMode('brightness')}
                className="flex items-center gap-1 text-small px-2.5 py-1.5 border rounded-card border-card/20 text-card/60 hover:text-card hover:border-card/50 transition-[background,color,border] duration-150 ease-out"
              >
                {t('photo.brightness')}
              </button>

              {photo.edit_params && (
                <>
                  <div className="w-px h-3 bg-card/30 mx-0.5" />
                  <button
                    onClick={onResetEdit}
                    className="text-small px-2.5 py-1.5 text-red-400 hover:text-red-300 transition-colors"
                  >
                    {t('photo.resetToOriginal')}
                  </button>
                </>
              )}
            </div>
          )}

          {/* 편집 모드 저장/취소 */}
          {editMode && (
            <div className="flex items-center gap-2">
              <span className="text-small text-card/50">
                {editMode === 'crop' ? t('photo.crop') : t('photo.brightness')}
              </span>
              <button
                onClick={onSaveEdit}
                disabled={editSaving}
                className="text-small px-3 py-1.5 bg-white text-black rounded-card font-medium hover:opacity-80 disabled:opacity-40 transition-opacity"
              >
                {editSaving ? t('photo.savingEdit') : t('photo.saveEdit')}
              </button>
              <button
                onClick={onCancelEdit}
                className="text-small px-3 py-1.5 border border-card/20 text-card/60 hover:text-card rounded-card transition-colors"
              >
                {t('photo.cancelEdit')}
              </button>
            </div>
          )}
        </div>

        {/* 3. 오른쪽: 닫기 버튼 (flex-1로 남는 공간 차지하며 우측 정렬) */}
        <div className="flex-1 flex justify-end">
          <button onClick={onClose} className="text-card/70 hover:text-card text-h2 p-3 rounded-full">✕</button>
        </div>
      </div>

      {/* 중앙 이미지 / 크롭 영역 */}
      <div className={`flex-1 flex items-center justify-center mt-0 relative min-h-0${photo.edit_params?.crop && editMode !== 'crop' ? ' overflow-hidden' : ''}`}>
        {!editMode && idx > 0 && (
          <button
            className="absolute left-4 z-10 text-card/70 hover:text-card text-h1 select-none p-4"
            onClick={e => { e.stopPropagation(); onNavigate(photos[idx - 1]) }}
          >‹</button>
        )}

        {/* 크롭 모드 */}
        {editMode === 'crop' && (
          <div className="absolute inset-0" onClick={e => e.stopPropagation()}>
            <Cropper
              image={photo.image_url}
              crop={pendingCrop}
              zoom={1}
              aspect={undefined}
              onCropChange={onCropChange}
              onCropComplete={onCropComplete}
              style={{ containerStyle: { background: '#000' } }}
            />
          </div>
        )}

        {/* 일반 이미지 */}
        {editMode !== 'crop' && (() => {
          const rotation = photo.edit_params?.rotation ?? 0
          const brightnessVal = editMode === 'brightness' ? pendingBrightness : (photo.edit_params?.brightness ?? null)
          if (rotation === 90 || rotation === 270) {
            return (
              <RotatedCanvas
                src={photo.image_url}
                rotation={rotation}
                brightness={brightnessVal}
                style={{ maxWidth: 'calc(100% - 8rem)', maxHeight: '100%' }}
                onClick={e => e.stopPropagation()}
              />
            )
          }
          return (
            <img
              src={photo.image_url}
              alt={photo.caption || ''}
              className="object-contain cursor-default"
              style={{
                maxWidth: 'calc(100% - 8rem)',
                maxHeight: '100%',
                ...getEditStyle(
                  photo.edit_params,
                  undefined,
                  undefined,
                  editMode === 'brightness' ? pendingBrightness : undefined,
                ),
              }}
              onClick={e => e.stopPropagation()}
            />
          )
        })()}

        {!editMode && idx < photos.length - 1 && (
          <button
            className="absolute right-4 z-10 text-card/70 hover:text-card text-h1 select-none p-4"
            onClick={e => { e.stopPropagation(); onNavigate(photos[idx + 1]) }}
          >›</button>
        )}
      </div>

      {/* 하단 정보 바 */}
      <div className="shrink-0 bg-black/30 border-t border-white/10 px-6 py-4" onClick={e => e.stopPropagation()}>
        <div className="max-w-[calc(100%-8rem)] mx-auto space-y-3">
          {/* 밝기 슬라이더 */}
          {editMode === 'brightness' && (
            <div className="flex items-center gap-3 w-full max-w-sm mx-auto">
              <span className="text-xs text-card/50 whitespace-nowrap">{t('photo.darker')}</span>
              <input
                type="range"
                min={0.5}
                max={2.0}
                step={0.05}
                value={pendingBrightness}
                onChange={e => onBrightnessChange(parseFloat(e.target.value))}
                className="flex-1"
              />
              <span className="text-xs text-card/50 whitespace-nowrap">{t('photo.brighter')}</span>
              <span className="text-xs font-mono min-w-[36px] text-right text-card/70">
                {pendingBrightness.toFixed(2)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {/* EXIF */}
            {!editMode && showExif && (photo.camera || photo.focal_length || photo.taken_at) && (
              <span className="text-small text-card/40">
                {[
                  photo.taken_at
                    ? new Date(photo.taken_at).toLocaleDateString(i18n.language === 'ko' ? 'ko-KR' : 'en-US')
                    : null,
                  photo.camera, photo.lens, photo.focal_length,
                  photo.aperture, photo.shutter_speed, photo.iso,
                ].filter(Boolean).join(' · ')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 챕터 메뉴 */}
      {showChapterMenu && !inChapter && (
        <div
          className="fixed inset-0 z-40"
          onClick={e => { e.stopPropagation(); setShowChapterMenu(false) }}
        >
          <div
            // min-w-[180px]를 제거하고 w-max를 추가했습니다.
            className="absolute bg-white rounded shadow z-50 py-1 w-max"
            style={{ top: '4rem', left: '50%', transform: 'translateX(-50%)' }}
            onClick={e => e.stopPropagation()}
          >
            {chapters.length === 0 ? (
              // whitespace-nowrap 추가
              <p className="text-small text-faint px-3 py-2 whitespace-nowrap">{t('story.noChapters')}</p>
            ) : (
              chapters.filter(c => !c.parent_id).map((parent, parentIdx) => (
                <div key={parent.id}>
                  <button
                    onClick={() => { onAddToChapter(photo.id, parent.id); setShowChapterMenu(false) }}
                    // whitespace-nowrap 추가
                    className="w-full text-left text-small px-3 py-2 hover:bg-hair text-ink-2 font-base whitespace-nowrap"
                  >
                    {t('story.chapter')} {parentIdx + 1}. {parent.title}
                  </button>
                  {chapters.filter(c => c.parent_id === parent.id).map((child, childIdx) => (
                    <button
                      key={child.id}
                      onClick={() => { onAddToChapter(photo.id, child.id); setShowChapterMenu(false) }}
                      // whitespace-nowrap 추가
                      className="w-full text-left text-small px-3 py-2 hover:bg-hair/60 text-muted pl-6 whitespace-nowrap"
                    >
                      ↳ {t('story.chapter')} {parentIdx + 1}.{childIdx + 1}. {child.title}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 노트 패널 */}
      {showNotePanel && (
        <div onClick={e => e.stopPropagation()}>
          <PhotoNotePanel
            photoId={photo.id}
            projectId={projectId}
            onClose={() => setShowNotePanel(false)}
            onNoteChange={onNoteChange}
          />
        </div>
      )}
    </div>
  )
}

// ── PhotoCard ──────────────────────────────────────────────

interface PhotoCardProps {
  photo: Photo
  project: Project | null
  onSetCover: (photo: Photo) => void
  onDelete: (id: string) => void
  onSetRating: (photo: Photo, rating: number) => void
  onSetColorLabel: (photo: Photo, label: string) => void
  onOpenLightbox: (photo: Photo) => void
  showExif: boolean
  gridCols: number
  colorLabels: ColorLabel[]
  chapterPhotoIds: Set<string>
  selectionMode: boolean
  isSelected: boolean
  onToggleSelect: (id: string) => void
}

export const PhotoCard = memo(function PhotoCard({
  photo, project, onSetCover, onDelete, onSetRating, onSetColorLabel,
  onOpenLightbox, showExif, gridCols, colorLabels, chapterPhotoIds,
  selectionMode, isSelected, onToggleSelect
}: PhotoCardProps) {
  const { t, i18n } = useTranslation()
  const isAlreadyInStory = chapterPhotoIds.has(photo.id)

  return (
    <div className={`rounded-photo overflow-hidden bg-gray-100 transition-all ${isSelected ? 'ring-4 ring-blue-500 shadow' : ''}`}>
      <div className="relative group">

        {/* 이미지 */}
        <img
          src={photo.image_url}
          alt={photo.caption || 'photo'}
          className={`w-full aspect-[3/2] object-contain transition-all ${
            selectionMode && isAlreadyInStory
              ? 'opacity-30 grayscale cursor-not-allowed'
              : isSelected
              ? 'opacity-70 scale-[0.98] cursor-pointer'
              : 'hover:opacity-95 cursor-pointer'
          }`}
          style={photo.edit_params ? getEditStyle(photo.edit_params) : undefined}
          onClick={() => {
            if (selectionMode) {
              if (isAlreadyInStory) return
              onToggleSelect(photo.id)
            } else {
              onOpenLightbox(photo)
            }
          }}
        />

        {/* 미싱 파일 경고 */}
        {photo.local_missing && (
          <div className="absolute top-2 left-2 z-10 bg-yellow-400 text-ink-2 text-eyebrow font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
            <AlertTriangle size={11} strokeWidth={1.5} />{t('project.noLocalFile')}
          </div>
        )}

        {/* 선택 모드 체크박스 */}
        {selectionMode && !isAlreadyInStory && (
          <div
            className="absolute top-3 left-3 z-20 cursor-pointer"
            onClick={e => { e.stopPropagation(); onToggleSelect(photo.id) }}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-[background,color,border] duration-150 ease-out shadow ${
              isSelected ? 'bg-blue-500/50 border-blue-500/30' : 'bg-ink-2/40 border-card/80'
            }`}>
              {isSelected && <Check size={12} strokeWidth={1.5} className="text-card" />}
            </div>
          </div>
        )}

        {/* 호버 컨트롤 레이어 */}
        {!selectionMode && (
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
            <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/50 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute inset-0 pointer-events-auto" onClick={() => onOpenLightbox(photo)} />

            {/* 커버 / 삭제 버튼 */}
            <div className="absolute top-2 right-2 flex gap-1 pointer-events-auto">
              <button
                onClick={e => { e.stopPropagation(); onSetCover(photo) }}
                className={`${gridCols >= 4 ? 'px-1.5 py-1 text-eyebrow' : 'px-2 py-1 text-eyebrow'} rounded-card shadow transition-[background,color,border] duration-150 ease-out font-base ${
                  project?.cover_image_url === photo.image_url
                    ? 'bg-yellow-400 text-ink-2'
                    : 'bg-ink/30 hover:bg-ink-2/90 text-card'
                }`}
              >
                {project?.cover_image_url === photo.image_url ? t('photo.isCover') : t('photo.setCover')}
              </button>
              <button
                onClick={e => { e.stopPropagation(); onDelete(photo.id) }}
                className="w-5 h-5 flex items-center justify-center bg-red-500/30 hover:bg-red-600 text-card rounded-full shadow text-xs font-bold transition-[background,color,border] duration-150 ease-out"
              >✕</button>
            </div>

            {/* 별점 / 컬러 라벨 */}
            <div className="absolute bottom-2 left-2 flex flex-col gap-1.5 pointer-events-auto">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(star => {
                  const isActive = photo.rating && photo.rating >= star
                  return (
                    <button
                      key={star}
                      onClick={e => { e.stopPropagation(); onSetRating(photo, star) }}
                      className={`transition-all duration-150 drop-shadow ${gridCols >= 4 ? 'text-small' : 'text-small'} ${
                        isActive
                          ? 'text-yellow-400 scale-110'
                          : 'text-white/40 hover:text-yellow-200 hover:scale-125'
                      }`}
                    >★</button>
                  )
                })}
              </div>
              <div className="flex gap-1.5 items-center">
                {colorLabels.map(label => {
                  const isActive = photo.color_label === label.value
                  return (
                    <button
                      key={label.value}
                      onClick={e => { e.stopPropagation(); onSetColorLabel(photo, label.value) }}
                      title={label.label}
                      className={`rounded-full ${label.color} transition-all duration-150 shadow border border-card/10 ${
                        gridCols >= 4 ? 'w-2.5 h-2.5' : 'w-2.5 h-2.5'
                      } ${
                        isActive
                          ? 'ring-2 ring-offset-1 ring-offset-black/40 ring-white scale-125'
                          : 'opacity-40 hover:opacity-100 hover:scale-125'
                      }`}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* EXIF 영역 */}
      <div className={`bg-card rounded-card transition-opacity ${selectionMode ? 'opacity-40 pointer-events-none' : ''}`}>
        {showExif && (photo.camera || photo.taken_at) && (
          <div className="px-2 pb-2">
            <div className="border-t border-gray-100 pt-1 mt-1 space-y-1">
              {photo.taken_at && (
                <p className="text-eyebrow text-faint font-mono">
                  {new Date(photo.taken_at).toLocaleDateString(i18n.language === 'ko' ? 'ko-KR' : 'en-US')}
                  {photo.camera && <span> · {photo.camera}</span>}
                </p>
              )}
              {!photo.taken_at && photo.camera && (
                <p className="text-eyebrow text-faint font-mono">{photo.camera}</p>
              )}
              {photo.lens && <p className="text-eyebrow text-faint font-mono">{photo.lens}</p>}
              {(photo.focal_length || photo.aperture || photo.shutter_speed || photo.iso) && (
                <p className="text-eyebrow text-faint font-mono">
                  {[photo.focal_length, photo.aperture, photo.shutter_speed, photo.iso].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
})