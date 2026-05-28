import { useTranslation } from 'react-i18next'
// import { memo, useState, useMemo } from 'react'  // useState, useMemo: GhostFrameGrid 전용
import { memo, useRef, useState, useEffect, useCallback } from 'react'
// import { computePortfolioRows } from '../utils/portfolioRows'  // GhostFrameGrid 전용
import { FileText, ArrowLeftRight, Check, Plus, Grid3X3, Rows3, Square, X } from 'lucide-react'
import { useHoverCapable } from '../hooks/useHoverCapable'
import MarkdownRenderer from './MarkdownRenderer'
import { cfUrl } from '../utils/cfImage'
import { setPendingTextEdit } from '../utils/pendingTextEdit'
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

// ── 텍스트 편집 공통 컴포넌트 (uncontrolled) ───────────────────
// 근본 해법: 편집 중에는 textarea DOM 을 단일 진실 소스로 삼고, 키 입력마다
// React state 로 추적하지 않는다(uncontrolled). 이로써 controlled value + 한국어
// IME composition 사이의 race ('두 번째 클릭해야 저장' / 커서 점프 / 긴 한글 입력 끊김)가
// 구조적으로 사라진다. 저장은 항상 ref.current.value 를 읽어 부모에 전달.
// 다른 블록 편집·새 챕터/텍스트 추가 등 다른 진입점에서는 flushPendingTextEdit 로
// 직전 편집을 자동 저장하므로, 이 컴포넌트가 mount 동안 자기 ref 를 읽는 저장 함수를
// 레지스트리에 등록한다.

interface EditTextAreaProps {
  /** 편집 시작 시점의 초기값. uncontrolled 이므로 mount 후 변경은 반영되지 않음. */
  defaultValue: string
  onCancel: () => void
  /** 저장 핸들러. textarea DOM 값을 직접 읽어 overrideValue 로 전달. */
  onSave: (overrideValue: string) => void | Promise<void>
  cancelLabel: string
  saveLabel: string
  padding?: string
}

