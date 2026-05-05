import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  DndContext,
  closestCorners,
  useDroppable,
} from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import type { SortablePhotoBlockProps } from '../StoryBlocks'
import { SortablePhotoChapter } from '../StoryBlocks'

// SortablePhotoChapter is exported from StoryBlocks, use same pattern
// This tablet version always shows drag handle and layout buttons (no hover dependency)

export const TabletStoryBlock = memo(function TabletStoryBlock({
  blockId, chapterId, items, sensors,
  onRemoveItem, onPhotoClick, onInnerDragEnd, onLayoutChange,
  draggingItemId, draggingItemBlockId,
  otherBlocks, onRequestMove,
}: SortablePhotoBlockProps) {
  const { attributes, listeners, setNodeRef: setSortableRef, transform, transition, isDragging } = useSortable({ id: blockId })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  const { t } = useTranslation()

  const isExternalDrag = draggingItemId !== null && draggingItemBlockId !== blockId
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop-${blockId}`,
    disabled: !isExternalDrag,
  })

  const setRef = (node: HTMLDivElement | null) => {
    setSortableRef(node)
    setDropRef(node)
  }

  const blockLayout = items[0]?.block_layout || 'grid'
  const layoutLabels: Record<string, string> = {
    grid: t('portfolio.columnGrid'),
    wide: t('portfolio.columnWide'),
    single: t('portfolio.columnSingle'),
  }

  return (
    <div
      ref={setRef}
      style={style}
      className={`relative mb-2 rounded-card border transition-[background,color,border] duration-150 ease-out ${
        isOver && isExternalDrag ? 'bg-blue-50 border-blue-300' : 'bg-stone-50 border-stone-200'
      }`}
    >
      {/* 헤더 행: 드래그 핸들 + 레이아웃 버튼 항상 노출 */}
      <div className="flex items-center gap-2 px-3 pt-2 pb-1 border-b border-stone-100">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab p-1 text-stone-400 touch-none"
        >
          <svg width="12" height="20" viewBox="0 0 12 20" fill="none">
            <circle cx="3" cy="4" r="1.5" fill="currentColor"/>
            <circle cx="9" cy="4" r="1.5" fill="currentColor"/>
            <circle cx="3" cy="10" r="1.5" fill="currentColor"/>
            <circle cx="9" cy="10" r="1.5" fill="currentColor"/>
            <circle cx="3" cy="16" r="1.5" fill="currentColor"/>
            <circle cx="9" cy="16" r="1.5" fill="currentColor"/>
          </svg>
        </div>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded px-1.5 py-0.5">
          <span className="text-[10px] text-faint mr-1">{t('portfolio.column')}</span>
          {(['grid', 'wide', 'single'] as const).map(l => (
            <button
              key={l}
              onClick={() => onLayoutChange(blockId, l)}
              className={`min-h-[44px] px-2 text-[10px] rounded transition-colors ${
                blockLayout === l ? 'bg-muted text-card' : 'text-gray-500'
              }`}
            >
              {layoutLabels[l]}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragEnd={(e) => onInnerDragEnd(e, blockId, chapterId)}
        >
          <SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-3 gap-2">
              {items.map(item => (
                <SortablePhotoChapter
                  key={item.id}
                  id={item.id}
                  imageUrl={item.image_url}
                  chapterId={chapterId}
                  caption={item.caption}
                  onRemove={onRemoveItem}
                  onClick={() => onPhotoClick(item)}
                  otherBlocks={otherBlocks}
                  onRequestMove={(itemId) => onRequestMove(itemId, chapterId, blockId)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  )
})
