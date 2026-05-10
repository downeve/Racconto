import { useEffect, useState, memo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import PhotoNotePanel from './PhotoNotePanel'
import { BookOpen, FileText, AlertTriangle, Check, Star, RotateCcw, RotateCw, MoreHorizontal } from 'lucide-react'
import { cfUrl } from '../utils/cfImage'
import { useChromeAutoHide } from '../hooks/useChromeAutoHide'

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
}

export interface ColorLabel {
  value: string
  color: string
  label: string
}

// ── PhotoCardMenu ──────────────────────────────────────────

interface PhotoCardMenuProps {
  photo: Photo
  isCover: boolean
  onSetCover: (photo: Photo) => void
  onDelete: (id: string) => void
}

function PhotoCardMenu({ photo, isCover, onSetCover, onDelete }: PhotoCardMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { t } = useTranslation()

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
        className="w-7 h-7 flex items-center justify-center rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-sm text-white"
      >
        <MoreHorizontal size={14} strokeWidth={2} />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 z-popover min-w-[160px] bg-edit-paper rounded-[2px] py-1 border border-edit-line shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
          <button
            onClick={e => { e.stopPropagation(); onSetCover(photo); setOpen(false) }}
            className="w-full px-3 py-1.5 text-left text-[12px] text-edit-ink hover:bg-edit-paper-2"
          >
            {isCover ? t('photo.isCover') : t('photo.setCover')}
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(photo.id); setOpen(false) }}
            className="w-full px-3 py-1.5 text-left text-[12px] text-edit-danger hover:bg-edit-paper-2"
          >
            {t('photo.moveToTrash')}
          </button>
        </div>
      )}
    </div>
  )
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
  onRotate: (photo: Photo, direction: 'left' | 'right') => Promise<void>
}

