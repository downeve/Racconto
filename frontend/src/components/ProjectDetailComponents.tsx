import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import PhotoNotePanel from './PhotoNotePanel'

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

export interface ChapterResponse {
  id: string
  title: string
  parent_id: string | null
  order_num: number
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
}

export function Lightbox({
  photo, photos, colorLabels, chapterPhotoIds,
  onClose, onNavigate, onSetRating, onSetColorLabel,
  showExif, chapters, onAddToChapter, projectId, onNoteChange,
  photoChapterMap
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
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' && idx < photos.length - 1) onNavigate(photos[idx + 1])
      if (e.key === 'ArrowLeft' && idx > 0) onNavigate(photos[idx - 1])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [photo, photos])

  const getAssignedChapterInfo = () => {
    const assignedChapterId = photoChapterMap.get(photo.id)
    if (!assignedChapterId) return `📖 ${t('story.chapterIncl')}`

    const assignedChapter = chapters.find(c => c.id === assignedChapterId)
    if (!assignedChapter) return `📖 ${t('story.chapterIncl')}`

    if (assignedChapter.parent_id) {
      const parent = chapters.find(c => c.id === assignedChapter.parent_id)
      const parentIdx = chapters.filter(c => !c.parent_id).findIndex(c => c.id === parent?.id) + 1
      const childIdx = chapters.filter(c => c.parent_id === parent?.id).findIndex(c => c.id === assignedChapter.id) + 1
      return `📖 ${parentIdx}.${childIdx}. ${assignedChapter.title}`
    } else {
      const parentIdx = chapters.filter(c => !c.parent_id).findIndex(c => c.id === assignedChapter.id) + 1
      return `📖 ${parentIdx}. ${assignedChapter.title}`
    }
  }

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col" onClick={onClose}>

      {/* 상단 바 */}
      <div
        className="flex items-center justify-between px-6 py-3 shrink-0"
        style={{ paddingTop: window.racconto ? '2rem' : undefined }}
        onClick={e => e.stopPropagation()}
      >
        <span className="text-white/50 text-sm">{idx + 1} / {photos.length}</span>
        {photo.local_missing && (
          <span className="text-yellow-400 text-xs font-bold px-2 py-0.5 bg-yellow-400/20 rounded-full">
            ⚠️ {t('project.noLocalFile')}
          </span>
        )}
        <button onClick={onClose} className="text-white/70 hover:text-white text-2xl p-3">✕</button>
      </div>

      {/* 중앙 이미지 */}
      <div className="flex-1 flex items-center justify-center relative min-h-0">
        {idx > 0 && (
          <button
            className="absolute left-4 z-10 text-white/70 hover:text-white text-5xl select-none p-4"
            onClick={e => { e.stopPropagation(); onNavigate(photos[idx - 1]) }}
          >‹</button>
        )}
        <img
          src={photo.image_url}
          alt={photo.caption || ''}
          className="max-w-[calc(100%-8rem)] max-h-full object-contain cursor-default"
          onClick={e => e.stopPropagation()}
        />
        {idx < photos.length - 1 && (
          <button
            className="absolute right-4 z-10 text-white/70 hover:text-white text-5xl select-none p-4"
            onClick={e => { e.stopPropagation(); onNavigate(photos[idx + 1]) }}
          >›</button>
        )}
      </div>

      {/* 하단 정보 바 */}
      <div className="shrink-0 bg-black/80 border-t border-white/10 px-6 py-4" onClick={e => e.stopPropagation()}>
        <div className="max-w-[calc(100%-8rem)] mx-auto space-y-3">
          <div className="flex items-center gap-4 flex-wrap">

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
                    className={`text-xl transition-colors ${colorClass}`}
                  >★</button>
                )
              })}
            </div>

            <div className="w-px h-5 bg-white/20" />

            {/* 컬러 라벨 */}
            <div className="flex gap-1.5">
              {colorLabels.map(label => (
                <button
                  key={label.value}
                  onClick={() => onSetColorLabel(photo, label.value)}
                  title={label.label}
                  className={`w-5 h-5 rounded-full ${label.color} transition-all ${
                    photo.color_label === label.value
                      ? 'ring-2 ring-offset-2 ring-offset-black ring-white scale-110'
                      : 'opacity-40 hover:opacity-80'
                  }`}
                />
              ))}
            </div>

            <div className="w-px h-5 bg-white/20" />

            {/* 챕터 추가 / 정보 표시 */}
            <div className="relative flex items-center">
              {inChapter ? (
                <span className="flex items-center text-xs text-blue-400 px-2 py-1 border border-transparent font-medium">
                  {getAssignedChapterInfo()}
                </span>
              ) : (
                <button
                  onClick={() => setShowChapterMenu(v => !v)}
                  className="flex items-center text-xs px-2 py-1 border border-white/20 text-white/60 hover:text-white hover:border-white/50 rounded transition-colors"
                >
                  📖 {t('story.addToChapter')}
                </button>
              )}

                {showChapterMenu && !inChapter && (
                  <div
                    className="absolute bottom-8 left-0 bg-white rounded shadow-lg z-50 min-w-[180px] py-1"
                    onClick={e => e.stopPropagation()}
                  >
                  {chapters.length === 0 ? (
                    <p className="text-xs text-gray-400 px-3 py-2">{t('story.noChapters')}</p>
                  ) : (
                    chapters.filter(c => !c.parent_id).map((parent, parentIdx) => (
                      <div key={parent.id}>
                        <button
                          onClick={() => { onAddToChapter(photo.id, parent.id); setShowChapterMenu(false) }}
                          className="w-full text-left text-xs px-3 py-2 hover:bg-gray-100 text-gray-700 font-medium"
                        >
                          {t('story.chapter')} {parentIdx + 1}. {parent.title}
                        </button>
                        {chapters.filter(c => c.parent_id === parent.id).map((child, childIdx) => (
                          <button
                            key={child.id}
                            onClick={() => { onAddToChapter(photo.id, child.id); setShowChapterMenu(false) }}
                            className="w-full text-left text-xs px-3 py-2 hover:bg-gray-100 text-gray-500 pl-6"
                          >
                            ↳ {t('story.chapter')} {parentIdx + 1}.{childIdx + 1}. {child.title}
                          </button>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="w-px h-5 bg-white/20" />

            {/* 노트 버튼 */}
            <button
              onClick={() => setShowNotePanel(v => !v)}
              className={`text-xs px-2 py-1 border rounded transition-colors ${
                showNotePanel
                  ? 'border-white/50 text-white'
                  : 'border-white/20 text-white/60 hover:text-white hover:border-white/50'
              }`}
            >
              📝 {t('note.title')}
            </button>

            {/* EXIF */}
            {showExif && (photo.camera || photo.focal_length || photo.taken_at) && (
              <>
                <div className="w-px h-5 bg-white/20" />
                <span className="text-xs text-white/40">
                  {[
                    photo.taken_at
                      ? new Date(photo.taken_at).toLocaleDateString(i18n.language === 'ko' ? 'ko-KR' : 'en-US')
                      : null,
                    photo.camera, photo.lens, photo.focal_length,
                    photo.aperture, photo.shutter_speed, photo.iso,
                  ].filter(Boolean).join(' · ')}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

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

export function PhotoCard({
  photo, project, onSetCover, onDelete, onSetRating, onSetColorLabel,
  onOpenLightbox, showExif, gridCols, colorLabels, chapterPhotoIds,
  selectionMode, isSelected, onToggleSelect
}: PhotoCardProps) {
  const { t, i18n } = useTranslation()
  const isAlreadyInStory = chapterPhotoIds.has(photo.id)

  return (
    <div className={`rounded overflow-hidden bg-gray-100 transition-all ${isSelected ? 'ring-4 ring-blue-500 shadow-lg' : ''}`}>
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
          <div className="absolute top-2 left-2 z-10 bg-yellow-400 text-black text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            ⚠️ {t('project.noLocalFile')}
          </div>
        )}

        {/* 선택 모드 체크박스 */}
        {selectionMode && !isAlreadyInStory && (
          <div
            className="absolute top-3 left-3 z-20 cursor-pointer"
            onClick={e => { e.stopPropagation(); onToggleSelect(photo.id) }}
          >
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shadow-sm ${
              isSelected ? 'bg-blue-500 border-blue-500' : 'bg-black/40 border-white/80'
            }`}>
              {isSelected && <span className="text-white text-sm font-bold">✓</span>}
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
                className={`${gridCols >= 4 ? 'px-1 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'} rounded shadow-md transition-colors ${
                  project?.cover_image_url === photo.image_url
                    ? 'bg-yellow-400 text-black'
                    : 'bg-black/50 hover:bg-black/80 text-white'
                }`}
              >
                {project?.cover_image_url === photo.image_url ? t('photo.isCover') : t('photo.setCover')}
              </button>
              <button
                onClick={e => { e.stopPropagation(); onDelete(photo.id) }}
                className="w-6 h-6 flex items-center justify-center bg-red-500/70 hover:bg-red-600 text-white rounded shadow-md text-xs font-bold transition-colors"
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
                      className={`transition-all duration-150 drop-shadow-md ${gridCols >= 4 ? 'text-[10px]' : 'text-xs'} ${
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
                      className={`rounded-full ${label.color} transition-all duration-150 shadow-sm border border-white/10 ${
                        gridCols >= 4 ? 'w-2 h-2' : 'w-2.5 h-2.5'
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
      <div className={`bg-white transition-opacity ${selectionMode ? 'opacity-40 pointer-events-none' : ''}`}>
        {showExif && (photo.camera || photo.taken_at) && (
          <div className="px-2 pb-2">
            <div className="border-t border-gray-100 pt-1 mt-1 space-y-0.5">
              {photo.taken_at && (
                <p className="text-[10px] text-gray-400 font-mono">
                  {new Date(photo.taken_at).toLocaleDateString(i18n.language === 'ko' ? 'ko-KR' : 'en-US')}
                  {photo.camera && <span> · {photo.camera}</span>}
                </p>
              )}
              {!photo.taken_at && photo.camera && (
                <p className="text-[10px] text-gray-400 font-mono">{photo.camera}</p>
              )}
              {photo.lens && <p className="text-[10px] text-gray-400 font-mono">{photo.lens}</p>}
              {(photo.focal_length || photo.aperture || photo.shutter_speed || photo.iso) && (
                <p className="text-[10px] text-gray-400 font-mono">
                  {[photo.focal_length, photo.aperture, photo.shutter_speed, photo.iso].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}