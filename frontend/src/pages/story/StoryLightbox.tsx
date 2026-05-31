import { useEffect } from 'react'
import { FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cfLightboxUrl } from '../../utils/cfImage'
import PhotoNotePanel from '../../components/PhotoNotePanel'
import type { ChapterItem } from '../../components/StoryBlocks'

interface StoryLightboxProps {
  photos: ChapterItem[]
  selectedIndex: number
  showNotePanel: boolean
  projectId: string
  onClose: () => void
  onNavigate: (index: number) => void
  onToggleNotePanel: () => void
  onCloseNotePanel: () => void
  getChapterDisplayTitle: (chapterId: string) => string
}

export default function StoryLightbox({
  photos,
  selectedIndex,
  showNotePanel,
  projectId,
  onClose,
  onNavigate,
  onToggleNotePanel,
  onCloseNotePanel,
  getChapterDisplayTitle,
}: StoryLightboxProps) {
  const { t } = useTranslation()
  const photo = photos[selectedIndex]

  // 인접 이미지 preload — 앞 1장 + 뒤 2장 (ProjectDetailComponents / PublicPortfolio 와 동일 패턴)
  useEffect(() => {
    if (!photo) return
    const indices = [selectedIndex - 1, selectedIndex + 1, selectedIndex + 2]
      .filter(i => i >= 0 && i < photos.length)
    indices.forEach(i => {
      const url = photos[i]?.image_url
      if (!url) return
      const img = new Image()
      img.src = cfLightboxUrl(url)
    })
  }, [selectedIndex, photos, photo])

  if (!photo) return null

  return (
    <div
      className="fixed inset-0 bg-black/90 z-50 flex flex-col"
      onClick={() => { onClose(); onCloseNotePanel() }}
    >
      {/* 상단: 챕터명 + 노트 (중앙) | 카운트 + 닫기 (오른쪽) */}
      <div
        className="flex items-center justify-between px-4 pt-3 pb-0 shrink-0"
        style={{ paddingTop: window.racconto ? '2rem' : undefined }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex-1" />
        <div className="flex items-center gap-3">
          <span className="text-edit-paper/70 text-small">
            {getChapterDisplayTitle(photo.chapter_id)}
          </span>
          <button
            onClick={e => { e.stopPropagation(); onToggleNotePanel() }}
            className={`inline-flex items-center gap-1.5 t-caption px-3 py-1.5 rounded-[1px] border transition-colors duration-150 ${
              showNotePanel
                ? 'border-edit-paper/50 text-edit-paper bg-edit-paper/5'
                : 'border-edit-paper/30 text-edit-paper/80 hover:text-edit-paper hover:border-edit-paper/60'
            }`}
          >
            <FileText size={12} strokeWidth={1.5} />{t('note.title')}
          </button>
        </div>
        <div className="flex-1 flex items-center justify-end gap-2">
          <span className="text-edit-paper/60 text-small">
            {selectedIndex + 1} / {photos.length}
          </span>
          <button
            onClick={() => { onClose(); onCloseNotePanel() }}
            className="text-edit-paper/80 hover:text-edit-paper text-h2 p-3"
          >✕</button>
        </div>
      </div>

      {/* 중앙: 이미지 + 좌우 화살표 */}
      <div
        className="flex-1 flex items-center justify-center relative min-h-0"
        onClick={() => onClose()}
      >
        {selectedIndex > 0 && (
          <button
            className="absolute left-4 z-10 text-edit-paper/80 hover:text-edit-paper text-h1 select-none p-4"
            onMouseDown={e => e.preventDefault()}
            onClick={e => { e.stopPropagation(); onNavigate(selectedIndex - 1) }}
          >‹</button>
        )}
        <img
          src={cfLightboxUrl(photo.image_url) || undefined}
          alt={photo.caption || undefined}
          className="max-w-[calc(100%-8rem)] max-h-full object-contain"
          onClick={e => e.stopPropagation()}
        />
        {selectedIndex < photos.length - 1 && (
          <button
            className="absolute right-4 z-10 text-edit-paper/80 hover:text-edit-paper text-h1 select-none p-4"
            onMouseDown={e => e.preventDefault()}
            onClick={e => { e.stopPropagation(); onNavigate(selectedIndex + 1) }}
          >›</button>
        )}
      </div>

      {/* 하단: 캡션 */}
      <div
        className="shrink-0 bg-black/80 border-t border-white/10 px-6 py-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="max-w-[calc(100%-8rem)] mx-auto min-h-[1.25rem]">
          {photo.caption && (
            <p className="text-sm text-white/70">{photo.caption}</p>
          )}
        </div>
      </div>

      {showNotePanel && (
        <PhotoNotePanel
          photoId={photo.photo_id!}
          projectId={projectId}
          onClose={onCloseNotePanel}
        />
      )}
    </div>
  )
}
