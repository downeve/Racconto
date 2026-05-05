import { memo, useRef } from 'react'
import { Check } from 'lucide-react'
import type { Photo, ColorLabel } from '../ProjectDetailComponents'

interface MobilePhotoCardProps {
  photo: Photo
  colorLabels: ColorLabel[]
  chapterPhotoIds: Set<string>
  selectionMode: boolean
  isSelected: boolean
  onToggleSelect: (id: string) => void
  onOpenLightbox: (photo: Photo) => void
  onShowActionSheet: (photo: Photo) => void
}

export const MobilePhotoCard = memo(function MobilePhotoCard({
  photo, colorLabels, chapterPhotoIds,
  selectionMode, isSelected, onToggleSelect,
  onOpenLightbox, onShowActionSheet,
}: MobilePhotoCardProps) {
  const isAlreadyInStory = chapterPhotoIds.has(photo.id)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const handleTouchStart = (_e: React.TouchEvent) => {
    if (selectionMode) return
    longPressTimer.current = setTimeout(() => onShowActionSheet(photo), 500)
  }
  const handleTouchEnd = () => clearTimeout(longPressTimer.current)
  const handleTouchMove = () => clearTimeout(longPressTimer.current)

  return (
    <div
      className={`rounded-photo overflow-hidden bg-gray-100 relative ${isSelected ? 'ring-4 ring-blue-500' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onClick={() => {
        if (selectionMode) {
          if (isAlreadyInStory) return
          onToggleSelect(photo.id)
        } else {
          onOpenLightbox(photo)
        }
      }}
    >
      <img
        src={photo.image_url}
        alt={photo.caption || 'photo'}
        className={`w-full aspect-[3/2] object-cover ${
          selectionMode && isAlreadyInStory ? 'opacity-30 grayscale' : isSelected ? 'opacity-70' : ''
        }`}
      />

      {/* 컬러 라벨 */}
      {photo.color_label && (() => {
        const label = colorLabels.find(l => l.value === photo.color_label)
        return label ? (
          <div className={`absolute top-2 left-2 w-4 h-4 rounded-full ${label.color} border border-white/60 shadow`} />
        ) : null
      })()}

      {/* 선택 체크박스 */}
      {selectionMode && !isAlreadyInStory && (
        <div
          className="absolute top-2 left-2 z-10"
          onClick={e => { e.stopPropagation(); onToggleSelect(photo.id) }}
        >
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shadow ${
            isSelected ? 'bg-blue-500/50 border-blue-500/30' : 'bg-black/40 border-white/80'
          }`}>
            {isSelected && <Check size={14} strokeWidth={1.5} className="text-white" />}
          </div>
        </div>
      )}

      {/* 별점 표시 */}
      {photo.rating && photo.rating > 0 && !selectionMode && (
        <div className="absolute bottom-1 right-1 text-yellow-400 text-xs leading-none drop-shadow">
          {'★'.repeat(photo.rating)}
        </div>
      )}
    </div>
  )
})