function EditTextArea({ defaultValue, onCancel, onSave, cancelLabel, saveLabel, padding = 'p-3' }: EditTextAreaProps) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)         // 동기 중복 저장 방지(state 는 async 라 별도 ref)
  const isComposingRef = useRef(false)    // IME 조합 진행 중 여부 (flush 경로에서 사용)

  // 최신 onSave 를 flush/저장 시점에 읽기 위한 ref (closure 고정 방지)
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave

  // 전달된 값을 저장하는 단일 실행기.
  const runSaveWith = useCallback(async (raw: string) => {
    if (savingRef.current) return
    const v = raw.trim()
    if (!v) return
    savingRef.current = true
    setSaving(true)
    try { await onSaveRef.current(v) }
    finally { savingRef.current = false; setSaving(false) }
  }, [])
  const runSaveWithRef = useRef(runSaveWith)
  runSaveWithRef.current = runSaveWith

  // ⚠️ 저장 트리거는 onPointerUp 에서 호출한다.
  // Safari/WebKit 은 IME 조합 중 첫 클릭의 pointerdown/mousedown/click 을 조합 확정에 소비해
  // DOM 에 전달하지 않지만(실측 확인), pointerup/mouseup 은 정상 발화하며 그 시점엔 이미
  // compositionend 가 끝나 .value 가 확정돼 있다. 따라서 pointerup 에서 확정값을 읽으면 1회로 저장됨.
  // 키보드(Enter/Space)는 pointerup 이 없으므로 click(detail===0)에서 처리.
  const triggerSave = useCallback(() => {
    void runSaveWithRef.current(ref.current?.value ?? '')
  }, [])

  // 다른 편집/추가 진입 시(handleStartEdit·handleAddChapter 등) flushPendingTextEdit 로
  // 직전 편집을 자동 저장. 조합 중이라면 compositionend(=확정) 이후 .value 를 읽어 저장한다.
  useEffect(() => {
    setPendingTextEdit(() => new Promise<void>((resolve) => {
      const finish = async () => {
        const v = (ref.current?.value ?? '').trim()
        if (v) await onSaveRef.current(v)
        resolve()
      }
      if (isComposingRef.current && ref.current) {
        const el = ref.current
        const onEnd = () => { el.removeEventListener('compositionend', onEnd); void finish() }
        el.addEventListener('compositionend', onEnd)
        el.blur()
      } else {
        void finish()
      }
    }))
    return () => setPendingTextEdit(null)
  }, [])

  return (
    <div className="flex flex-col gap-2">
      <textarea
        ref={ref}
        className={`w-full min-h-32 ${padding} font-serif text-[0.9375rem] leading-[1.6] bg-edit-paper border-0 border-b border-edit-line focus:border-edit-ink focus:outline-none resize-none placeholder:text-edit-faint overflow-x-hidden whitespace-pre-wrap [word-break:keep-all] transition-colors duration-150`}
        onInput={e => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px' }}
        onCompositionStart={() => { isComposingRef.current = true }}
        onCompositionEnd={() => { isComposingRef.current = false }}
        defaultValue={defaultValue}
        autoFocus
      />
      <div className="flex gap-2 justify-end mt-3">
        <button
          type="button"
          // 취소도 조합 중 첫 클릭 소비를 피하려면 pointerup 사용(키보드는 click detail===0).
          onPointerUp={(e) => { e.stopPropagation(); onCancel() }}
          onClick={(e) => { if (e.detail === 0) { e.stopPropagation(); onCancel() } }}
          className="px-4 py-1.5 text-[0.75rem] tracking-[0.04em] uppercase text-edit-muted hover:text-edit-ink bg-transparent border border-edit-line rounded-[2px] transition-colors"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          disabled={saving}
          onPointerUp={(e) => { e.stopPropagation(); triggerSave() }}
          onClick={(e) => { if (e.detail === 0) { e.stopPropagation(); triggerSave() } }}
          className="px-4 py-1.5 text-[0.75rem] tracking-[0.04em] uppercase bg-edit-ink text-edit-paper hover:bg-edit-ink/85 rounded-[2px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saveLabel}
        </button>
      </div>
    </div>
  )
}

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

