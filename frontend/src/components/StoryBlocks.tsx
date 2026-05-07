import { useTranslation } from 'react-i18next'
// import { memo, useState, useMemo } from 'react'  // useState, useMemo: GhostFrameGrid 전용
import { memo, useRef } from 'react'
// import { computePortfolioRows } from '../utils/portfolioRows'  // GhostFrameGrid 전용
import MarkdownRenderer from './MarkdownRenderer'
import { cfUrl } from '../utils/cfImage'
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

// ── 타입 추가 ──────────────────────────────────────────────
export interface OtherBlock {
  blockId: string
  firstImageUrl: string | null
  count: number
}

// ── SortablePhotoChapter ────────────────────────────────────

export interface SortablePhotoChapterProps {
  id: string
  imageUrl: string | null
  chapterId: string
  caption: string | null
  onRemove: (chapterId: string, itemId: string) => void
  onClick: () => void
  otherBlocks: OtherBlock[]
  onRequestMove: (itemId: string) => void
  fullWidthHint?: boolean
}

export function SortablePhotoChapter({
  id, imageUrl, chapterId, caption, onRemove, onClick, onRequestMove, fullWidthHint
}: SortablePhotoChapterProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  // useState import 필요

  const { t } = useTranslation()

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 'auto' as const,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex flex-col w-full h-full">
      <div className="relative group rounded overflow-hidden aspect-[3/2] shadow">
        <img
          src={cfUrl(imageUrl, 'grid')}
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
          <DragHandleDots size={12} color="white" />
        </div>

        {/* 삭제 버튼 */}
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(chapterId, id) }}
          className="absolute top-1 right-1 bg-stone-900/70 text-white rounded w-5 h-5 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-20 hover:bg-stone-900"
          aria-label="삭제"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" strokeWidth="1.5" stroke="currentColor">
            <line x1="1" y1="1" x2="9" y2="9" />
            <line x1="9" y1="1" x2="1" y2="9" />
          </svg>
        </button>

        {/* 블록 이동 버튼 — 새 블록 슬롯이 있으므로 항상 표시 */}
        {(
          <div className="absolute bottom-1 right-1 z-20">
            <button
              onClick={(e) => { e.stopPropagation(); onRequestMove(id) }}
              className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 hover:bg-black/80 text-white rounded px-1.5 py-0.5 text-[10px] leading-tight"
              title="다른 블록으로 이동"
            >
              {t('story.toOtherBlock')}
            </button>
          </div>
        )}

        {/* 풀너비 힌트 배지 */}
        {fullWidthHint && (
          <span
            className="absolute bottom-1 left-1 z-10 inline-flex items-center gap-0.5 px-1.5 py-[3px] rounded font-mono text-[9px] tracking-wider uppercase bg-stone-900/75 text-white backdrop-blur-sm pointer-events-none"
            title="포트폴리오에서 가로 풀너비로 표시됩니다"
          >
            ↔ {t('story.row.fullWidth')}
          </span>
        )}
      </div>
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
  editingTextItemId?: string | null;
  textDraft?: string;
  onTextDraftChange?: (val: string) => void;
  onSaveText?: () => void;
  onCancelEdit?: () => void;
  onSideBySide: (itemId: string, position: 'side-left' | 'side-right', direction: 'above' | 'below') => void
  onMoveBlock?: (direction: 'up' | 'down') => void
  isFirst?: boolean
  isLast?: boolean
}

