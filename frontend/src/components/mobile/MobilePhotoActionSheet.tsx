import { useTranslation } from 'react-i18next'
import type { Photo, ColorLabel } from '../ProjectDetailComponents'

interface Chapter {
  id: string
  title: string
  parent_id?: string | null
}

interface MobilePhotoActionSheetProps {
  photo: Photo
  colorLabels: ColorLabel[]
  chapters: Chapter[]
  onSetCover: (photo: Photo) => void
  onDelete: (id: string) => void
  onSetRating: (photo: Photo, rating: number) => void
  onSetColorLabel: (photo: Photo, label: string) => void
  onAddToChapter: (photoId: string, chapterId: string) => void
  onClose: () => void
}

export default function MobilePhotoActionSheet({
  photo, colorLabels, chapters,
  onSetCover, onDelete, onSetRating, onSetColorLabel, onAddToChapter, onClose,
}: MobilePhotoActionSheetProps) {
  const { t } = useTranslation()

  const handleDelete = () => {
    onClose()
    onDelete(photo.id)
  }

  const handleSetCover = () => {
    onSetCover(photo)
    onClose()
  }

  return (
    <div className="px-4 pb-6">
      {/* 별점 */}
      <div className="py-3 border-b border-stone-100">
        <p className="text-xs text-stone-400 mb-2">{t('photo.rating') || '별점'}</p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onClick={() => { onSetRating(photo, star); onClose() }}
              className={`flex-1 min-h-[44px] min-w-[44px] flex items-center justify-center text-xl transition-colors ${
                photo.rating && photo.rating >= star ? 'text-yellow-400' : 'text-stone-200'
              }`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      {/* 컬러 라벨 */}
      <div className="py-3 border-b border-stone-100">
        <p className="text-xs text-stone-400 mb-2">{t('photo.colorLabel') || '색상 라벨'}</p>
        <div className="flex gap-3">
          {colorLabels.map(label => (
            <button
              key={label.value}
              onClick={() => { onSetColorLabel(photo, label.value); onClose() }}
              title={label.label}
              className={`w-8 h-8 rounded-full ${label.color} border-2 transition-transform ${
                photo.color_label === label.value ? 'border-stone-700 scale-110' : 'border-transparent'
              }`}
            />
          ))}
        </div>
      </div>

      {/* 커버로 지정 */}
      <button
        onClick={handleSetCover}
        className="w-full text-left px-0 py-3 min-h-[44px] text-sm text-stone-700 border-b border-stone-100"
      >
        {t('photo.setCover')}
      </button>

      {/* 챕터 추가 */}
      {chapters.length > 0 && (
        <div className="py-3 border-b border-stone-100">
          <p className="text-xs text-stone-400 mb-2">{t('story.selectChapter')}</p>
          <div className="flex flex-col gap-1">
            {chapters.map(ch => (
              <button
                key={ch.id}
                onClick={() => { onAddToChapter(photo.id, ch.id); onClose() }}
                className={`text-left px-2 py-2 min-h-[44px] text-sm rounded-lg text-stone-700 ${ch.parent_id ? 'pl-6' : ''}`}
              >
                {ch.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 삭제 */}
      <button
        onClick={handleDelete}
        className="w-full text-left px-0 py-3 min-h-[44px] text-sm text-red-500 mt-1"
      >
        {t('common.delete')}
      </button>

      {/* 취소 */}
      <button
        onClick={onClose}
        className="w-full text-center px-0 py-3 min-h-[44px] text-sm text-stone-400 border-t border-stone-100 mt-2"
      >
        {t('common.cancel')}
      </button>
    </div>
  )
}
