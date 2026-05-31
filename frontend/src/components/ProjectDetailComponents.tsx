import { useEffect, useState, memo } from 'react'
import { useTranslation } from 'react-i18next'
import PhotoNotePanel from './PhotoNotePanel'
import { BookOpen, FileText, AlertTriangle, Check, Star, RotateCcw, RotateCw } from 'lucide-react'
import { cfUrl, cfLightboxUrl } from '../utils/cfImage'
import { useChromeAutoHide } from '../hooks/useChromeAutoHide'

// ── EXIF 표기 헬퍼 ─────────────────────────────────────────
// 카메라: EXIF 의 "Make Model" 형식에서 제조사 prefix 제거 → 기종(Model) 만 남김
const CAMERA_BRAND_PREFIXES = [
  'OLYMPUS IMAGING CORP.', 'OLYMPUS CORPORATION', 'NIKON CORPORATION',
  'PENTAX CORPORATION', 'EASTMAN KODAK COMPANY', 'PANASONIC CORPORATION',
  'LEICA CAMERA AG', 'CASIO COMPUTER CO.,LTD.', 'HASSELBLAD H6D', 'HASSELBLAD',
  'OLYMPUS', 'NIKON', 'SONY', 'CANON', 'FUJIFILM', 'PANASONIC',
  'LEICA', 'PENTAX', 'RICOH', 'APPLE', 'SAMSUNG', 'HUAWEI',
  'GOOGLE', 'XIAOMI', 'OPPO', 'ONEPLUS', 'GOPRO', 'DJI',
]

function stripCameraBrand(camera: string | null | undefined): string {
  if (!camera) return ''
  const upper = camera.toUpperCase()
  for (const brand of CAMERA_BRAND_PREFIXES) {
    if (upper.startsWith(brand)) {
      return camera.slice(brand.length).replace(/^[\s\-.]+/, '').trim()
    }
  }
  return camera
}

// 렌즈: 첫 번째 "Nmm" / "N-Mmm" 패턴까지만 남김 (조리개·버전 정보 제거).
// 숫자와 mm 사이, 범위 dash 주변 공백 모두 허용 — "24 MM F/--" 같은 비정상 EXIF 도 처리.
function trimLensAtMm(lens: string | null | undefined): string {
  if (!lens) return ''
  const match = lens.match(/^(.*?\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?\s*mm)/i)
  return match ? match[1].trim() : lens
}

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
  linked_folders?: string[]
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

// ── CoverButton ──────────────────────────────────────────

interface CoverButtonProps {
  photo: Photo
  isCover: boolean
  onSetCover: (photo: Photo) => void
}

