import { useEffect, useRef, useState } from 'react'
import { X, ChevronLeft, ChevronRight, RotateCw, BookOpen, FileText, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import PhotoNotePanel from '../PhotoNotePanel'
import type { Photo, ColorLabel } from '../ProjectDetailComponents'

interface MobileLightboxProps {
  photo: Photo
  photos: Photo[]
  colorLabels: ColorLabel[]
  chapterPhotoIds: Set<string>
  chapters: { id: string; title: string; parent_id?: string | null; order_num?: number }[]
  photoChapterMap: Map<string, string>
  projectId: string
  onClose: () => void
  onNavigate: (p: Photo) => void
  onSetRating: (p: Photo, r: number) => void
  onSetColorLabel: (p: Photo, l: string) => void
  onAddToChapter: (photoId: string, chapterId: string) => void
  onNoteChange: () => void
  onRotate: (photo: Photo, direction: 'left' | 'right') => Promise<void>
}

export default function MobileLightbox({
  photo, photos, colorLabels, chapterPhotoIds,
  chapters, photoChapterMap, projectId,
  onClose, onNavigate, onSetRating, onSetColorLabel, onAddToChapter, onNoteChange, onRotate,
}: MobileLightboxProps) {
  const { t } = useTranslation()
  const idx = photos.findIndex(p => p.id === photo.id)
  const touchStartX = useRef(0)
  const [showNotePanel, setShowNotePanel] = useState(false)
  const [showChapterMenu, setShowChapterMenu] = useState(false)
  const [showExif, setShowExif] = useState(false)
  const [rotating, setRotating] = useState(false)

  useEffect(() => {
    setShowNotePanel(false)
    setShowChapterMenu(false)
    setShowExif(false)
    setRotating(false)
  }, [photo.id])

  // 키보드 이벤트
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' && idx < photos.length - 1) onNavigate(photos[idx + 1])
      if (e.key === 'ArrowLeft' && idx > 0) onNavigate(photos[idx - 1])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [photo, photos, onClose, onNavigate, idx])

  // 프리로드
  useEffect(() => {
    const preload = (url: string) => { const img = new Image(); img.src = url }
    if (idx > 0) preload(photos[idx - 1].image_url)
    if (idx < photos.length - 1) preload(photos[idx + 1].image_url)
  }, [idx, photos])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (delta < -50 && idx < photos.length - 1) onNavigate(photos[idx + 1])
    if (delta > 50 && idx > 0) onNavigate(photos[idx - 1])
  }

  const handleRotate = async (direction: 'left' | 'right') => {
    if (rotating) return
    setRotating(true)
    try { await onRotate(photo, direction) }
    finally { setRotating(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* 상단 바 */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0">
        <button onClick={onClose} className="min-w-[44px] min-h-[44px] flex items-center justify-center">
          <X size={22} strokeWidth={1.5} className="text-white" />
        </button>
        <span className="text-white/60 text-sm">{idx + 1} / {photos.length}</span>
        <div className="w-[44px]" />
      </div>

      {/* 이미지 영역 */}
      <div
        className="flex-1 overflow-hidden flex items-center justify-center"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={photo.image_url}
          alt={photo.caption || 'photo'}
          style={{ width: '100%', height: '100dvh', objectFit: 'contain' }}
          draggable={false}
        />

        {/* 좌우 네비게이션 버튼 */}
        {idx > 0 && (
          <button
            onClick={() => onNavigate(photos[idx - 1])}
            className="absolute left-2 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center bg-black/30 rounded-full"
          >
            <ChevronLeft size={22} strokeWidth={1.5} className="text-white" />
          </button>
        )}
        {idx < photos.length - 1 && (
          <button
            onClick={() => onNavigate(photos[idx + 1])}
            className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center bg-black/30 rounded-full"
          >
            <ChevronRight size={22} strokeWidth={1.5} className="text-white" />
          </button>
        )}
      </div>

      {/* 하단 바 */}
      <div className="shrink-0 bg-black/80 px-4 py-2">
        {/* 별점 */}
        <div className="flex items-center gap-1 mb-2">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onClick={() => onSetRating(photo, star)}
              className={`flex-1 min-h-[44px] flex items-center justify-center text-lg ${
                photo.rating && photo.rating >= star ? 'text-yellow-400' : 'text-white/20'
              }`}
            >★</button>
          ))}
        </div>

        {/* 컬러 라벨 */}
        <div className="flex items-center gap-2 mb-2">
          {colorLabels.map(label => (
            <button
              key={label.value}
              onClick={() => onSetColorLabel(photo, label.value)}
              className={`w-7 h-7 rounded-full ${label.color} border-2 transition-transform ${
                photo.color_label === label.value ? 'border-white scale-110' : 'border-transparent opacity-50'
              }`}
            />
          ))}
        </div>

        {/* 액션 버튼 행 */}
        <div className="flex items-center gap-1">
          {/* 챕터 */}
          <button
            onClick={() => { setShowChapterMenu(v => !v); setShowNotePanel(false) }}
            className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 text-white/70 text-xs"
          >
            <BookOpen size={16} strokeWidth={1.5} />
            {t('story.chapter')}
          </button>

          {/* 노트 */}
          <button
            onClick={() => { setShowNotePanel(v => !v); setShowChapterMenu(false) }}
            className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 text-white/70 text-xs"
          >
            <FileText size={16} strokeWidth={1.5} />
            {t('note.title')}
          </button>

          {/* 회전 */}
          <button
            onClick={() => handleRotate('right')}
            disabled={rotating}
            className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 text-white/70 text-xs disabled:opacity-40"
          >
            <RotateCw size={16} strokeWidth={1.5} />
          </button>

          {/* EXIF */}
          {(photo.camera || photo.taken_at) && (
            <button
              onClick={() => setShowExif(v => !v)}
              className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 text-white/70 text-xs"
            >
              <ChevronDown size={16} strokeWidth={1.5} className={`transition-transform ${showExif ? 'rotate-180' : ''}`} />
              EXIF
            </button>
          )}
        </div>

        {/* EXIF 정보 */}
        {showExif && (photo.camera || photo.taken_at) && (
          <div className="mt-2 text-white/50 text-xs space-y-0.5 font-mono">
            {photo.taken_at && <p>{new Date(photo.taken_at).toLocaleDateString()}{photo.camera && ` · ${photo.camera}`}</p>}
            {photo.lens && <p>{photo.lens}</p>}
            {(photo.focal_length || photo.aperture || photo.shutter_speed || photo.iso) && (
              <p>{[photo.focal_length, photo.aperture, photo.shutter_speed, photo.iso].filter(Boolean).join(' · ')}</p>
            )}
          </div>
        )}
      </div>

      {/* 챕터 선택 Bottom Sheet */}
      {showChapterMenu && (
        <div className="fixed inset-0 z-60 flex flex-col justify-end" style={{ zIndex: 60 }}>
          <div className="absolute inset-0" onClick={() => setShowChapterMenu(false)} />
          <div className="relative bg-white rounded-t-2xl max-h-[60dvh] overflow-y-auto" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-stone-300" />
            </div>
            <p className="px-4 pb-2 text-sm font-semibold text-stone-700">{t('story.selectChapter')}</p>
            {chapters.map(ch => (
              <button
                key={ch.id}
                onClick={() => { onAddToChapter(photo.id, ch.id); setShowChapterMenu(false) }}
                className={`w-full text-left px-4 py-3 min-h-[44px] text-sm text-stone-700 ${chapterPhotoIds.has(photo.id) && photoChapterMap.get(photo.id) === ch.id ? 'font-semibold' : ''} ${ch.parent_id ? 'pl-8' : ''}`}
              >
                {ch.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 노트 패널 Bottom Sheet */}
      {showNotePanel && (
        <div className="fixed inset-0 z-60 flex flex-col justify-end" style={{ zIndex: 60 }}>
          <div className="absolute inset-0" onClick={() => setShowNotePanel(false)} />
          <div className="relative bg-white rounded-t-2xl max-h-[70dvh] overflow-y-auto" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-stone-300" />
            </div>
            <PhotoNotePanel
              photoId={photo.id}
              projectId={projectId}
              onClose={() => setShowNotePanel(false)}
              onNoteChange={onNoteChange}
            />
          </div>
        </div>
      )}
    </div>
  )
}
