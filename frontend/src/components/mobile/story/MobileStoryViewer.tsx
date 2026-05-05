import { useTranslation } from 'react-i18next'
import MarkdownRenderer from '../../MarkdownRenderer'
import type { ChapterItem } from '../../StoryBlocks'

interface Chapter {
  id: string
  title: string
  description: string | null
  order_num: number
  parent_id: string | null
}

interface ChapterBlock {
  type: 'PHOTO' | 'TEXT' | 'SIDE'
  blockId: string
  items: ChapterItem[]
}

interface MobileStoryViewerProps {
  chapters: Chapter[]
  blocksPerChapter: Record<string, ChapterBlock[]>
  darkMode?: boolean
  onPhotoClick?: (item: ChapterItem) => void
}

export default function MobileStoryViewer({ chapters, blocksPerChapter, darkMode, onPhotoClick }: MobileStoryViewerProps) {
  const { t } = useTranslation()

  const renderBlock = (block: ChapterBlock) => {
    if (block.type === 'TEXT') {
      const textItem = block.items[0]
      if (!textItem?.text_content) return null
      return (
        <div key={block.blockId} className="mb-4 px-1">
          <MarkdownRenderer content={textItem.text_content} darkMode={darkMode} />
        </div>
      )
    }

    if (block.type === 'SIDE') {
      // 모바일에서 세로 스택
      const photoItems = block.items.filter(i => i.item_type === 'PHOTO')
      const textItem = block.items.find(i => i.item_type === 'TEXT')
      return (
        <div key={block.blockId} className="flex flex-col gap-3 mb-4">
          <div className="grid grid-cols-2 gap-1">
            {photoItems.map(photo => (
              <div key={photo.id} className="aspect-[3/2] overflow-hidden rounded">
                <img
                  src={photo.image_url || ''}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => onPhotoClick?.(photo)}
                  alt={photo.caption || ''}
                />
              </div>
            ))}
          </div>
          {textItem?.text_content && (
            <MarkdownRenderer content={textItem.text_content} darkMode={darkMode} />
          )}
        </div>
      )
    }

    // PHOTO 블록 (block_type === 'default')
    const photoItems = block.items.filter(i => i.item_type === 'PHOTO')
    return (
      <div key={block.blockId} className="mb-4">
        <div className="grid grid-cols-2 gap-1">
          {photoItems.map(photo => (
            <div key={photo.id} className="aspect-[3/2] overflow-hidden rounded">
              <img
                src={photo.image_url || ''}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => onPhotoClick?.(photo)}
                alt={photo.caption || ''}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const topChapters = chapters.filter(c => !c.parent_id).sort((a, b) => a.order_num - b.order_num)

  if (topChapters.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-stone-400 text-sm">
        {t('story.noPhotosInChapter')}
      </div>
    )
  }

  return (
    <div className={`flex flex-col pb-8 ${darkMode ? 'bg-stone-900 text-white' : 'bg-[#F7F4F0]'}`}>
      {topChapters.map(chapter => {
        const subChapters = chapters.filter(c => c.parent_id === chapter.id).sort((a, b) => a.order_num - b.order_num)
        const blocks = blocksPerChapter[chapter.id] || []

        return (
          <div key={chapter.id} className="px-4 mt-6">
            <h2 className={`text-lg font-semibold mb-1 ${darkMode ? 'text-white' : 'text-stone-900'}`}>{chapter.title}</h2>
            {chapter.description && (
              <p className={`text-sm mb-3 ${darkMode ? 'text-stone-300' : 'text-stone-500'}`}>{chapter.description}</p>
            )}

            {blocks.map(block => renderBlock(block))}

            {subChapters.map(sub => {
              const subBlocks = blocksPerChapter[sub.id] || []
              return (
                <div key={sub.id} className="mt-4">
                  <h3 className={`text-base font-medium mb-1 ${darkMode ? 'text-stone-200' : 'text-stone-700'}`}>{sub.title}</h3>
                  {sub.description && (
                    <p className={`text-sm mb-2 ${darkMode ? 'text-stone-400' : 'text-stone-400'}`}>{sub.description}</p>
                  )}
                  {subBlocks.map(block => renderBlock(block))}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