export const SortableTextBlock = memo(function SortableTextBlock({
  id, itemId, chapterId, text_content, hasPhotoAbove, hasPhotoBelow, onRemove, onEdit,
  // 인라인 편집창 추가 props
  editingTextItemId, textDraft, onTextDraftChange, onSaveText, onCancelEdit,
  onSideBySide, onMoveBlock, isFirst, isLast
}: SortableTextBlockProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  const localRef = useRef<HTMLDivElement>(null)
  const setRef = (node: HTMLDivElement | null) => { setNodeRef(node); (localRef as React.MutableRefObject<HTMLDivElement | null>).current = node }
  const scrollToSelf = () => setTimeout(() => localRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50)
  const { t } = useTranslation()

  // 현재 이 블록이 편집 중인지 확인
  const isEditing = editingTextItemId === itemId;

  return (
    <div ref={setRef} style={style} className="w-full group relative bg-stone-50 border border-stone-200 rounded-card px-5 py-4 my-1 min-w-0 overflow-x-hidden break-words">
      {isEditing ? (
        /* 👇 편집 모드일 때: 단독 텍스트 인라인 편집창 */
        <div className="flex flex-col gap-2">
          <textarea
            className="w-full h-32 p-3 text-small rounded-card border border-stone-100 focus:ring-2 focus:ring-stone-200 focus:outline-none resize-none bg-card overflow-x-hidden whitespace-pre-wrap break-words"
            value={textDraft}
            onChange={(e) => onTextDraftChange?.(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2 justify-end mt-1">
            <button 
              onClick={(e) => { e.stopPropagation(); onCancelEdit?.(); }}
              className="px-3 py-1.5 text-xs text-muted border border-stone-300 rounded bg-card hover:bg-stone-50"
            >
              {t('common.cancel')}
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onSaveText?.(); }}
              className="px-3 py-1.5 text-xs bg-ink text-card rounded hover:bg-stone-800 font-medium"
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      ) : (
        /* 👇 일반 모드: 회원님의 기존 원본 코드 100% 유지 */
        <>
          <div
            {...attributes}
            {...listeners}
            className="absolute top-3 left-3 cursor-grab opacity-0 group-hover:opacity-40 transition-opacity"
          >
            <DragHandleDots />
          </div>

          {(!isFirst || !isLast) && (
            <div className="absolute -top-1 left-6 opacity-0 group-hover:opacity-100 transition-opacity z-60 flex items-center gap-1 bg-white border border-gray-200 rounded shadow px-1.5 py-0.5">
              {!isFirst && (
                <button
                  onClick={() => { onMoveBlock?.('up'); scrollToSelf() }}
                  className="text-[10px] px-1.5 py-0.5 rounded text-gray-500 hover:bg-gray-100"
                  title="위로 이동"
                >↑</button>
              )}
              {!isLast && (
                <button
                  onClick={() => { onMoveBlock?.('down'); scrollToSelf() }}
                  className="text-[10px] px-1.5 py-0.5 rounded text-gray-500 hover:bg-gray-100"
                  title="아래로 이동"
                >↓</button>
              )}
            </div>
          )}

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

          <MarkdownRenderer content={text_content} className="pl-4" />
        </>
      )}
    </div>
  )
})

{/*
// ── GhostFrameGrid ─────────────────────────────────────────

interface GhostFrameGridProps {
  items: ChapterItem[]
  layout: 'grid' | 'wide' | 'single'
  chapterId: string
  onRemoveItem: (chapterId: string, itemId: string) => void
  onPhotoClick: (item: ChapterItem) => void
  otherBlocks: OtherBlock[]
  onRequestMove: (itemId: string) => void
}

function GhostFrameGrid({
  items, layout, chapterId, onRemoveItem, onPhotoClick, otherBlocks, onRequestMove
}: GhostFrameGridProps) {
  const { t } = useTranslation()
  const rows = useMemo(() => computePortfolioRows(items, layout), [items, layout])
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)

  return (
    <div className="flex flex-col gap-1.5">
      {rows.map(row => {
        const isHovered = hoveredRow === row.rowIdx
        const rowItems = row.itemIds.map(id => items.find(p => p.id === id)!)

        return (
          <div key={row.rowIdx}>
            <div className="font-mono text-[9px] tracking-wider uppercase mb-0.5 ml-0.5 pointer-events-none transition-colors duration-150"
              style={{ color: isHovered ? '#57534e' : '#a8a29e' }}
            >
              {row.isFullWidth ? t('story.row.fullWidth') : t('story.row.index', { n: row.rowIdx + 1 })}
            </div>

            <div
              role="group"
              aria-label={row.isFullWidth ? t('story.row.fullWidth') : t('story.row.index', { n: row.rowIdx + 1 })}
              className={`grid grid-cols-3 gap-2 p-1 rounded-sm outline-dashed outline-[1.5px] outline-offset-1 transition-[outline-color] duration-150 ${
                isHovered ? 'outline-stone-500' : 'outline-stone-300/60'
              }`}
              onMouseEnter={() => setHoveredRow(row.rowIdx)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              {row.isFullWidth ? (
                <div className="col-span-3">
                  <SortablePhotoChapter
                    id={rowItems[0].id}
                    imageUrl={rowItems[0].image_url}
                    chapterId={chapterId}
                    caption={rowItems[0].caption}
                    onRemove={onRemoveItem}
                    onClick={() => onPhotoClick(rowItems[0])}
                    otherBlocks={otherBlocks}
                    onRequestMove={onRequestMove}
                    fullWidthHint
                  />
                </div>
              ) : (
                <>
                  {rowItems.map(item => (
                    <SortablePhotoChapter
                      key={item.id}
                      id={item.id}
                      imageUrl={item.image_url}
                      chapterId={chapterId}
                      caption={item.caption}
                      onRemove={onRemoveItem}
                      onClick={() => onPhotoClick(item)}
                      otherBlocks={otherBlocks}
                      onRequestMove={onRequestMove}
                    />
                  ))}
                  {Array.from({ length: 3 - row.itemIds.length }).map((_, k) => (
                    <div key={`pad-${k}`} aria-hidden />
                  ))}
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
*/}

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
  otherBlocks: OtherBlock[]
  onRequestMove: (itemId: string, chapterId: string, sourceBlockId: string) => void
  onMoveBlock?: (direction: 'up' | 'down') => void
  isFirst?: boolean
  isLast?: boolean
  //ghostMode?: boolean
}

