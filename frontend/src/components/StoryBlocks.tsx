import { useTranslation } from 'react-i18next'
import {
  DndContext,
  closestCorners,
  useSensors,
  useDroppable,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
export type { DragStartEvent }
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ── 공통 타입 ──────────────────────────────────────────────

export interface ChapterItem {
  id: string
  chapter_id: string
  order_num: number
  item_type: 'PHOTO' | 'TEXT'
  block_id: string | null
  order_in_block: number
  block_type: string        // 'default' | 'side-left' | 'side-right'
  block_layout: 'grid' | 'wide' | 'single'
  photo_id: string | null
  image_url: string | null
  caption: string | null
  text_content: string | null
}

// ── DragHandle SVG (공통) ──────────────────────────────────

function DragHandleDots({ size = 12, color = '#999' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={Math.round(size * 1.67)} viewBox="0 0 12 20" fill="none">
      <circle cx="3" cy="4" r="1.5" fill={color}/>
      <circle cx="9" cy="4" r="1.5" fill={color}/>
      <circle cx="3" cy="10" r="1.5" fill={color}/>
      <circle cx="9" cy="10" r="1.5" fill={color}/>
      <circle cx="3" cy="16" r="1.5" fill={color}/>
      <circle cx="9" cy="16" r="1.5" fill={color}/>
    </svg>
  )
}

// ── SortablePhotoChapter ────────────────────────────────────

export interface SortablePhotoChapterProps {
  id: string
  imageUrl: string | null
  chapterId: string
  caption: string | null
  onRemove: (chapterId: string, itemId: string) => void
  onClick: () => void
}

export function SortablePhotoChapter({
  id, imageUrl, chapterId, caption, onRemove, onClick
}: SortablePhotoChapterProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 'auto' as const,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex flex-col w-full h-full">
      <div className="relative group rounded overflow-hidden aspect-[3/2] shadow-sm">
        <img
          src={imageUrl || undefined}
          alt={caption || undefined}
          className="absolute inset-0 w-full h-full object-contain cursor-pointer"
          onClick={onClick}
        />
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none" />

        {/* 드래그 핸들 */}
        <div
          {...attributes}
          {...listeners}
          className="absolute top-1.5 left-1.5 p-1.5 rounded cursor-grab opacity-0 group-hover:opacity-100 transition-opacity z-20"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 3C6 3.55228 5.55228 4 5 4C4.44772 4 4 3.55228 4 3C4 2.44772 4.44772 2 5 2C5.55228 2 6 2.44772 6 3Z" fill="white"/>
            <path d="M6 8C6 8.55228 5.55228 9 5 9C4.44772 9 4 8.55228 4 8C4 7.44772 4.44772 7 5 7C5.55228 7 6 7.44772 6 8Z" fill="white"/>
            <path d="M6 13C6 13.5523 5.55228 14 5 14C4.44772 14 4 13.5523 4 13C4 12.4477 4.44772 12 5 12C5.55228 12 6 12.4477 6 13Z" fill="white"/>
            <path d="M12 3C12 3.55228 11.5523 4 11 4C10.4477 4 10 3.55228 10 3C10 2.44772 10.4477 2 11 2C11.5523 2 12 2.44772 12 3Z" fill="white"/>
            <path d="M12 8C12 8.55228 11.5523 9 11 9C10.4477 9 10 8.55228 10 8C10 7.44772 10.4477 7 11 7C11.5523 7 12 7.44772 12 8Z" fill="white"/>
            <path d="M12 13C12 13.5523 11.5523 14 11 14C10.4477 14 10 13.5523 10 13C10 12.4477 10.4477 12 11 12C11.5523 12 12 12.4477 12 13Z" fill="white"/>
          </svg>
        </div>

        {/* 삭제 버튼 */}
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(chapterId, id) }}
          className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs font-bold opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-20"
        >×</button>
      </div>

      {caption && (
        <div className="mt-2 px-1 pb-2">
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed whitespace-pre-wrap">{caption}</p>
        </div>
      )}
    </div>
  )
}

// ── SortableTextBlock ───────────────────────────────────────

export interface SortableTextBlockProps {
  id: string
  itemId: string
  chapterId: string
  text_content: string
  hasPhotoAbove: boolean
  hasPhotoBelow: boolean
  onRemove: (chapterId: string, itemId: string) => void
  onEdit: (itemId: string, currentText: string) => void
  onSideBySide: (itemId: string, position: 'side-left' | 'side-right', direction: 'above' | 'below') => void
}

