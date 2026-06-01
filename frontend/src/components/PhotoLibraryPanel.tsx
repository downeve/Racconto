import { useState, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { X, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cfUrl } from '../utils/cfImage'

const API = import.meta.env.VITE_API_URL

interface Photo {
  id: string
  image_url: string
  caption: string | null
  folder: string | null
}

interface Chapter {
  id: string
  title: string
  parent_id: string | null
  order_num: number
}

interface Props {
  photos: Photo[]
  chapters: Chapter[]
  projectId: string
  chapterPhotoIds: Record<string, Set<string>>  // 챕터별 이미 추가된 photo_id Set
  onClose: () => void
}

export default function PhotoLibraryPanel({
  photos, chapters, projectId, chapterPhotoIds, onClose,
}: Props) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  // 최초 선택 챕터: 최상위 첫 번째
  const firstChapterId = useMemo(
    () => chapters.filter(c => !c.parent_id).sort((a, b) => a.order_num - b.order_num)[0]?.id ?? '',
    [chapters]
  )
  const [selectedChapterId, setSelectedChapterId] = useState<string>(firstChapterId)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState(false)

  // 드롭다운 옵션: 최상위 챕터 → 서브챕터(들여쓰기 + 번호)
  const chapterOptions = useMemo(() => {
    const tops = chapters.filter(c => !c.parent_id).sort((a, b) => a.order_num - b.order_num)
    const result: { chapter: Chapter; label: string }[] = []
    tops.forEach((top, ti) => {
      result.push({ chapter: top, label: `Ch. ${ti + 1}. ${top.title}` })
      chapters
        .filter(c => c.parent_id === top.id)
        .sort((a, b) => a.order_num - b.order_num)
        .forEach((sub, si) => result.push({ chapter: sub, label: `  Ch. ${ti + 1}.${si + 1}. ${sub.title}` }))
    })
    return result
  }, [chapters])

  // 모든 챕터에 이미 들어있는 photo_id (챕터 하나에만 추가 가능)
  const alreadyInAnyChapter = useMemo(() => {
    const all = new Set<string>()
    Object.values(chapterPhotoIds).forEach(ids => ids.forEach(id => all.add(id)))
    return all
  }, [chapterPhotoIds])

  const togglePhoto = (id: string) => {
    if (alreadyInAnyChapter.has(id)) return
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleAdd = async () => {
    if (!selectedChapterId || selectedIds.size === 0) return
    setAdding(true)
    try {
      await axios.post(`${API}/chapters/${selectedChapterId}/photos/bulk`, {
        photo_ids: Array.from(selectedIds),
      })
      // 단일 쿼리(storyChapters)로 통합되어 한 번만 invalidate 하면 양쪽 페이지 모두 갱신.
      queryClient.invalidateQueries({ queryKey: ['storyChapters', projectId] })
      setSelectedIds(new Set())
    } finally {
      setAdding(false)
    }
  }

  const handleChapterChange = (id: string) => {
    setSelectedChapterId(id)
  }

  return (
    <div className="w-96 flex-shrink-0 sticky top-6 flex flex-col bg-edit-paper border border-edit-line rounded-btn max-h-[calc(100vh-5rem)] overflow-hidden shadow">

      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-edit-line shrink-0">
        <span className="t-eyebrow text-edit-ink">{t('story.photoLibrary')}</span>
        <button
          onClick={onClose}
          className="text-edit-muted hover:text-edit-ink transition-colors"
          aria-label="닫기"
        >
          <X size={14} strokeWidth={1.5} />
        </button>
      </div>

      {/* 챕터 드롭다운 + 추가 버튼 */}
      <div className="px-3 py-2.5 border-b border-edit-line shrink-0">
        <p className="t-eyebrow text-edit-faint mb-1.5">{t('story.selectChapter')}</p>
        <select
          value={selectedChapterId}
          onChange={e => handleChapterChange(e.target.value)}
          className="w-full text-[0.8125rem] font-sans text-edit-ink bg-edit-paper border border-edit-line rounded-btn px-2 py-1.5 focus:outline-none focus:border-edit-ink transition-colors mb-2"
        >
          {chapterOptions.map(({ chapter, label }) => (
            <option key={chapter.id} value={chapter.id}>{label}</option>
          ))}
        </select>
        <button
          onClick={handleAdd}
          disabled={selectedIds.size === 0 || !selectedChapterId || adding}
          className="w-full px-3 py-2 rounded-[1px] text-[0.8125rem] font-sans font-medium
                     bg-edit-ink text-edit-paper hover:bg-edit-ink/85
                     disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {selectedIds.size > 0
            ? t('story.addToChapterCount', { count: selectedIds.size })
            : t('story.addToChapter')}
        </button>
      </div>

      {/* 사진 그리드 */}
      <div className="flex-1 overflow-y-auto p-2">
        {photos.length === 0 ? (
          <p className="text-center text-[0.8125rem] text-edit-faint py-10">
            {t('story.noPhotos')}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {[...photos].reverse().map(photo => {
              const inChapter = alreadyInAnyChapter.has(photo.id)
              const selected = selectedIds.has(photo.id)
              return (
                <button
                  key={photo.id}
                  onClick={() => togglePhoto(photo.id)}
                  disabled={inChapter}
                  className={[
                    'relative aspect-[3/2] overflow-hidden rounded-[1px] focus:outline-none',
                    inChapter
                      ? 'opacity-30 cursor-default'
                      : 'cursor-pointer hover:opacity-85',
                    selected
                      ? 'ring-2 ring-edit-ink ring-offset-1'
                      : '',
                  ].join(' ')}
                >
                  <img
                    src={cfUrl(photo.image_url, 'grid')}
                    alt={photo.caption || ''}
                    className="w-full h-full object-cover"
                  />
                  {selected && (
                    <div className="absolute inset-0 bg-edit-ink/20 flex items-center justify-center">
                      <div className="w-5 h-5 rounded-full bg-edit-ink flex items-center justify-center">
                        <Check size={11} strokeWidth={2.5} className="text-edit-paper" />
                      </div>
                    </div>
                  )}
                  {inChapter && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Check size={14} strokeWidth={2} className="text-edit-muted" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