export function Lightbox({
  photo, photos, colorLabels, chapterPhotoIds,
  onClose, onNavigate, onSetRating, onSetColorLabel,
  showExif, chapters, onAddToChapter, projectId, onNoteChange,
  photoChapterMap, onRotate,
}: LightboxProps) {
  const idx = photos.findIndex(p => p.id === photo.id)
  const [showChapterMenu, setShowChapterMenu] = useState(false)
  const [showNotePanel, setShowNotePanel] = useState(false)
  const { t, i18n } = useTranslation()
  const chromeVisible = useChromeAutoHide()

  const inChapter = chapterPhotoIds.has(photo.id)

  const [hoverRating, setHoverRating] = useState<{ id: string; star: number } | null>(null)
  const [rotating, setRotating] = useState(false)

  // chip vocabulary
  const chipBase = "inline-flex items-center gap-1.5 t-caption px-3 py-1.5 rounded-[1px] border transition-colors duration-150"
  const chipIdle = "border-edit-paper/15 text-edit-paper/60 hover:text-edit-paper hover:border-edit-paper/40"
  const chipActive = "border-edit-paper/50 text-edit-paper bg-edit-paper/5"

  useEffect(() => {
    setShowNotePanel(false)
    setShowChapterMenu(false)
    setRotating(false)
  }, [photo.id])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'Escape') onClose()
      if ((e.key === 'ArrowRight' || e.code === 'KeyD') && idx < photos.length - 1) onNavigate(photos[idx + 1])
      if ((e.key === 'ArrowLeft' || e.code === 'KeyA') && idx > 0) onNavigate(photos[idx - 1])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [photo, photos, onClose, onNavigate, idx])

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
    <div className="fixed inset-0 bg-black/90 z-lightbox flex flex-col" onClick={onClose}>

      {/* 상단 바 */}
      <div
        className={`flex items-center justify-between px-6 pt-3 pb-0 shrink-0 relative transition-opacity duration-300 ${chromeVisible ? 'opacity-100' : 'opacity-0'}`}
        style={{ paddingTop: window.racconto ? '2rem' : undefined }}
        onClick={e => e.stopPropagation()}
      >
        {/* 왼쪽: 인덱스 + 경고 */}
        <div className="flex-1 flex items-center gap-3 justify-start min-w-0">
          <span className="text-edit-paper/60 text-small whitespace-nowrap">{idx + 1} / {photos.length}</span>
          {photo.local_missing && (
            <span className={`${chipBase} bg-edit-warning/10 border-edit-warning/30 text-edit-warning`}>
              <AlertTriangle size={10} strokeWidth={1.5} />{t('project.noLocalFile')}
            </span>
          )}
        </div>

        {/* 중앙: 컨트롤 */}
        <div className="flex items-center justify-center gap-4 flex-wrap shrink-0 px-3">

          {/* 별점 */}
          <div className="flex gap-1" onMouseLeave={() => setHoverRating(null)}>
            {[1, 2, 3, 4, 5].map(star => {
              const isHoveringThis = hoverRating?.id === photo.id
              const isHoveredStar = isHoveringThis && hoverRating!.star >= star
              const isRatedStar = !!(photo.rating && photo.rating >= star)
              return (
                <button
                  key={star}
                  onMouseEnter={() => setHoverRating({ id: photo.id, star })}
                  onClick={() => onSetRating(photo, star)}
                >
                  <Star size={14} strokeWidth={1.25}
                    className={`transition-colors ${
                      isHoveredStar ? 'fill-label-yellow text-label-yellow' :
                      isRatedStar   ? 'fill-edit-paper text-edit-paper' :
                                       'text-edit-paper/25'
                    }`}
                  />
                </button>
              )
            })}
          </div>

          <div className="w-px h-3 bg-edit-paper/15" />

          {/* 컬러 라벨 */}
          <div className="flex gap-1.5">
            {colorLabels.map(label => (
              <button
                key={label.value}
                onClick={() => onSetColorLabel(photo, label.value)}
                title={label.label}
                className={`w-4 h-4 rounded-full ${label.color} transition-all ${
                  photo.color_label === label.value
                    ? 'ring-2 ring-offset-2 ring-offset-black ring-white scale-110'
                    : 'opacity-40 hover:opacity-80'
                }`}
              />
            ))}
          </div>

          <div className="w-px h-3 bg-edit-paper/15" />

          {/* 챕터 */}
          <div className="flex items-center" onClick={e => e.stopPropagation()}>
            {inChapter ? (
              <span className={`${chipBase} ${chipActive}`}>
                <BookOpen size={13} strokeWidth={1.5} />{getAssignedChapterInfo()}
              </span>
            ) : (
              <button
                onClick={() => setShowChapterMenu(v => !v)}
                className={`${chipBase} ${chipIdle}`}
              >
                <BookOpen size={13} strokeWidth={1.5} />{t('story.addToChapter')}
              </button>
            )}
          </div>

          <div className="w-px h-3 bg-edit-paper/15" />

          {/* 노트 */}
          <button
            onClick={() => setShowNotePanel(v => !v)}
            className={`${chipBase} ${showNotePanel ? chipActive : chipIdle}`}
          >
            <FileText size={13} strokeWidth={1.5} />{t('note.title')}
          </button>

          <div className="w-px h-3 bg-edit-paper/15" />

          {/* 회전 */}
          <div className="flex items-center gap-1">
            <button
              onClick={async () => {
                if (rotating) return
                setRotating(true)
                try { await onRotate(photo, 'left') } finally { setRotating(false) }
              }}
              disabled={rotating}
              title={t('photo.rotateLeft')}
              className={`${chipBase} ${rotating ? 'border-edit-paper/10 text-edit-paper/20 cursor-not-allowed' : chipIdle}`}
            >
              <RotateCcw size={13} strokeWidth={1.5} />
            </button>
            <button
              onClick={async () => {
                if (rotating) return
                setRotating(true)
                try { await onRotate(photo, 'right') } finally { setRotating(false) }
              }}
              disabled={rotating}
              title={t('photo.rotateRight')}
              className={`${chipBase} ${rotating ? 'border-edit-paper/10 text-edit-paper/20 cursor-not-allowed' : chipIdle}`}
            >
              <RotateCw size={13} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* 오른쪽: 닫기 */}
        <div className="flex-1 flex justify-end">
          <button onClick={onClose} className="text-edit-paper/60 hover:text-edit-paper text-h2 p-3">✕</button>
        </div>
      </div>

      {/* 중앙 이미지 */}
      <div className="flex-1 flex items-center justify-center mt-0 relative min-h-0">
        {idx > 0 && (
          <button
            className="absolute left-4 z-10 text-edit-paper/60 hover:text-edit-paper text-h1 select-none p-4"
            onClick={e => { e.stopPropagation(); onNavigate(photos[idx - 1]) }}
          >‹</button>
        )}
        <img
          src={cfUrl(photo.image_url, 'public')}
          alt={photo.caption || ''}
          className="max-w-[calc(100%-8rem)] max-h-full object-contain cursor-default"
          onClick={e => e.stopPropagation()}
        />
        {idx < photos.length - 1 && (
          <button
            className="absolute right-4 z-10 text-edit-paper/60 hover:text-edit-paper text-h1 select-none p-4"
            onClick={e => { e.stopPropagation(); onNavigate(photos[idx + 1]) }}
          >›</button>
        )}
      </div>

      {/* 하단 EXIF */}
      <div
        className={`shrink-0 bg-black/30 border-t border-edit-paper/10 px-6 py-4 transition-opacity duration-300 ${chromeVisible ? 'opacity-100' : 'opacity-0'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="max-w-[calc(100%-8rem)] mx-auto">
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {showExif && (photo.camera || photo.focal_length || photo.taken_at) && (
              <span className="text-small text-edit-paper/40">
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
          className="fixed inset-0 z-popover"
          onClick={e => { e.stopPropagation(); setShowChapterMenu(false) }}
        >
          <div
            className="absolute bg-edit-paper rounded-[2px] py-1 w-max shadow-[0_8px_32px_rgba(0,0,0,0.12)] z-popover"
            style={{ top: '4rem', left: '50%', transform: 'translateX(-50%)' }}
            onClick={e => e.stopPropagation()}
          >
            {chapters.length === 0 ? (
              <p className="text-small text-edit-muted px-3 py-2 whitespace-nowrap">{t('story.noChapters')}</p>
            ) : (
              chapters.filter(c => !c.parent_id).map((parent) => (
                <div key={parent.id}>
                  <button
                    onClick={() => { onAddToChapter(photo.id, parent.id); setShowChapterMenu(false) }}
                    className="w-full text-left px-3 py-2 text-small rounded-[1px] hover:bg-edit-paper-2 text-edit-ink flex items-center gap-3 whitespace-nowrap"
                  >
                    <span className="t-eyebrow text-edit-faint">Chapter</span>
                    <span className="truncate">{parent.title}</span>
                  </button>
                  {chapters.filter(c => c.parent_id === parent.id).map((child) => (
                    <button
                      key={child.id}
                      onClick={() => { onAddToChapter(photo.id, child.id); setShowChapterMenu(false) }}
                      className="w-full text-left px-3 py-2 text-small rounded-[1px] hover:bg-edit-paper-2 text-edit-muted pl-9 whitespace-nowrap"
                    >
                      {child.title}
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
  onOpenLightbox, showExif, colorLabels, chapterPhotoIds,
  selectionMode, isSelected, onToggleSelect
}: PhotoCardProps) {
  const { t, i18n } = useTranslation()
  const isAlreadyInStory = chapterPhotoIds.has(photo.id)

  return (
    <div className={`rounded-[2px] overflow-hidden bg-edit-paper-2 transition-[box-shadow] ${
      isSelected ? 'ring-2 ring-edit-ink ring-offset-2 ring-offset-edit-paper' : ''
    }`}>
      <div className="relative group">

        {/* 이미지 */}
        <img
          src={cfUrl(photo.image_url, 'grid')}
          alt={photo.caption || 'photo'}
          className={`w-full aspect-[3/2] object-cover transition-[opacity,transform] duration-500 ${
            selectionMode && isAlreadyInStory
              ? 'opacity-30 grayscale cursor-not-allowed'
              : isSelected
              ? 'opacity-70 scale-[0.98] cursor-pointer'
              : 'group-hover:scale-[1.01] cursor-pointer'
          }`}
          onClick={() => {
            if (selectionMode) {
              if (isAlreadyInStory) return
              onToggleSelect(photo.id)
            } else {
              onOpenLightbox(photo)
            }
          }}
        />

        {/* 미싱 칩 */}
        {photo.local_missing && (
          <div className="absolute top-2 left-2 t-eyebrow inline-flex items-center gap-1 px-2 py-0.5 rounded-[1px] bg-black/45 text-edit-warning backdrop-blur-sm">
            <AlertTriangle size={10} strokeWidth={1.5} />{t('project.noLocalFile')}
          </div>
        )}

        {/* ⋯ 메뉴 (호버 시만 등장) */}
        {!selectionMode && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity z-photo-controls">
            <PhotoCardMenu
              photo={photo}
              isCover={project?.cover_image_url === photo.image_url}
              onSetCover={onSetCover}
              onDelete={onDelete}
            />
          </div>
        )}

        {/* 선택 모드 체크 */}
        {selectionMode && !isAlreadyInStory && (
          <div
            className="absolute top-3 left-3 z-photo-controls cursor-pointer"
            onClick={e => { e.stopPropagation(); onToggleSelect(photo.id) }}
          >
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
              isSelected ? 'bg-edit-ink text-edit-paper' : 'bg-black/35 ring-1 ring-edit-paper/70'
            }`}>
              {isSelected && <Check size={11} strokeWidth={2} />}
            </div>
          </div>
        )}
      </div>

      {/* 하단 메타 — 항상 표시 */}
      <div className={`bg-edit-paper px-3 py-2 border-t border-edit-line transition-opacity ${
        selectionMode ? 'opacity-40 pointer-events-none' : ''
      }`}>
        <div className="flex items-center justify-between gap-2">
          {/* 별점 */}
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(star => {
              const isActive = !!(photo.rating && photo.rating >= star)
              return (
                <button
                  key={star}
                  onClick={e => { e.stopPropagation(); onSetRating(photo, star) }}
                  className="p-0.5"
                >
                  <Star size={10} strokeWidth={1.25}
                    className={`transition-colors ${
                      isActive
                        ? 'fill-label-yellow text-label-yellow'
                        : 'text-edit-line-strong hover:text-label-yellow'
                    }`}
                  />
                </button>
              )
            })}
          </div>
          {/* 컬러 dot */}
          <div className="flex gap-1.5 items-center">
            {colorLabels.map(label => {
              const isActive = photo.color_label === label.value
              return (
                <button
                  key={label.value}
                  onClick={e => { e.stopPropagation(); onSetColorLabel(photo, label.value) }}
                  title={label.label}
                  className={`w-2.5 h-2.5 rounded-full ${label.color} transition-all ${
                    isActive
                      ? 'ring-2 ring-offset-1 ring-offset-edit-paper ring-edit-ink scale-125'
                      : 'opacity-50 hover:opacity-100 hover:scale-110'
                  }`}
                />
              )
            })}
          </div>
        </div>
        {/* EXIF */}
        {showExif && (photo.camera || photo.taken_at) && (
          <p className="t-caption text-edit-faint font-mono mt-1.5 truncate">
            {[
              photo.taken_at
                ? new Date(photo.taken_at).toLocaleDateString(i18n.language === 'ko' ? 'ko-KR' : 'en-US')
                : null,
              photo.camera,
              photo.lens,
              [photo.focal_length, photo.aperture, photo.shutter_speed, photo.iso].filter(Boolean).join(' '),
            ].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
    </div>
  )
})