export function SortableTextBlock({
  id, itemId, chapterId, text_content, hasPhotoAbove, hasPhotoBelow, onRemove, onEdit, onSideBySide
}: SortableTextBlockProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  const { t } = useTranslation()

  return (
    <div ref={setNodeRef} style={style} className="col-span-3 group relative bg-stone-50 border border-stone-200 rounded-lg px-5 py-4 my-1">
      <div
        {...attributes}
        {...listeners}
        className="absolute top-3 left-3 cursor-grab opacity-0 group-hover:opacity-40 transition-opacity"
      >
        <DragHandleDots />
      </div>

      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {hasPhotoAbove && (
          <button
            onClick={() => onSideBySide(itemId, 'side-left', 'above')}
            className="text-xs px-2 py-0.5 rounded border border-blue-200 text-blue-400 hover:text-blue-600 bg-white"
            title="위 사진과 나란히 (텍스트 왼쪽)"
          >{t('story.attachLeft')}</button>
        )}
        {hasPhotoBelow && (
          <button
            onClick={() => onSideBySide(itemId, 'side-right', 'below')}
            className="text-xs px-2 py-0.5 rounded border border-blue-200 text-blue-400 hover:text-blue-600 bg-white"
            title="아래 사진과 나란히 (텍스트 오른쪽)"
          >{t('story.attachRight')}</button>
        )}
        <button
          onClick={() => onEdit(itemId, text_content)}
          className="text-xs px-2 py-0.5 rounded border border-gray-300 text-gray-500 hover:text-gray-800 bg-white"
        >{t('common.edit')}</button>
        <button
          onClick={() => onRemove(chapterId, itemId)}
          className="text-xs px-2 py-0.5 rounded border border-red-200 text-red-400 hover:text-red-600 bg-white"
        >×</button>
      </div>

      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap pl-4">{text_content}</p>
    </div>
  )
}

// ── SortablePhotoBlock ──────────────────────────────────────

export interface SortablePhotoBlockProps {
  blockId: string
  chapterId: string
  items: ChapterItem[]
  sensors: ReturnType<typeof useSensors>
  onRemoveItem: (chapterId: string, itemId: string) => void
  onPhotoClick: (item: ChapterItem) => void
  onInnerDragEnd: (event: DragEndEvent, blockId: string, chapterId: string) => void
  onLayoutChange: (blockId: string, layout: 'grid' | 'wide' | 'single') => void
  draggingItemId: string | null
  draggingItemBlockId: string | null
}

// ── SortablePhotoBlock ──────────────────────────────────────

export interface SortablePhotoBlockProps {
  blockId: string
  chapterId: string
  items: ChapterItem[]
  sensors: ReturnType<typeof useSensors>
  onRemoveItem: (chapterId: string, itemId: string) => void
  onPhotoClick: (item: ChapterItem) => void
  onInnerDragEnd: (event: DragEndEvent, blockId: string, chapterId: string) => void
  onLayoutChange: (blockId: string, layout: 'grid' | 'wide' | 'single') => void
  draggingItemId: string | null
  draggingItemBlockId: string | null
}

// ── SortablePhotoBlock ──────────────────────────────────────

export interface SortablePhotoBlockProps {
  blockId: string
  chapterId: string
  items: ChapterItem[]
  sensors: ReturnType<typeof useSensors>
  onRemoveItem: (chapterId: string, itemId: string) => void
  onPhotoClick: (item: ChapterItem) => void
  onInnerDragEnd: (event: DragEndEvent, blockId: string, chapterId: string) => void
  onLayoutChange: (blockId: string, layout: 'grid' | 'wide' | 'single') => void
  draggingItemId: string | null
  draggingItemBlockId: string | null
}