export const SortablePhotoBlock = memo(function SortablePhotoBlock({
  blockId, chapterId, items, sensors,
  onRemoveItem, onPhotoClick, onInnerDragEnd, onLayoutChange,
  draggingItemId, draggingItemBlockId,
  otherBlocks, onRequestMove,
  onMoveBlock, isFirst, isLast,
  //ghostMode = true,
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

  const localRef = useRef<HTMLDivElement>(null)
  const setRef = (node: HTMLDivElement | null) => {
    setSortableRef(node)
    setDropRef(node)
    ;(localRef as React.MutableRefObject<HTMLDivElement | null>).current = node
  }
  const scrollToSelf = () => setTimeout(() => localRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50)

  const blockLayout = items[0]?.block_layout || 'grid'
  const layoutLabels: Record<string, string> = { grid: t('portfolio.columnGrid'), wide: t('portfolio.columnWide'), single: t('portfolio.columnSingle') }

  //const ghostRows = useMemo(
  //  () => ghostMode ? computePortfolioRows(items, blockLayout) : [],
  //  [ghostMode, items, blockLayout]
  //)
  //const hasLastFullWidth = ghostRows.some(r => r.isFullWidth)
  //const photoCount = items.filter(i => i.item_type === 'PHOTO').length
  //const cols = colsForLayout(blockLayout)

  return (
    <div
      ref={setRef}
      style={style}
      className={`group/block relative mb-2 rounded-card p-3 border transition-[background,color,border] duration-150 ease-out ${
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

      {/* 레이아웃 아이콘 — hover 아닐 때 상시 표시 */}
      <div className="absolute top-2 left-1 opacity-100 group-hover/block:opacity-100 transition-opacity z-20 pointer-events-none">
        {blockLayout === 'grid' && (
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none" className="text-muted">
            <rect x="0" y="0" width="4.5" height="5" rx="0.8" fill="currentColor"/>
            <rect x="5.75" y="0" width="4.5" height="5" rx="0.8" fill="currentColor"/>
            <rect x="11.5" y="0" width="4.5" height="5" rx="0.8" fill="currentColor"/>
            <rect x="0" y="6.5" width="4.5" height="5" rx="0.8" fill="currentColor"/>
            <rect x="5.75" y="6.5" width="4.5" height="5" rx="0.8" fill="currentColor"/>
            <rect x="11.5" y="6.5" width="4.5" height="5" rx="0.8" fill="currentColor"/>
          </svg>
        )}
        {blockLayout === 'wide' && (
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none" className="text-muted">
            <rect x="0" y="0" width="7" height="5" rx="0.8" fill="currentColor"/>
            <rect x="8.5" y="0" width="7" height="5" rx="0.8" fill="currentColor"/>
            <rect x="0" y="6.5" width="7" height="5" rx="0.8" fill="currentColor"/>
            <rect x="8.5" y="6.5" width="7" height="5" rx="0.8" fill="currentColor"/>
          </svg>
        )}
        {blockLayout === 'single' && (
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none" className="text-muted">
            <rect x="0" y="0" width="16" height="5" rx="0.8" fill="currentColor"/>
            <rect x="0" y="6.5" width="16" height="5" rx="0.8" fill="currentColor"/>
          </svg>
        )}
      </div>

      {/* 레이아웃 툴바 — hover 시 표시 */}
      <div className="absolute -top-1 left-6 opacity-0 group-hover/block:opacity-100 transition-opacity z-20 flex items-center gap-1 bg-white border border-gray-200 rounded shadow px-1.5 py-0.5">
        {!isFirst && (
          <button
            onClick={() => { onMoveBlock?.('up'); scrollToSelf() }}
            className="text-[10px] px-1.5 py-0.5 rounded text-gray-500 hover:bg-gray-100"
            title="위로 이동"
          >↑</button>
        )}
        {!isLast && (
          <button
            onClick={() => { onMoveBlock?.('down'); scrollToSelf() }}
            className="text-[10px] px-1.5 py-0.5 rounded text-gray-500 hover:bg-gray-100"
            title="아래로 이동"
          >↓</button>
        )}
        {(!isFirst || !isLast) && <span className="text-[10px] text-stone-200 select-none">|</span>}
        <span className="text-[10px] text-faint mr-1">{t('portfolio.column')}</span>
        {(['grid', 'wide', 'single'] as const).map(l => (
          <button
            key={l}
            onClick={() => onLayoutChange(blockId, l)}
            className={`text-[10px] px-1.5 py-0.5 rounded transition-[background,color,border] duration-150 ease-out ${
              blockLayout === l ? 'bg-muted text-card' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {layoutLabels[l]}
          </button>
        ))}
        <span className="text-[10px] text-faint">{t('portfolio.layoutInPort')}</span>
        {/*
        {ghostMode && photoCount > 0 && (
          <span className="text-[10px] text-stone-400 border-l border-stone-200 pl-1.5 ml-0.5">
            {cols}열 · {photoCount}장{hasLastFullWidth ? ` · ${t('story.blockHint.lastFullWidth')}` : ''}
          </span>
        )}
        */}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={(e) => onInnerDragEnd(e, blockId, chapterId)}
      >
        <SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
          {/*
          {ghostMode ? (
            <GhostFrameGrid
              items={items}
              layout={blockLayout}
              chapterId={chapterId}
              onRemoveItem={onRemoveItem}
              onPhotoClick={onPhotoClick}
              otherBlocks={otherBlocks}
              onRequestMove={(itemId) => onRequestMove(itemId, chapterId, blockId)}
            />
          ) : (
          */}
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
  )
})

