import { memo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Check } from 'lucide-react'
import type { Photo, Project, ColorLabel } from '../ProjectDetailComponents'

interface TabletPhotoCardProps {
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

export const TabletPhotoCard = memo(function TabletPhotoCard({
  photo, project, onSetCover, onDelete, onSetRating, onSetColorLabel,
  onOpenLightbox, colorLabels, chapterPhotoIds,
  selectionMode, isSelected, onToggleSelect
}: TabletPhotoCardProps) {
  const { t } = useTranslation()
  const isAlreadyInStory = chapterPhotoIds.has(photo.id)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [overlayLocked, setOverlayLocked] = useState(false)
  const [showOverlay, setShowOverlay] = useState(false)

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => setOverlayLocked(true), 500)
  }
  const handleTouchEnd = () => {
    clearTimeout(longPressTimer.current)
  }
  const handleTouchMove = () => clearTimeout(longPressTimer.current)

  const overlayVisible = showOverlay || overlayLocked

  return (
    <div className={`rounded-photo overflow-hidden bg-gray-100 transition-all ${isSelected ? 'ring-4 ring-blue-500 shadow' : ''}`}>
      <div
        className="relative group"
        onMouseEnter={() => setShowOverlay(true)}
        onMouseLeave={() => setShowOverlay(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onClick={() => { if (overlayLocked) { setOverlayLocked(false); return } }}
      >
        <img
          src={photo.image_url}
          alt={photo.caption || 'photo'}
          className={`w-full aspect-[3/2] object-contain transition-all ${
            selectionMode && isAlreadyInStory
              ? 'opacity-30 grayscale cursor-not-allowed'
              : isSelected
              ? 'opacity-70 scale-[0.98] cursor-pointer'
              : 'cursor-pointer'
          }`}
          onClick={() => {
            if (selectionMode) {
              if (isAlreadyInStory) return
              onToggleSelect(photo.id)
            } else if (!overlayLocked) {
              onOpenLightbox(photo)
            }
          }}
        />

        {photo.local_missing && (
          <div className="absolute top-2 left-2 z-10 bg-yellow-400 text-ink-2 text-eyebrow font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
            <AlertTriangle size={11} strokeWidth={1.5} />{t('project.noLocalFile')}
          </div>
        )}

        {selectionMode && !isAlreadyInStory && (
          <div
            className="absolute top-3 left-3 z-20 cursor-pointer"
            onClick={e => { e.stopPropagation(); onToggleSelect(photo.id) }}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shadow ${
              isSelected ? 'bg-blue-500/50 border-blue-500/30' : 'bg-ink-2/40 border-card/80'
            }`}>
              {isSelected && <Check size={12} strokeWidth={1.5} className="text-card" />}
            </div>
          </div>
        )}

        {!selectionMode && overlayVisible && (
          <div className="absolute inset-0 transition-opacity duration-200 z-10">
            <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/50 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute inset-0" onClick={() => !overlayLocked && onOpenLightbox(photo)} />

            <div className="absolute top-2 right-2 flex gap-1">
              <button
                onClick={e => { e.stopPropagation(); onSetCover(photo) }}
                className={`min-w-[44px] min-h-[44px] flex items-center justify-center px-2 py-1 text-eyebrow rounded-card shadow font-base ${
                  project?.cover_image_url === photo.image_url
                    ? 'bg-yellow-400 text-ink-2'
                    : 'bg-ink/30 hover:bg-ink-2/90 text-card'
                }`}
              >
                {project?.cover_image_url === photo.image_url ? t('photo.isCover') : t('photo.setCover')}
              </button>
              <button
                onClick={e => { e.stopPropagation(); onDelete(photo.id) }}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-red-500/30 hover:bg-red-600 text-card rounded-full shadow text-xs font-bold transition-colors"
              >✕</button>
            </div>

            <div className="absolute bottom-2 left-2 flex flex-col gap-1.5">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(star => {
                  const isActive = photo.rating && photo.rating >= star
                  return (
                    <button
                      key={star}
                      onClick={e => { e.stopPropagation(); onSetRating(photo, star) }}
                      className={`min-w-[44px] min-h-[44px] flex items-center justify-center text-small transition-all drop-shadow ${
                        isActive ? 'text-yellow-400 scale-110' : 'text-white/40'
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
                      className={`rounded-full w-4 h-4 ${label.color} transition-all shadow border border-card/10 ${
                        isActive ? 'ring-2 ring-offset-1 ring-offset-black/40 ring-white scale-125' : 'opacity-40'
                      }`}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})