function DragHandleDots({ size = 12, tone = 'on-paper' }: { size?: number; tone?: 'on-paper' | 'on-photo' }) {
  const color = tone === 'on-photo' ? 'rgba(255,255,255,0.85)' : 'currentColor'
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

// ── InsertSlot ──────────────────────────────────────────────

export interface InsertSlotProps {
  chapterId: string
  insertIndex: number
  canSideBySide?: boolean
  onInsertText: (chapterId: string, insertIndex: number) => void
  onSideBySide?: (chapterId: string, insertIndex: number) => void
}

export const InsertSlot = memo(function InsertSlot({
  chapterId, insertIndex, onInsertText,
}: InsertSlotProps) {
  const [hovered, setHovered] = useState(false)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const leaveTimer = useRef<number | undefined>(undefined)
  const { t } = useTranslation()
  const isHoverEnv = useHoverCapable()

  const onEnter = useCallback(() => {
    if (leaveTimer.current) {
      window.clearTimeout(leaveTimer.current)
      leaveTimer.current = undefined
    }
    setHovered(true)
  }, [])

  const onLeave = useCallback(() => {
    if (leaveTimer.current) window.clearTimeout(leaveTimer.current)
    leaveTimer.current = window.setTimeout(() => {
      setHovered(prev => (open ? prev : false))
      leaveTimer.current = undefined
    }, 80)
  }, [open])

  // 언마운트 시 타이머 정리
  useEffect(() => () => {
    if (leaveTimer.current) window.clearTimeout(leaveTimer.current)
  }, [])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setHovered(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // non-hover 환경: 항상 보이는 작은 + 핸들
  if (!isHoverEnv) {
    return (
      <div className="relative h-6 flex items-center justify-center my-0.5">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-edit-line pointer-events-none" />
        <button
          onClick={() => onInsertText(chapterId, insertIndex)}
          className="relative z-block-handle h-6 w-6 rounded-full bg-edit-paper border border-edit-line text-edit-muted shadow-sm flex items-center justify-center"
          aria-label={t('story.insertText')}
        >
          <Plus size={14} strokeWidth={1.5} />
        </button>
      </div>
    )
  }

  const active = hovered || open

  // hover 환경: 시각 간격 4px, hit-zone을 위·아래 10px씩 확장해 총 24px
  return (
    <div
      ref={ref}
      className="relative h-2 my-0.5"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {/* 1) 투명 hit-zone — 컨테이너 위·아래 10px 확장 (총 24px) */}
      <div className="absolute inset-x-0 -top-2.5 -bottom-2.5 z-0" aria-hidden="true" />

      {/* 2) hairline — 컨테이너 가운데, opacity로만 토글 */}
      <div
        className={`absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-edit-line
                    pointer-events-none transition-opacity duration-150
                    ${active ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* 3) 버튼 — absolute로 띄워 레이아웃에 영향 없음 */}
      <button
        onClick={() => { onInsertText(chapterId, insertIndex); setOpen(false); setHovered(false) }}
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                    z-block-handle h-6 px-2 rounded-btn bg-edit-paper border border-edit-line
                    text-edit-muted hover:text-edit-ink hover:border-edit-line-strong
                    shadow-sm text-sm leading-none flex items-center gap-1
                    transition-[opacity,transform] duration-150 ease-out origin-center
                    ${active
                      ? 'opacity-100 scale-y-100 pointer-events-auto'
                      : 'opacity-0 scale-y-50 pointer-events-none'}`}
        aria-label={t('story.insertText')}
        tabIndex={active ? 0 : -1}
      >
        <FileText size={13} strokeWidth={1.5} />
        {t('story.insertText')}
      </button>

      {/* popover — open일 때만 mount (현재 side-by-side 옵션 비활성) */}
      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-popover bg-edit-paper border border-edit-line rounded-[2px] shadow-sm py-1 min-w-[160px]">
          <button
            onClick={() => { onInsertText(chapterId, insertIndex); setOpen(false); setHovered(false) }}
            className="w-full text-left px-3 py-1.5 text-sm text-edit-ink hover:bg-edit-paper-2 flex items-center gap-2"
          >
            <FileText size={13} strokeWidth={1.5} />
            {t('story.insertText')}
          </button>
        </div>
      )}
    </div>
  )
})

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
  caption: string | null
  onClick: () => void
  fullWidthHint?: boolean
  selected?: boolean
  anySelected?: boolean
  onToggleSelect?: (itemId: string, shiftKey: boolean, metaKey: boolean) => void
}