function CoverButton({ photo, isCover, onSetCover }: CoverButtonProps) {
  const { t } = useTranslation()
  return (
    <button
      onClick={e => { e.stopPropagation(); onSetCover(photo) }}
      className="h-7 px-2.5 flex items-center rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-sm text-white text-[0.7rem] font-medium whitespace-nowrap"
    >
      {isCover ? t('photo.isCover') : t('photo.setCover')}
    </button>
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
  const chipIdle = "border-edit-paper/30 text-edit-paper/80 hover:text-edit-paper hover:border-edit-paper/60"
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
      if (showNotePanel) return
      if (e.key === 'Escape') onClose()
      if ((e.key === 'ArrowRight' || e.code === 'KeyD') && idx < photos.length - 1) onNavigate(photos[idx + 1])
      if ((e.key === 'ArrowLeft' || e.code === 'KeyA') && idx > 0) onNavigate(photos[idx - 1])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [photo, photos, onClose, onNavigate, idx, showNotePanel])

  useEffect(() => {
    const preload = (url: string) => {
      const img = new Image()
      img.src = cfLightboxUrl(url)
    }
    if (idx > 0) preload(photos[idx - 1].image_url)
    if (idx < photos.length - 1) preload(photos[idx + 1].image_url)
    if (idx < photos.length - 2) preload(photos[idx + 2].image_url)
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
      return `Ch. ${parentIdx}.${childIdx}. ${assignedChapter.title}`
    } else {
      const parentIdx = chapters.filter(c => !c.parent_id).findIndex(c => c.id === assignedChapter.id) + 1
      return `Ch. ${parentIdx}. ${assignedChapter.title}`
    }
  }

  return (
    <div className="fixed inset-0 bg-black/90 z-lightbox flex flex-col" onClick={onClose}>

      {/* 상단 바 */}
      <div
        className="flex items-center justify-between px-6 pt-3 pb-0 shrink-0 relative"
        style={{ paddingTop: window.racconto ? '2rem' : undefined }}
        onClick={e => e.stopPropagation()}
      >
        {/* 왼쪽: 경고 */}
        <div className="flex-1 flex items-center gap-3 justify-start min-w-0">
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
                                       'text-edit-paper/40'
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
                    ? 'ring-1 ring-offset-2 ring-offset-black ring-white scale-110'
                    : 'opacity-40 hover:opacity-80'
                }`}
              />
            ))}
          </div>

          <div className="w-px h-3 bg-edit-paper/15" />

          {/* 챕터 */}
          <div className="flex items-center" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowChapterMenu(v => !v)}
              className={`${chipBase} ${inChapter ? chipActive : chipIdle}`}
            >
              <BookOpen size={13} strokeWidth={1.5} />{inChapter ? getAssignedChapterInfo() : t('story.addToChapter')}
            </button>
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
              className={`${chipBase} ${rotating ? 'border-edit-paper/10 text-edit-paper/30 cursor-not-allowed' : chipIdle}`}
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
              className={`${chipBase} ${rotating ? 'border-edit-paper/10 text-edit-paper/30 cursor-not-allowed' : chipIdle}`}
            >
              <RotateCw size={13} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* 오른쪽: 카운트 + 닫기 */}
        <div className="flex-1 flex items-center justify-end gap-2">
          <span className="text-edit-paper/60 text-small whitespace-nowrap">{idx + 1} / {photos.length}</span>
          <button onClick={onClose} className="text-edit-paper/80 hover:text-edit-paper text-h2 p-3">✕</button>
        </div>
      </div>

      {/* 중앙 이미지 */}
      <div className="flex-1 flex items-center justify-center mt-0 relative min-h-0">
        {idx > 0 && !showNotePanel && (
          <button
            className="absolute left-4 z-10 text-edit-paper/80 hover:text-edit-paper text-h1 select-none p-4"
            onClick={e => { e.stopPropagation(); onNavigate(photos[idx - 1]) }}
          >‹</button>
        )}
        <img
          src={cfLightboxUrl(photo.image_url)}
          alt={photo.caption || ''}
          className="max-w-[calc(100%-8rem)] max-h-full object-contain cursor-default"
          onClick={e => e.stopPropagation()}
        />
        {idx < photos.length - 1 && !showNotePanel && (
          <button
            className="absolute right-4 z-10 text-edit-paper/80 hover:text-edit-paper text-h1 select-none p-4"
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
            {showExif && (photo.camera || photo.taken_at || photo.aperture || photo.shutter_speed || photo.iso) && (
              <span className="text-small text-edit-paper/40">
                {[
                  // 1) 날짜
                  photo.taken_at
                    ? new Date(photo.taken_at).toLocaleDateString(i18n.language === 'ko' ? 'ko-KR' : 'en-US')
                    : null,
                  // 2) 기종 및 렌즈 — 제조사 prefix 제거, 렌즈는 mm 까지만
                  [stripCameraBrand(photo.camera), trimLensAtMm(photo.lens)].filter(Boolean).join(' + '),
                  // 3) ISO · 셔터스피드 · 조리개 (각 값에 이미 prefix/suffix 포함)
                  [photo.iso, photo.shutter_speed, photo.aperture].filter(Boolean).join(' '),
                ].filter(Boolean).join(' · ')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 챕터 메뉴 */}
      {showChapterMenu && (
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
            ) : (() => {
              const currentChapterId = photoChapterMap.get(photo.id)
              return chapters.filter(c => !c.parent_id).map((parent, pIdx) => (
                <div key={parent.id}>
                  <button
                    onClick={() => { onAddToChapter(photo.id, parent.id); setShowChapterMenu(false) }}
                    className="w-full text-left px-3 py-2 text-small rounded-[1px] hover:bg-edit-paper-2 text-edit-ink whitespace-nowrap flex items-center justify-between gap-4"
                  >
                    <span>Ch. {pIdx + 1}. {parent.title}</span>
                    {currentChapterId === parent.id && <Check size={12} strokeWidth={2} className="text-green-600 shrink-0" />}
                  </button>
                  {chapters.filter(c => c.parent_id === parent.id).map((child, cIdx) => (
                    <button
                      key={child.id}
                      onClick={() => { onAddToChapter(photo.id, child.id); setShowChapterMenu(false) }}
                      className="w-full text-left px-3 py-2 text-small rounded-[1px] hover:bg-edit-paper-2 text-edit-muted pl-9 whitespace-nowrap flex items-center justify-between gap-4"
                    >
                      <span>Ch. {pIdx + 1}.{cIdx + 1}. {child.title}</span>
                      {currentChapterId === child.id && <Check size={12} strokeWidth={2} className="text-green-600 shrink-0" />}
                    </button>
                  ))}
                </div>
              ))
            })()}
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
  onSetRating: (photo: Photo, rating: number) => void
  onSetColorLabel: (photo: Photo, label: string) => void
  onOpenLightbox: (photo: Photo) => void
  showExif: boolean
  showFilename: boolean
  gridCols: number
  colorLabels: ColorLabel[]
  chapterPhotoIds: Set<string>
  selectionMode: boolean
  isSelected: boolean
  anySelected: boolean
  onToggleSelect: (id: string) => void
}

export const PhotoCard = memo(function PhotoCard({
  photo, project, onSetCover, onSetRating, onSetColorLabel,
  onOpenLightbox, showExif, showFilename, colorLabels, chapterPhotoIds,
  selectionMode, isSelected, anySelected, onToggleSelect
}: PhotoCardProps) {
  const { t, i18n } = useTranslation()
  const isAlreadyInStory = chapterPhotoIds.has(photo.id)
  const [hoverStar, setHoverStar] = useState<number | null>(null)

  return (
    <div className={`rounded-[2px] overflow-hidden transition-[box-shadow] ${
      isSelected ? 'ring-2 ring-edit-ink ring-offset-2 ring-offset-edit-paper' : ''
    }`}>
      <div className="relative group bg-[#F2EFE6]">

        {/* 이미지 */}
        <img
          src={cfUrl(photo.image_url, 'grid')}
          alt={photo.caption || 'photo'}
          className={`w-full aspect-[3/2] object-contain transition-[opacity,transform] duration-500 ${
            selectionMode && isAlreadyInStory
              ? 'opacity-30 grayscale cursor-not-allowed'
              : isSelected
              ? 'opacity-70 scale-[0.98] cursor-pointer'
              : 'group-hover:scale-[1.01] cursor-pointer'
          }`}
          onClick={() => {
            if (anySelected || selectionMode) {
              if (selectionMode && isAlreadyInStory) return
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

        {/* 커버 버튼 (호버 시, 선택 모드 아닐 때) */}
        {!anySelected && !selectionMode && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity z-photo-controls">
            <CoverButton
              photo={photo}
              isCover={project?.cover_image_url === photo.image_url}
              onSetCover={onSetCover}
            />
          </div>
        )}

        {/* 체크박스 — 좌상단 네모, hover 또는 anySelected/selectionMode 시 표시 */}
        {!(selectionMode && isAlreadyInStory) && (
          <button
            onClick={e => { e.stopPropagation(); onToggleSelect(photo.id) }}
            className={`absolute top-1.5 left-1.5 z-photo-controls w-5 h-5 rounded flex items-center justify-center transition-opacity ${
              isSelected || anySelected || selectionMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            } ${isSelected ? 'bg-white' : 'bg-black/40 border border-white/60'}`}
            aria-label={isSelected ? '선택 해제' : '선택'}
          >
            {isSelected && <Check size={11} strokeWidth={2.5} className="text-edit-ink" />}
          </button>
        )}
      </div>

      {/* 하단 메타 — 항상 표시 (paper-2 배경) */}
      <div className={`px-3 py-2 bg-edit-paper-2 transition-opacity ${
        selectionMode ? 'opacity-40 pointer-events-none' : ''
      }`}>
        <div className="flex items-center justify-between gap-2">
          {/* 별점 */}
          <div className="flex gap-0.5" onMouseLeave={() => setHoverStar(null)}>
            {[1, 2, 3, 4, 5].map(star => {
              const isHovered = hoverStar !== null && star <= hoverStar
              const isActive  = !!(photo.rating && photo.rating >= star)
              return (
                <button
                  key={star}
                  onMouseEnter={() => setHoverStar(star)}
                  onClick={e => { e.stopPropagation(); onSetRating(photo, star) }}
                  className="p-0.5"
                >
                  <Star size={10} strokeWidth={1.25}
                    className={`transition-colors ${
                      isHovered
                        ? 'fill-label-yellow text-label-yellow'
                        : isActive
                        ? 'fill-label-yellow text-label-yellow'
                        : 'text-edit-muted'
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
                      ? 'ring-1 ring-offset-1 ring-offset-edit-paper ring-edit-ink scale-110'
                      : 'opacity-50 hover:opacity-100 hover:scale-110'
                  }`}
                />
              )
            })}
          </div>
        </div>
        {/* 파일명 */}
        {showFilename && photo.original_filename && (
          <p className="t-caption text-edit-faint truncate mt-1.5 select-none" title={photo.original_filename}>
            {photo.original_filename}
          </p>
        )}
        {/* EXIF */}
        {showExif && (photo.camera || photo.taken_at || photo.aperture || photo.shutter_speed || photo.iso) && (
          <div className="mt-1.5 space-y-0.5">
            {[
              // 1) 날짜
              photo.taken_at
                ? new Date(photo.taken_at).toLocaleDateString(i18n.language === 'ko' ? 'ko-KR' : 'en-US')
                : null,
              // 2) 기종 및 렌즈 — 제조사 prefix 제거, 렌즈는 mm 까지만
              [stripCameraBrand(photo.camera), trimLensAtMm(photo.lens)].filter(Boolean).join(' + '),
              // 3) ISO · 셔터스피드 · 조리개 (각 값에 이미 prefix/suffix 포함)
              [photo.iso, photo.shutter_speed, photo.aperture].filter(Boolean).join(' '),
            ].filter(Boolean).map((line, i) => (
              <p key={i} className="t-caption text-edit-faint font-mono leading-snug">{line}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
})