export function SortablePhotoBlock({
  blockId, chapterId, items, sensors,
  onRemoveItem, onPhotoClick, onInnerDragEnd, onLayoutChange,
  draggingItemId, draggingItemBlockId
}: SortablePhotoBlockProps) {
  const { attributes, listeners, setNodeRef: setSortableRef, transform, transition, isDragging } = useSortable({ id: blockId })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  const { t } = useTranslation()

  // 다른 블록에서 드래그 중일 때만 드롭존 활성화
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
  const layoutLabels: Record<string, string> = { grid: t('portfolio.columnGrid'), wide: t('portfolio.columnWide'), single: t('portfolio.columnSingle') }

  return (
    <div
      ref={setRef}
      style={style}
      className={`group/block relative mb-2 rounded-lg p-3 border transition-colors ${
        isOver && isExternalDrag
          ? 'bg-blue-50 border-blue-300'
          : 'bg-stone-50 border-stone-200'
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute -left-5 top-1/2 -translate-y-1/2 cursor-grab opacity-0 group-hover/block:opacity-40 transition-opacity z-10 p-1"
      >
        <DragHandleDots />
      </div>

      {/* 레이아웃 툴바 */}
      <div className="absolute top-2 left-2 opacity-0 group-hover/block:opacity-100 transition-opacity z-20 flex items-center gap-1 bg-white border border-gray-200 rounded shadow-sm px-1.5 py-0.5">
        <span className="text-[10px] text-gray-400 mr-1">{t('portfolio.column')}</span>
        {(['grid', 'wide', 'single'] as const).map(l => (
          <button
            key={l}
            onClick={() => onLayoutChange(blockId, l)}
            className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
              blockLayout === l ? 'bg-stone-700 text-white' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {layoutLabels[l]}
          </button>
        ))}
      </div>

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
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}

// ── SortableSideBySideBlock ─────────────────────────────────

export interface SortableSideBySideBlockProps {
  blockId: string
  chapterId: string
  items: ChapterItem[]
  onRemoveItem: (chapterId: string, itemId: string) => void
  onPhotoClick: (item: ChapterItem) => void
  onCancelSideBySide: (chapterId: string, textItemId: string) => void
  onEdit: (itemId: string, currentText: string) => void
}

export function SortableSideBySideBlock({
  blockId, chapterId, items, onRemoveItem, onPhotoClick, onCancelSideBySide, onEdit
}: SortableSideBySideBlockProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: blockId })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  const blockType = items[0]?.block_type || 'side-left'
  const photoItems = items.filter(i => i.item_type === 'PHOTO')
  const textItem = items.find(i => i.item_type === 'TEXT')

  const { t } = useTranslation()

  const photoCol = (
    <div className="flex-1 min-w-0">
      <div className="grid grid-cols-1 gap-2">
        {photoItems.map(item => (
          <div key={item.id} className="relative group rounded overflow-hidden aspect-[3/2] shadow-sm">
            <img
              src={item.image_url ?? ''}
              className="absolute inset-0 w-full h-full object-contain cursor-pointer"
              onClick={() => onPhotoClick(item)}
            />
            <button
              onClick={() => onRemoveItem(chapterId, item.id)}
              className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs font-bold opacity-0 group-hover:opacity-100 flex items-center justify-center z-10"
            >×</button>
          </div>
        ))}
      </div>
    </div>
  )

  const textCol = textItem ? (
    <div className="flex-1 min-w-0 group/text relative bg-stone-50 border border-stone-200 rounded-lg px-4 py-4">
      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
        {textItem.text_content}
      </p>
      <button
        onClick={() => onEdit(textItem.id, textItem.text_content || '')}
        className="absolute top-2 right-[52px] text-xs px-2 py-0.5 rounded border border-gray-300 text-gray-400 hover:text-gray-700 bg-white opacity-0 group-hover/text:opacity-100 transition-opacity"
      >
        {t('common.edit')}
      </button>
      <button
        onClick={() => onCancelSideBySide(chapterId, textItem.id)}
        className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded border border-gray-300 text-gray-400 hover:text-gray-700 bg-white opacity-0 group-hover/text:opacity-100 transition-opacity"
      >
        {t('story.detach')}
      </button>
    </div>
  ) : null

  return (
    <div ref={setNodeRef} style={style} className="group/block relative mb-2">
      <div
        {...attributes}
        {...listeners}
        className="absolute -left-5 top-1/2 -translate-y-1/2 cursor-grab opacity-0 group-hover/block:opacity-40 transition-opacity z-10 p-1"
      >
        <DragHandleDots />
      </div>

      <div className="flex gap-3">
        {blockType === 'side-right' ? <>{photoCol}{textCol}</> : <>{textCol}{photoCol}</>}
      </div>
    </div>
  )
}