export function SortablePhotoChapter({
  id, imageUrl, caption, onClick, fullWidthHint,
  selected = false, anySelected = false, onToggleSelect
}: SortablePhotoChapterProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const { t } = useTranslation()

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 'auto' as const,
    opacity: isDragging ? 0.5 : 1,
  }

  // 다중 선택이 활성화된 상태(anySelected)에서는 이미지 클릭이 라이트박스 등
  // 다른 onClick 효과를 트리거하지 않고 선택 토글만 수행한다.
  const selectionMode = anySelected && !!onToggleSelect

  return (
    <div ref={setNodeRef} style={style} className="flex flex-col w-full h-full">
      <div className={`relative group rounded overflow-hidden aspect-[3/2] shadow transition-[box-shadow] ${
        selected ? 'ring-2 ring-white ring-offset-2 ring-offset-edit-line-strong' : ''
      }`}>
        <img
          src={cfUrl(imageUrl, 'grid')}
          alt={caption || undefined}
          className="absolute inset-0 w-full h-full object-contain cursor-pointer"
          onClick={(e) => {
            if (selectionMode) {
              onToggleSelect!(id, e.shiftKey, e.metaKey || e.ctrlKey)
            } else {
              onClick()
            }
          }}
        />
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity z-block-handle pointer-events-none
                        bg-[radial-gradient(ellipse_at_center,transparent_60%,rgba(0,0,0,0.32)_100%)]" />

        {/* 체크박스 — 선택 시 상시, 미선택 시 hover 또는 anySelected일 때 표시 */}
        {onToggleSelect && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSelect(id, e.shiftKey, e.metaKey || e.ctrlKey) }}
            className={`absolute top-1.5 left-1.5 z-30 w-5 h-5 rounded flex items-center justify-center transition-opacity ${
              selected || anySelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            } ${selected ? 'bg-white' : 'bg-black/40 border border-white/60'}`}
            aria-label={selected ? '선택 해제' : '선택'}
            tabIndex={0}
          >
            {selected && <Check size={11} strokeWidth={2.5} className="text-edit-ink" />}
          </button>
        )}

        {/* 드래그 핸들 */}
        <div
          {...attributes}
          {...listeners}
          className={`absolute left-1.5 p-1.5 rounded cursor-grab transition-opacity z-photo-controls ${
            onToggleSelect
              ? 'top-8 opacity-0 group-hover:opacity-90'
              : 'top-1.5 opacity-50 group-hover:opacity-100'
          }`}
        >
          <DragHandleDots size={12} tone="on-photo" />
        </div>


        {/* 풀너비 힌트 배지 */}
        {fullWidthHint && (
          <span
            className="absolute bottom-1 left-1 z-block-handle inline-flex items-center gap-0.5 px-1.5 py-[3px] rounded font-mono text-eyebrow tracking-wider uppercase bg-edit-ink/75 text-white backdrop-blur-sm pointer-events-none"
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
  onSaveText?: (overrideValue: string) => void | Promise<void>;
  onCancelEdit?: () => void;
  onSideBySide: (itemId: string, position: 'side-left' | 'side-right', direction: 'above' | 'below') => void
  onMoveBlock?: (direction: 'up' | 'down') => void
  isFirst?: boolean
  isLast?: boolean
}

export const SortableTextBlock = memo(function SortableTextBlock({
  id, itemId, chapterId, text_content, hasPhotoAbove, hasPhotoBelow, onRemove, onEdit,
  // 인라인 편집창 추가 props
  editingTextItemId, onSaveText, onCancelEdit,
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
    <div ref={setRef} style={style} className="w-full group relative mb-3 min-w-0 rounded-[2px] border border-edit-line/40 hover:border-edit-line-strong hover:bg-edit-paper/40 transition-[background-color,border-color] duration-150">
      {/* 드래그 핸들 — 외부 좌측 (PHOTO/SIDE 블록과 동일 위치) */}
      {!isEditing && (
        <div
          {...attributes}
          {...listeners}
          className="absolute -left-5 top-1/2 -translate-y-1/2 cursor-grab opacity-30 group-hover:opacity-100 transition-opacity z-block-handle p-1"
        >
          <DragHandleDots />
        </div>
      )}

      <div className="relative px-5 py-4 min-w-0 [overflow-x:clip] [word-break:keep-all]">
        {isEditing ? (
          <EditTextArea
            key={itemId}
            defaultValue={text_content || ''}
            onCancel={() => onCancelEdit?.()}
            onSave={(v) => onSaveText?.(v)}
            cancelLabel={t('common.cancel')}
            saveLabel={t('common.save')}
            padding="p-3"
          />
        ) : (
          <MarkdownRenderer content={text_content} className="pl-4 font-serif" />
        )}
      </div>

      {/* 호버 툴바 — inner div 뒤에 배치해야 Safari에서 [overflow-x:clip] stacking context 위에 렌더링됨 */}
      {!isEditing && (
        <div className="absolute -top-4 right-5 opacity-0 group-hover:opacity-100 transition-opacity z-modal flex items-center gap-1 bg-edit-paper border border-edit-line rounded-[2px] shadow-sm px-1.5 py-0.5">
          {!isFirst && (
            <button
              onClick={() => { onMoveBlock?.('up'); scrollToSelf() }}
              className="text-eyebrow px-2 py-1 rounded font-bold text-edit-muted hover:bg-edit-paper-2"
              title="위로 이동"
            >↑</button>
          )}
          {!isLast && (
            <button
              onClick={() => { onMoveBlock?.('down'); scrollToSelf() }}
              className="text-eyebrow px-2 py-1 rounded font-bold text-edit-muted hover:bg-edit-paper-2"
              title="아래로 이동"
            >↓</button>
          )}
          {(!isFirst || !isLast) && <span className="text-eyebrow text-edit-line select-none">|</span>}
          <button
            // 다른 블록 편집 중 이 버튼을 누르면 flush 가 현재 편집을 자동 저장.
            // onPointerUp 사용 — Safari 는 조합 중 첫 클릭의 down/click 을 소비하지만 pointerup 은 발화.
            onPointerUp={(e) => { e.stopPropagation(); onEdit(itemId, text_content) }}
            onClick={(e) => { if (e.detail === 0) { e.stopPropagation(); onEdit(itemId, text_content) } }}
            className="text-xs px-2 py-0.5 rounded text-edit-muted hover:bg-edit-paper-2"
          >{t('common.edit')}</button>
          <span className="text-eyebrow text-edit-line select-none">|</span>
          <button
            onClick={() => onRemove(chapterId, itemId)}
            className="text-xs px-2 py-0.5 rounded text-edit-danger hover:bg-edit-paper-2"
          >×</button>
          {(hasPhotoAbove || hasPhotoBelow) && <span className="text-eyebrow text-edit-line select-none">|</span>}
          {hasPhotoAbove && (
            <button
              onClick={() => onSideBySide(itemId, 'side-left', 'above')}
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-bold text-edit-accent hover:text-edit-ink hover:bg-edit-paper-2"
              title="위 사진과 나란히 (텍스트 왼쪽)"
            ><ArrowLeftRight size={10} strokeWidth={1.5} /> {t('story.attachLeft')}</button>
          )}
          {hasPhotoBelow && (
            <button
              onClick={() => onSideBySide(itemId, 'side-right', 'below')}
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-bold text-edit-accent hover:text-edit-ink hover:bg-edit-paper-2"
              title="아래 사진과 나란히 (텍스트 오른쪽)"
            ><ArrowLeftRight size={10} strokeWidth={1.5} /> {t('story.attachRight')}</button>
          )}
        </div>
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
            <div className="font-mono text-eyebrow tracking-wider uppercase mb-0.5 ml-0.5 pointer-events-none transition-colors duration-150"
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
  onMoveBlock?: (direction: 'up' | 'down') => void
  isFirst?: boolean
  isLast?: boolean
  hasTextAbove?: boolean
  hasTextBelow?: boolean
  onSideBySideAbove?: () => void
  onSideBySideBelow?: () => void
  selectedItemIds?: Set<string>
  onItemToggle?: (itemId: string, shiftKey: boolean, metaKey: boolean) => void
  //ghostMode?: boolean
}

export const SortablePhotoBlock = memo(function SortablePhotoBlock({
  blockId, chapterId, items, sensors,
  onPhotoClick, onInnerDragEnd, onLayoutChange,
  draggingItemId, draggingItemBlockId,
  onMoveBlock, isFirst, isLast,
  hasTextAbove, hasTextBelow, onSideBySideAbove, onSideBySideBelow,
  selectedItemIds, onItemToggle,
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
      className={`group/block relative mb-3 px-3 py-3 rounded-[2px]
                  transition-[background-color,border-color] duration-150
                  border border-edit-line/40 hover:bg-edit-paper/40 hover:border-edit-line-strong
                  ${isOver && isExternalDrag
                    ? 'bg-edit-drop/50 ring-1 ring-inset ring-edit-accent'
                    : ''}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute -left-5 top-1/2 -translate-y-1/2 cursor-grab opacity-30 group-hover/block:opacity-100 transition-opacity z-block-handle p-1"
      >
        <DragHandleDots />
      </div>

      {/* 레이아웃 아이콘 — 좌측 세로 스택, hover 시 표시 */}
      <div className="absolute -left-5 top-7 z-block-toolbar
                      opacity-0 group-hover/block:opacity-100 transition-opacity
                      flex flex-col gap-0.5">
        {(['grid', 'wide', 'single'] as const).map(l => {
          const Icon = l === 'grid' ? Grid3X3 : l === 'wide' ? Rows3 : Square
          return (
            <button
              key={l}
              onClick={() => onLayoutChange(blockId, l)}
              title={layoutLabels[l]}
              aria-label={layoutLabels[l]}
              className={`w-5 h-5 flex items-center justify-center rounded-[1px]
                          transition-colors focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-edit-accent ${
                blockLayout === l
                  ? 'bg-edit-ink text-edit-paper'
                  : 'text-edit-muted hover:text-edit-ink'
              }`}
            >
              <Icon size={11} strokeWidth={1.5} />
            </button>
          )
        })}
      </div>

      {/* 블록 툴바 — hover 시 표시 (위/아래 이동 + 나란히) */}
      {((!isFirst || !isLast) || hasTextAbove || hasTextBelow) && (
        <div className="absolute -top-4 right-5 opacity-0 group-hover/block:opacity-100 transition-opacity z-block-toolbar flex items-center gap-1 bg-edit-paper border border-edit-line rounded-[2px] shadow-sm px-1.5 py-0.5">
          {!isFirst && (
            <button
              onClick={() => { onMoveBlock?.('up'); scrollToSelf() }}
              className="text-eyebrow px-2 py-1 rounded font-bold text-edit-muted hover:bg-edit-paper-2 focus-visible:opacity-100"
              title="위로 이동"
            >↑</button>
          )}
          {!isLast && (
            <button
              onClick={() => { onMoveBlock?.('down'); scrollToSelf() }}
              className="text-eyebrow px-2 py-1 rounded font-bold text-edit-muted hover:bg-edit-paper-2 focus-visible:opacity-100"
              title="아래로 이동"
            >↓</button>
          )}
          {(hasTextAbove || hasTextBelow) && (
            <>
              {(!isFirst || !isLast) && <span className="text-eyebrow text-edit-line select-none">|</span>}
              {hasTextAbove && (
                <button
                  onClick={onSideBySideAbove}
                  className="text-eyebrow px-2 py-1 rounded font-bold text-edit-accent hover:text-edit-ink hover:bg-edit-paper-2 flex items-center gap-0.5 focus-visible:opacity-100"
                  title={t('story.sideBySideAbove')}
                >
                  <ArrowLeftRight size={10} strokeWidth={1.5} />↑
                </button>
              )}
              {hasTextBelow && (
                <button
                  onClick={onSideBySideBelow}
                  className="text-eyebrow px-2 py-1 rounded font-bold text-edit-accent hover:text-edit-ink hover:bg-edit-paper-2 flex items-center gap-0.5 focus-visible:opacity-100"
                  title={t('story.sideBySideBelow')}
                >
                  <ArrowLeftRight size={10} strokeWidth={1.5} />↓
                </button>
              )}
            </>
          )}
        </div>
      )}

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
                  caption={item.caption}
                  onClick={() => onPhotoClick(item)}
                  selected={selectedItemIds?.has(item.id)}
                  anySelected={selectedItemIds ? selectedItemIds.size > 0 : false}
                  onToggleSelect={onItemToggle}
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
  onSaveText?: (overrideValue: string) => void | Promise<void>;
  onCancelEdit?: () => void;

  onEdit: (itemId: string, currentText: string) => void
  onLayoutChange: (blockId: string, layout: 'grid' | 'wide' | 'single') => void
  onFlipColumns?: () => void
  onMoveBlock?: (direction: 'up' | 'down') => void
  isFirst?: boolean
  isLast?: boolean
}

export const SortableSideBySideBlock = memo(function SortableSideBySideBlock({
  blockId, chapterId, items, onRemoveItem, onPhotoClick, onCancelSideBySide,
  // 👇 추가된 props 구조분해 할당
  editingTextItemId, onSaveText, onCancelEdit,
  onEdit, onFlipColumns, onMoveBlock, isFirst, isLast
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
    <div className="absolute -top-2 left-2 opacity-0 group-hover/photo:opacity-100 transition-opacity z-photo-controls">
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
              className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-[1px]
                         bg-black/40 hover:bg-edit-danger backdrop-blur-sm
                         text-white/85 hover:text-white transition-colors
                         opacity-0 group-hover:opacity-100 z-photo-controls"
              aria-label="삭제"
            >
              <X size={12} strokeWidth={1.5} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )

  const textCol = textItem ? (
    <div className="flex-1 min-w-0 overflow-x-hidden [word-break:keep-all] group/text relative border-l-2 border-transparent hover:border-edit-line-strong hover:bg-edit-paper/50 px-4 py-4 transition-[background-color,border-color] duration-150">
      {editingTextItemId === textItem.id ? (
        /* 👇 편집 모드일 때: 텍스트 영역만 편집창으로 전환 */
        <EditTextArea
          key={textItem.id}
          defaultValue={textItem.text_content || ''}
          onCancel={() => onCancelEdit?.()}
          onSave={(v) => onSaveText?.(v)}
          cancelLabel={t('common.cancel')}
          saveLabel={t('common.save')}
          padding="p-2"
        />
      ) : (
        /* 👇 일반 모드: 기존 텍스트 표시 */
        <>
          <MarkdownRenderer content={textItem.text_content || ''} className="font-serif" />
          <div className="absolute top-4 right-2 flex gap-1 opacity-0 group-hover/text:opacity-100 transition-opacity">
            <button
              onPointerUp={(e) => { e.stopPropagation(); onEdit(textItem.id, textItem.text_content || '') }}
              onClick={(e) => { if (e.detail === 0) { e.stopPropagation(); onEdit(textItem.id, textItem.text_content || '') } }}
              className="text-xs px-2 py-0.5 rounded border border-edit-line text-edit-muted hover:text-edit-ink bg-edit-paper"
            >
              {t('common.edit')}
            </button>
          </div>
        </>
      )}
    </div>
  ) : null

  return (
    <div ref={setNodeRef} style={style} className="group/block relative mb-3 px-3 py-3 rounded-[2px] border border-edit-line/40 hover:bg-edit-paper/40 hover:border-edit-line-strong transition-[background-color,border-color] duration-150">
      <div
        {...attributes}
        {...listeners}
        className="absolute -left-5 top-1/2 -translate-y-1/2 cursor-grab opacity-30 group-hover/block:opacity-100 transition-opacity z-block-handle p-1"
      >
        <DragHandleDots />
      </div>

      <div className="absolute -top-4 right-5 opacity-0 group-hover/block:opacity-100 transition-opacity z-block-toolbar flex items-center gap-1 bg-edit-paper border border-edit-line rounded-[2px] shadow-sm px-1.5 py-0.5">
        {!isFirst && (
          <button
            onClick={() => { onMoveBlock?.('up'); scrollToSelf() }}
            className="text-eyebrow px-2 py-1 rounded font-bold text-edit-muted hover:bg-edit-paper-2"
            title="위로 이동"
          >↑</button>
        )}
        {!isLast && (
          <button
            onClick={() => { onMoveBlock?.('down'); scrollToSelf() }}
            className="text-eyebrow px-2 py-1 rounded font-bold text-edit-muted hover:bg-edit-paper-2"
            title="아래로 이동"
          >↓</button>
        )}
        <button
          onClick={onFlipColumns}
          className="text-eyebrow px-1.5 py-1 rounded text-edit-muted hover:bg-edit-paper-2"
          title={t('story.flipColumns')}
        >
          <ArrowLeftRight size={12} strokeWidth={1.5} />
        </button>
        {textItem && (
          <button
            onClick={() => onCancelSideBySide(chapterId, textItem.id)}
            className="text-eyebrow px-2 py-1 rounded text-edit-muted hover:bg-edit-paper-2"
          >
            {t('story.detach')}
          </button>
        )}
      </div>

      <div className="flex gap-3">
        {blockType === 'side-right' ? <>{photoCol}{textCol}</> : <>{textCol}{photoCol}</>}
      </div>
    </div>
  )
})