// ── SortableSideBySideBlock ─────────────────────────────────

export interface SortableSideBySideBlockProps {
  blockId: string
  chapterId: string
  items: ChapterItem[]
  onRemoveItem: (chapterId: string, itemId: string) => void
  onPhotoClick: (item: ChapterItem) => void
  onCancelSideBySide: (chapterId: string, textItemId: string) => void

  // 👇 인라인 편집을 위해 추가
  editingTextItemId?: string | null;
  textDraft?: string;
  onTextDraftChange?: (val: string) => void;
  onSaveText?: () => void;
  onCancelEdit?: () => void;

  onEdit: (itemId: string, currentText: string) => void
  onLayoutChange: (blockId: string, layout: 'grid' | 'wide' | 'single') => void
  onMoveBlock?: (direction: 'up' | 'down') => void
  isFirst?: boolean
  isLast?: boolean
}

export const SortableSideBySideBlock = memo(function SortableSideBySideBlock({
  blockId, chapterId, items, onRemoveItem, onPhotoClick, onCancelSideBySide,
  // 👇 추가된 props 구조분해 할당
  editingTextItemId, textDraft, onTextDraftChange, onSaveText, onCancelEdit,
  onEdit, onMoveBlock, isFirst, isLast
}: SortableSideBySideBlockProps) {
  const { attributes, listeners, setNodeRef: setSortableRef, transform, transition, isDragging } = useSortable({ id: blockId })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  const localRef = useRef<HTMLDivElement>(null)
  const setNodeRef = (node: HTMLDivElement | null) => {
    setSortableRef(node)
    ;(localRef as React.MutableRefObject<HTMLDivElement | null>).current = node
  }
  const scrollToSelf = () => setTimeout(() => localRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50)

  const blockType = items[0]?.block_type || 'side-left'
  const photoItems = items.filter(i => i.item_type === 'PHOTO')
  const textItem = items.find(i => i.item_type === 'TEXT')

  const { t } = useTranslation()

  const photoCol = (
  <div className="flex-1 min-w-0 relative group/photo">
    <div className="absolute -top-2 left-2 opacity-0 group-hover/photo:opacity-100 transition-opacity z-20">
    </div>
      <div className="grid grid-cols-1 gap-2">
        {photoItems.map(item => (
          <div key={item.id} className="relative group rounded overflow-hidden h-56 shadow">
            <img
              src={cfUrl(item.image_url, 'grid')}
              className="absolute inset-0 w-full h-full object-contain cursor-pointer"
              onClick={() => onPhotoClick(item)}
            />
            <button
              onClick={(e) => { e.stopPropagation(); onRemoveItem(chapterId, item.id) }}
              className="absolute top-1 right-1 bg-stone-900/70 text-white rounded w-5 h-5 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-10 hover:bg-stone-900"
              aria-label="삭제"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" strokeWidth="1.5" stroke="currentColor">
                <line x1="1" y1="1" x2="9" y2="9" />
                <line x1="9" y1="1" x2="1" y2="9" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  )

  const textCol = textItem ? (
    <div className="flex-1 min-w-0 overflow-x-hidden break-words group/text relative bg-stone-50 border border-stone-200 rounded-card px-4 py-4">
      {editingTextItemId === textItem.id ? (
        /* 👇 편집 모드일 때: 텍스트 영역만 편집창으로 전환 */
        <div className="flex flex-col gap-2">
          <textarea
            className="w-full h-32 p-2 text-small rounded border border-stone-100 focus:ring-2 focus:ring-stone-200 outline-none resize-none bg-card overflow-x-hidden whitespace-pre-wrap break-words"
            value={textDraft}
            onChange={(e) => onTextDraftChange?.(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <button 
              onClick={(e) => { e.stopPropagation(); onCancelEdit?.(); }}
              className="px-2 py-1 text-[11px] text-muted border border-stone-300 rounded bg-card hover:bg-stone-50"
            >
              {t('common.cancel')}
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onSaveText?.(); }}
              className="px-2 py-1 text-[11px] bg-stone-900 text-white rounded hover:bg-stone-800 font-medium"
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      ) : (
        /* 👇 일반 모드: 기존 텍스트 표시 */
        <>
          <MarkdownRenderer content={textItem.text_content || ''} />
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/text:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(textItem.id, textItem.text_content || '')}
              className="text-xs px-2 py-0.5 rounded border border-gray-300 text-gray-400 hover:text-gray-700 bg-white"
            >
              {t('common.edit')}
            </button>
            <button
              onClick={() => onCancelSideBySide(chapterId, textItem.id)}
              className="text-xs px-2 py-0.5 rounded border border-gray-300 text-gray-400 hover:text-gray-700 bg-white"
            >
              {t('story.detach')}
            </button>
          </div>
        </>
      )}
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

      <div className="absolute -top-1 left-6 opacity-0 group-hover/block:opacity-100 transition-opacity z-20 flex items-center gap-1 bg-white border border-gray-200 rounded shadow px-1.5 py-0.5">
        {!isFirst && (
          <button
            onClick={() => { onMoveBlock?.('up'); scrollToSelf() }}
            className="text-[10px] px-1.5 py-0.5 rounded text-gray-500 hover:bg-gray-100"
            title="위로 이동"
          >↑</button>
        )}
        {!isLast && (
          <button
            onClick={() => { onMoveBlock?.('down'); scrollToSelf() }}
            className="text-[10px] px-1.5 py-0.5 rounded text-gray-500 hover:bg-gray-100"
            title="아래로 이동"
          >↓</button>
        )}
        {(!isFirst || !isLast) && <span className="text-[10px] text-stone-200 select-none">|</span>}
        <span className="text-[10px] text-faint">{t('story.sideSingleHint')}</span>
      </div>

      <div className="flex gap-3">
        {blockType === 'side-right' ? <>{photoCol}{textCol}</> : <>{textCol}{photoCol}</>}
      </div>
    </div>
  )
})