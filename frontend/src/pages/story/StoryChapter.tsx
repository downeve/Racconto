import { useState, useRef, useCallback, memo } from 'react'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import {
  DndContext,
  DragOverlay,
  closestCenter,
} from '@dnd-kit/core'
import type { DragEndEvent, SensorDescriptor } from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  SortablePhotoBlock,
  SortableTextBlock,
  SortableSideBySideBlock,
  InsertSlot,
  type ChapterItem,
} from '../../components/StoryBlocks'
import { flushPendingTextEdit } from '../../utils/pendingTextEdit'

const API = import.meta.env.VITE_API_URL

export interface ChapterBlock {
  type: 'PHOTO' | 'TEXT' | 'SIDE'
  blockId: string
  items: ChapterItem[]
  order_num: number
}

export interface StoryChapterProps {
  chapterId: string
  blocks: ChapterBlock[]
  items: ChapterItem[]
  selectedItemIds: Set<string>
  sensors: SensorDescriptor<object>[]
  onOpenLightbox: (clickedItem: ChapterItem) => void
  setChapterPhotos: React.Dispatch<React.SetStateAction<Record<string, ChapterItem[]>>>
  fetchChapterPhotos: (chapterId: string) => Promise<void>
  onChapterChange?: (count: number) => void
  onItemToggle: (chapterId: string, itemId: string, shiftKey: boolean, metaKey: boolean) => void
  onCrossBlockMove: (chapterId: string, itemId: string, sourceBlockId: string, targetBlockId: string) => void
  showToast?: (message: string, type: 'success' | 'error' | 'warning') => void
  onRequestConfirm?: (message: string, onConfirm: () => void) => void
}

function StoryChapterComponent({
  chapterId,
  blocks,
  items,
  selectedItemIds,
  sensors,
  onOpenLightbox,
  setChapterPhotos,
  fetchChapterPhotos,
  onChapterChange,
  onItemToggle,
  onCrossBlockMove,
  showToast,
  onRequestConfirm,
}: StoryChapterProps) {
  const { t } = useTranslation()

  // 텍스트 편집 상태 (chapter-local)
  // 편집 중 텍스트 값은 EditTextArea 가 uncontrolled(DOM) 로 보유 — 여기서 추적하지 않음.
  const [editingTextItemId, setEditingTextItemId] = useState<string | null>(null)

  // 인서트 슬롯 상태 (chapter-local)
  const [insertSlotActive, setInsertSlotActive] = useState<{ chapterId: string; insertIndex: number } | null>(null)
  const [insertTextDraft, setInsertTextDraft] = useState('')

  // DnD 상태 (chapter-local)
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const [activeBlockItems, setActiveBlockItems] = useState<ChapterItem[]>([])
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null)
  const [draggingItemBlockId, setDraggingItemBlockId] = useState<string | null>(null)
  const draggingItemIdRef = useRef<string | null>(null)
  const draggingItemBlockIdRef = useRef<string | null>(null)
  const currentDragBlockIdRef = useRef<string | null>(null)

  // items ref — stale closure 방지용
  const itemsRef = useRef(items)
  itemsRef.current = items
  const blocksRef = useRef(blocks)
  blocksRef.current = blocks

  // ── 핸들러 ────────────────────────────────────────────────

  const handleCancelSideBySide = useCallback(async (textItemId: string) => {
    await axios.put(`${API}/chapters/${chapterId}/side-by-side/cancel`, {
      text_item_id: textItemId,
    })
    fetchChapterPhotos(chapterId)
  }, [chapterId, fetchChapterPhotos])

  const handleFlipColumns = useCallback(async (blockId: string) => {
    await axios.put(`${API}/chapters/${chapterId}/side-by-side/flip`, { block_id: blockId })
    fetchChapterPhotos(chapterId)
  }, [chapterId, fetchChapterPhotos])

  const performRemoveItem = useCallback(async (cid: string, itemId: string) => {
    const currentItems = itemsRef.current
    const item = currentItems.find(i => i.id === itemId)
    const blockId = item?.block_id

    await axios.delete(`${API}/chapters/${cid}/items/${itemId}`)

    if (blockId && item?.item_type === 'PHOTO') {
      const remaining = currentItems.filter(
        i => i.id !== itemId && i.block_id === blockId && i.item_type === 'PHOTO'
      )
      if (remaining.length === 0) {
        const textItem = currentItems.find(
          i => i.block_id === blockId && i.item_type === 'TEXT'
        )
        if (textItem) {
          await handleCancelSideBySide(textItem.id)
          onChapterChange?.(0)
          return
        }
      }
    }

    fetchChapterPhotos(cid)
    if (item?.item_type === 'PHOTO') onChapterChange?.(0)
  }, [handleCancelSideBySide, fetchChapterPhotos, onChapterChange])

  const handleRemoveItem = useCallback(async (cid: string, itemId: string) => {
    const currentItems = itemsRef.current
    const item = currentItems.find(i => i.id === itemId)
    if (item?.item_type === 'TEXT' && onRequestConfirm) {
      onRequestConfirm(t('story.textDeleteWarning'), () => {
        performRemoveItem(cid, itemId)
      })
      return
    }
    await performRemoveItem(cid, itemId)
  }, [performRemoveItem, onRequestConfirm, t])

  const handleSideBySide = useCallback(async (
    cid: string,
    textItemId: string,
    position: 'side-left' | 'side-right',
    direction: 'above' | 'below'
  ) => {
    const currentBlocks = blocksRef.current
    const textBlockIdx = currentBlocks.findIndex(
      b => b.type === 'TEXT' && b.items[0]?.id === textItemId
    )
    if (textBlockIdx === -1) return

    const adjacentIdx = direction === 'above' ? textBlockIdx - 1 : textBlockIdx + 1
    const adjacentBlock = currentBlocks[adjacentIdx]
    if (!adjacentBlock || adjacentBlock.type !== 'PHOTO') return

    await axios.put(`${API}/chapters/${cid}/side-by-side`, {
      text_item_id: textItemId,
      photo_block_id: adjacentBlock.blockId,
      position,
    })
    fetchChapterPhotos(cid)
  }, [fetchChapterPhotos])

  const handleSideBySideFromSlot = useCallback((cid: string, slotAfterBlockIdx: number) => {
    const currentBlocks = blocksRef.current
    const blockAbove = currentBlocks[slotAfterBlockIdx]
    const blockBelow = currentBlocks[slotAfterBlockIdx + 1]
    if (!blockAbove || !blockBelow) return

    if (blockAbove.type === 'PHOTO' && blockBelow.type === 'TEXT') {
      handleSideBySide(cid, blockBelow.items[0].id, 'side-left', 'above')
    } else if (blockAbove.type === 'TEXT' && blockBelow.type === 'PHOTO') {
      handleSideBySide(cid, blockAbove.items[0].id, 'side-right', 'below')
    }
  }, [handleSideBySide])

  const handleSlotInsertText = useCallback(async (cid: string, insertIndex: number) => {
    // 다른 텍스트 블록 편집이 열려 있으면 먼저 자동 저장
    await flushPendingTextEdit()
    setInsertSlotActive({ chapterId: cid, insertIndex })
    setInsertTextDraft('')
  }, [])

  const handleSlotSideBySide = useCallback((cid: string, insertIndex: number) => {
    handleSideBySideFromSlot(cid, insertIndex - 1)
  }, [handleSideBySideFromSlot])

  const handleBlockLayoutChange = useCallback(async (
    cid: string,
    blockId: string,
    layout: 'grid' | 'wide' | 'single'
  ) => {
    setChapterPhotos(prev => {
      const next = { ...prev }
      next[cid] = (prev[cid] || []).map(item =>
        item.block_id === blockId ? { ...item, block_layout: layout } : item
      )
      return next
    })
    await axios.put(`${API}/chapters/${cid}/blocks/${blockId}/layout`, {
      block_layout: layout,
    })
  }, [setChapterPhotos])

  const handleBlockDragEnd = useCallback((event: DragEndEvent, currentBlocks: ChapterBlock[]) => {
    const { active, over } = event
    if (!over || active.id === over.id) {
      // silent return 이라도 React 재렌더를 강제해야 useSortable 이 inline transform 을 0 으로
      // 재계산함. 그렇지 않으면 자리 비켜주던 다른 블록들의 잔여 transform 이 남아 드래그 핸들/
      // 툴바의 hover hit-test 위치가 시프트됨. (블록이 많을수록 누적 변위 가시화 — 7537bd9 참조)
      setChapterPhotos(prev => ({ ...prev }))
      return
    }

    const findBlockIndex = (dndId: string) =>
      currentBlocks.findIndex(b => b.blockId === dndId || b.items.some(item => item.id === dndId))

    const oldIndex = findBlockIndex(String(active.id))
    const newIndex = findBlockIndex(String(over.id))
    if (oldIndex === -1 || newIndex === -1) {
      setChapterPhotos(prev => ({ ...prev }))
      return
    }

    const newBlocks = arrayMove(currentBlocks, oldIndex, newIndex)
    const itemsToSync: { id: string; block_id: string | null; order_num: number; order_in_block: number }[] = []
    newBlocks.forEach((block, blockIndex) => {
      const blockOrderNum = blockIndex * 10
      block.items.forEach((item, itemIndex) => {
        itemsToSync.push({
          id: item.id,
          block_id: block.blockId,
          order_in_block: itemIndex,
          order_num: blockOrderNum,
        })
      })
    })

    setChapterPhotos(prev => {
      const currentItems = prev[chapterId] || []
      const newItems = currentItems.map(item => {
        const syncData = itemsToSync.find(i => i.id === item.id)
        if (syncData) {
          return {
            ...item,
            order_num: syncData.order_num,
            order_in_block: syncData.order_in_block,
            block_id: syncData.block_id,
          }
        }
        return item
      }).sort((a, b) =>
        a.order_num !== b.order_num ? a.order_num - b.order_num : a.order_in_block - b.order_in_block
      )
      return { ...prev, [chapterId]: newItems }
    })

    // 성공 reorder 도 silent return 과 동일한 transform 잔여 문제가 있음.
    // DragOverlay dropAnimation(250ms) 진행 동안 useSortable 의 transform 이 0 으로
    // 완전히 정리되지 않아 displaced 블록의 hit-test 가 시프트된 채 남는 케이스가 보고됨.
    // dropAnimation 종료 후 한 번 더 빈 갱신으로 강제 재렌더 → transform 재계산 보장.
    setTimeout(() => setChapterPhotos(prev => ({ ...prev })), 300)

    axios.put(`${API}/chapters/${chapterId}/items/bulk-sync`, { items: itemsToSync })
      .catch(err => console.error('블록 순서 업데이트 실패:', err))
  }, [chapterId, setChapterPhotos])

  const handleMoveBlock = useCallback((blockId: string, direction: 'up' | 'down') => {
    const currentBlocks = blocksRef.current
    const idx = currentBlocks.findIndex(b => b.blockId === blockId)
    if (idx === -1) return
    const newIdx = direction === 'up' ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= currentBlocks.length) return

    const newBlocks = arrayMove(currentBlocks, idx, newIdx)
    const itemsToSync: { id: string; block_id: string | null; order_num: number; order_in_block: number }[] = []
    newBlocks.forEach((block, blockIndex) => {
      const blockOrderNum = blockIndex * 10
      block.items.forEach((item, itemIndex) => {
        itemsToSync.push({
          id: item.id,
          block_id: block.blockId,
          order_in_block: itemIndex,
          order_num: blockOrderNum,
        })
      })
    })
    setChapterPhotos(prev => {
      const currentItems = prev[chapterId] || []
      const newItems = currentItems.map(item => {
        const syncData = itemsToSync.find(i => i.id === item.id)
        if (syncData) return { ...item, order_num: syncData.order_num, order_in_block: syncData.order_in_block }
        return item
      }).sort((a, b) => a.order_num !== b.order_num ? a.order_num - b.order_num : a.order_in_block - b.order_in_block)
      return { ...prev, [chapterId]: newItems }
    })
    axios.put(`${API}/chapters/${chapterId}/items/bulk-sync`, { items: itemsToSync })
      .catch(err => console.error('블록 순서 업데이트 실패:', err))
  }, [chapterId, setChapterPhotos])

  const handleInnerDragEnd = useCallback((event: DragEndEvent, blockId: string) => {
    const { active, over } = event
    if (!over || active.id === over.id) {
      // silent return 이라도 React 재렌더를 강제해야 useSortable 이 inline transform 을 0 으로
      // 재계산함. 그렇지 않으면 블록 안에서 자리 비켜주던 다른 사진들의 잔여 transform 이
      // 남아 자식 element(체크박스/드래그 핸들)의 위치가 시프트된 상태로 인지됨.
      // (사진이 3행 이상 많을수록 누적 변위가 커서 가시화됨)
      setChapterPhotos(prev => ({ ...prev }))
      return
    }

    const activeId = String(active.id)
    const overId = String(over.id)

    const currentItems = itemsRef.current
    const blockItems = currentItems
      .filter(i => i.block_id === blockId)
      .sort((a, b) => a.order_in_block - b.order_in_block)

    const oldIndex = blockItems.findIndex(i => i.id === activeId)
    const newIndex = blockItems.findIndex(i => i.id === overId)
    if (oldIndex === -1 || newIndex === -1) {
      // handleBlockDragEnd 의 동일 silent return 과 일관되게 transform 잔여 정리.
      setChapterPhotos(prev => ({ ...prev }))
      return
    }

    const intendedOrder = arrayMove(blockItems, oldIndex, newIndex).map(i => i.id)

    setChapterPhotos(prev => {
      const prevItems = prev[chapterId] || []
      const intendedOrderSet = new Set(intendedOrder)
      const firstBlockItemIdx = prevItems.findIndex(i => intendedOrderSet.has(i.id))
      const nonBlockItems = prevItems.filter(i => !intendedOrderSet.has(i.id))
      const reorderedItems = intendedOrder
        .flatMap(id => { const item = prevItems.find(i => i.id === id); return item ? [item] : [] })
        .map((item, idx) => ({ ...item, order_in_block: idx }))
      if (reorderedItems.length === 0) return prev
      const insertIdx = nonBlockItems.filter((_, i) => {
        const originalIdx = prevItems.findIndex(item => item.id === nonBlockItems[i].id)
        return originalIdx < firstBlockItemIdx
      }).length
      const result = [...nonBlockItems]
      result.splice(insertIdx, 0, ...reorderedItems)
      return { ...prev, [chapterId]: result }
    })

    // 블록 reorder 와 동일하게 dropAnimation 종료 후 빈 갱신으로 transform 재계산 강제.
    setTimeout(() => setChapterPhotos(prev => ({ ...prev })), 300)

    axios.put(`${API}/chapters/${chapterId}/blocks/${blockId}/reorder`, {
      block_id: blockId,
      item_ids: intendedOrder,
    }).catch(err => console.error('블록 내 순서 업데이트 실패:', err))
  }, [chapterId, setChapterPhotos])


  const handleAddTextBlockAt = useCallback(async (
    cid: string,
    insertIndex: number,
    textContent: string
  ) => {
    if (!textContent.trim()) return
    // 다른 텍스트 블록을 편집 중이라면 먼저 자동 저장
    await flushPendingTextEdit()
    try {
      const currentBlocks = blocksRef.current
      const res = await axios.post(`${API}/chapters/${cid}/texts`, { text_content: textContent })
      const newItemId = res.data?.id

      if (newItemId) {
        const reorderedBlocks = [
          ...currentBlocks.slice(0, insertIndex),
          { blockId: newItemId, items: [res.data] },
          ...currentBlocks.slice(insertIndex),
        ]
        const itemsToSync: { id: string; block_id: string | null; order_num: number; order_in_block: number }[] = []
        reorderedBlocks.forEach((block, blockIdx) => {
          block.items.forEach((item: ChapterItem, itemIdx: number) => {
            itemsToSync.push({
              id: item.id,
              block_id: block.blockId,
              order_num: blockIdx * 10,
              order_in_block: itemIdx,
            })
          })
        })
        await axios.put(`${API}/chapters/${cid}/items/bulk-sync`, { items: itemsToSync })
      }

      await fetchChapterPhotos(cid)
      setInsertSlotActive(null)
      setInsertTextDraft('')
    } catch (err) {
      console.error('텍스트 블록 추가 실패:', err)
      showToast?.(t('story.textSaveFailed'), 'error')
    }
  }, [fetchChapterPhotos, showToast, t])

  const handleSaveTextBlock = useCallback(async (overrideValue: string) => {
    // overrideValue: EditTextArea 가 textarea DOM 값을 직접 읽어 전달 (uncontrolled).
    const content = overrideValue.trim()
    if (!content || !editingTextItemId) return
    const itemId = editingTextItemId
    // 실패 시 EditTextArea 의 try/catch 가 toast 를 띄울 수 있도록 throw.
    await axios.put(`${API}/chapters/${chapterId}/texts/${itemId}`, {
      text_content: content,
    })
    // 옵티미스틱 업데이트 — fetchChapterPhotos 응답을 기다리지 않고 로컬 캐시를 즉시 새 텍스트로 갱신.
    // 그렇지 않으면 setEditingTextItemId(null) 직후 EditTextArea 가 unmount 되고 MarkdownRenderer 가
    // 아직 fetch 안 끝난 옛 text_content 로 잠깐 렌더되어 '옛 텍스트 깜빡임' 현상이 생김.
    setChapterPhotos(prev => {
      const list = prev[chapterId]
      if (!list) return prev
      return {
        ...prev,
        [chapterId]: list.map(item =>
          item.id === itemId ? { ...item, text_content: content } : item
        ),
      }
    })
    setEditingTextItemId(null)
    // 서버 응답으로 최종 정합성 보정(메타데이터 등 다른 필드 갱신용).
    fetchChapterPhotos(chapterId)
  }, [chapterId, editingTextItemId, fetchChapterPhotos, setChapterPhotos])

  // 다른 텍스트 블록 편집 진입 시 이전 편집 자동 저장(flushPendingTextEdit) 후 새 편집 시작.
  // 자동 저장 함수 등록은 EditTextArea 가 mount 동안 자기 DOM ref 기준으로 직접 수행한다.
  const handleStartEdit = useCallback(async (itemId: string) => {
    if (itemId !== editingTextItemId) {
      await flushPendingTextEdit()
    }
    setEditingTextItemId(itemId)
  }, [editingTextItemId])


  // ── 인서트 슬롯 렌더 ─────────────────────────────────────

  const renderInsertSlot = (insertIndex: number) => {
    if (insertSlotActive?.chapterId === chapterId && insertSlotActive.insertIndex === insertIndex) {
      return (
        <div
          key={`form-${insertIndex}`}
          className="my-2 px-4 py-3 bg-edit-paper border border-edit-line
                     rounded-btn shadow-[0_1px_0_rgba(0,0,0,0.04)]
                     animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <textarea
            className="w-full h-32 p-3 font-serif text-[0.9375rem] leading-[1.6]
                       bg-edit-paper border-0 border-b border-edit-line
                       focus:border-edit-ink focus:outline-none
                       resize-none placeholder:text-edit-faint
                       whitespace-pre-wrap overflow-x-hidden break-words
                       transition-colors duration-150"
            value={insertTextDraft}
            onChange={e => setInsertTextDraft(e.target.value)}
            placeholder={t('story.textBlockPlaceholder')}
            autoFocus
          />
          <div className="flex gap-2 justify-end mt-3">
            <button
              onClick={() => { setInsertSlotActive(null); setInsertTextDraft('') }}
              className="px-4 py-1.5 text-[0.75rem] tracking-[0.04em] uppercase
                         text-edit-muted hover:text-edit-ink
                         bg-transparent border border-edit-line rounded-btn
                         transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={() => handleAddTextBlockAt(chapterId, insertIndex, insertTextDraft)}
              disabled={insertTextDraft.trim().length === 0}
              className="px-4 py-1.5 text-[0.75rem] tracking-[0.04em] uppercase
                         bg-edit-ink text-edit-paper hover:bg-edit-ink/85
                         rounded-btn transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-edit-ink"
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      )
    }

    const blockAbove = blocks[insertIndex - 1]
    const blockBelow = blocks[insertIndex]
    const canSideBySide =
      (blockAbove?.type === 'PHOTO' && blockBelow?.type === 'TEXT') ||
      (blockAbove?.type === 'TEXT' && blockBelow?.type === 'PHOTO')

    return (
      <InsertSlot
        key={`slot-${chapterId}-${insertIndex}`}
        chapterId={chapterId}
        insertIndex={insertIndex}
        canSideBySide={canSideBySide}
        onInsertText={handleSlotInsertText}
        onSideBySide={canSideBySide ? handleSlotSideBySide : undefined}
      />
    )
  }

  // ── 렌더 ─────────────────────────────────────────────────

  return (
    <>
      {blocks.length === 0 && (
        <div className="py-2">
          <p className="text-sm text-gray-400 mb-2">{t('story.addPhotoGuide')}</p>
          {renderInsertSlot(0)}
        </div>
      )}

      {blocks.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={(e) => {
            const activeIdStr = String(e.active.id)
            const currentBlocks = blocksRef.current
            const currentItems = itemsRef.current
            const draggedBlock = currentBlocks.find(b => b.blockId === activeIdStr)
            if (draggedBlock) {
              setActiveBlockId(activeIdStr)
              setActiveBlockItems(draggedBlock.items)
            } else {
              const activeItem = currentItems.find(i => i.id === activeIdStr)
              if (activeItem && activeItem.item_type === 'PHOTO') {
                setDraggingItemId(activeIdStr)
                draggingItemIdRef.current = activeIdStr
                if (activeItem.block_id) {
                  setDraggingItemBlockId(activeItem.block_id)
                  draggingItemBlockIdRef.current = activeItem.block_id
                  currentDragBlockIdRef.current = activeItem.block_id
                }
              }
            }
          }}
          onDragOver={(e) => {
            const { active, over } = e
            if (!over || active.id === over.id) return
            if (!draggingItemIdRef.current) return

            const overId = String(over.id)
            let newBlockId: string | null = null
            if (overId.startsWith('drop-')) {
              newBlockId = overId.replace('drop-', '')
            } else {
              const currentItems = itemsRef.current
              const overItem = currentItems.find(i => i.id === overId)
              if (!overItem || overItem.item_type === 'TEXT') return
              newBlockId = overItem.block_id
            }

            if (!newBlockId || newBlockId === currentDragBlockIdRef.current) return
            currentDragBlockIdRef.current = newBlockId
          }}
          onDragEnd={async (e) => {
            const { active, over } = e
            const itemId = draggingItemIdRef.current
            const sourceBlockId = draggingItemBlockIdRef.current
            const finalBlockId = currentDragBlockIdRef.current

            setActiveBlockId(null)
            setActiveBlockItems([])
            setDraggingItemId(null)
            setDraggingItemBlockId(null)
            draggingItemIdRef.current = null
            draggingItemBlockIdRef.current = null
            currentDragBlockIdRef.current = null

            if (!itemId) {
              if (over) handleBlockDragEnd(e, blocksRef.current)
              return
            }
            if (!over) {
              fetchChapterPhotos(chapterId)
              return
            }

            if (finalBlockId && sourceBlockId && finalBlockId !== sourceBlockId) {
              onCrossBlockMove(chapterId, itemId, sourceBlockId, finalBlockId)
              return
            }

            const activeId = String(active.id)
            let syncChapterId: string | null = null
            let syncItems: { id: string; block_id: string | null; order_num: number; order_in_block: number }[] = []

            setChapterPhotos(prev => {
              const cid = Object.keys(prev).find(c => prev[c].some(i => i.id === activeId))
              if (!cid) return prev

              const currentItems = prev[cid]
              if (!currentItems.find(i => i.id === activeId)) return prev

              const blockOrder = new Map<string, number>()
              currentItems.forEach(item => {
                const bid = item.block_id ?? item.id
                if (!blockOrder.has(bid)) blockOrder.set(bid, item.order_num)
              })

              const sortedBlockIds = [...blockOrder.entries()]
                .sort((a, b) => a[1] - b[1])
                .map(e => e[0])

              const blockGroups = new Map<string, typeof currentItems>()
              currentItems.forEach(item => {
                const bid = item.block_id ?? item.id
                if (!blockGroups.has(bid)) blockGroups.set(bid, [])
                blockGroups.get(bid)!.push(item)
              })

              const finalItems: typeof currentItems = []
              sortedBlockIds.forEach((bid, blockIdx) => {
                const group = (blockGroups.get(bid) || [])
                  .sort((a, b) => a.order_in_block - b.order_in_block)
                group.forEach((item, itemIdx) => {
                  finalItems.push({
                    ...item,
                    order_num: blockIdx * 10,
                    order_in_block: item.item_type === 'PHOTO' ? itemIdx : 0,
                  })
                })
              })

              syncChapterId = cid
              syncItems = finalItems.map(item => ({
                id: item.id,
                block_id: item.block_id,
                order_num: item.order_num,
                order_in_block: item.order_in_block,
              }))

              return { ...prev, [cid]: finalItems }
            })

            if (syncChapterId) {
              axios.put(`${API}/chapters/${syncChapterId}/items/bulk-sync`, {
                items: syncItems,
              }).catch(err => console.error('동기화 실패:', err))
            }
          }}
        >
          <SortableContext items={blocks.map(b => b.blockId)} strategy={verticalListSortingStrategy}>
            <div className="space-y-0">
              {renderInsertSlot(0)}
              {blocks.map((block, blockIdx) => {
                const prevBlock = blocks[blockIdx - 1]
                const nextBlock = blocks[blockIdx + 1]

                const blockEl = block.type === 'SIDE' ? (
                  <SortableSideBySideBlock
                    key={block.blockId}
                    blockId={block.blockId}
                    chapterId={chapterId}
                    items={block.items}
                    onRemoveItem={handleRemoveItem}
                    onEdit={handleStartEdit}
                    onPhotoClick={(item) => onOpenLightbox(item)}
                    onLayoutChange={(_, layout) =>
                      handleBlockLayoutChange(chapterId, block.blockId, layout)
                    }
                    onCancelSideBySide={(_cid, textItemId) => handleCancelSideBySide(textItemId)}
                    onFlipColumns={() => handleFlipColumns(block.blockId)}
                    editingTextItemId={editingTextItemId}
                    onSaveText={handleSaveTextBlock}
                    onCancelEdit={() => setEditingTextItemId(null)}
                    onMoveBlock={(dir) => handleMoveBlock(block.blockId, dir)}
                    isFirst={blockIdx === 0}
                    isLast={blockIdx === blocks.length - 1}
                    showToast={showToast}
                  />
                ) : block.type === 'TEXT' ? (
                  <SortableTextBlock
                    key={block.blockId}
                    id={block.blockId}
                    itemId={block.items[0].id}
                    chapterId={chapterId}
                    text_content={block.items[0].text_content || ''}
                    hasPhotoAbove={prevBlock?.type === 'PHOTO'}
                    hasPhotoBelow={nextBlock?.type === 'PHOTO'}
                    onRemove={handleRemoveItem}
                    onEdit={handleStartEdit}
                    onSideBySide={(itemId, position, direction) =>
                      handleSideBySide(chapterId, itemId, position, direction)
                    }
                    editingTextItemId={editingTextItemId}
                    onSaveText={handleSaveTextBlock}
                    onCancelEdit={() => setEditingTextItemId(null)}
                    onMoveBlock={(dir) => handleMoveBlock(block.blockId, dir)}
                    isFirst={blockIdx === 0}
                    isLast={blockIdx === blocks.length - 1}
                    showToast={showToast}
                  />
                ) : (
                  <SortablePhotoBlock
                    key={block.blockId}
                    blockId={block.blockId}
                    chapterId={chapterId}
                    items={block.items}
                    sensors={sensors}
                    onRemoveItem={handleRemoveItem}
                    onPhotoClick={(item) => onOpenLightbox(item)}
                    onInnerDragEnd={(event, blockId) => handleInnerDragEnd(event, blockId)}
                    onLayoutChange={(_, layout) =>
                      handleBlockLayoutChange(chapterId, block.blockId, layout)
                    }
                    draggingItemId={draggingItemId}
                    draggingItemBlockId={draggingItemBlockId}
                    onMoveBlock={(dir) => handleMoveBlock(block.blockId, dir)}
                    isFirst={blockIdx === 0}
                    isLast={blockIdx === blocks.length - 1}
                    hasTextAbove={prevBlock?.type === 'TEXT'}
                    hasTextBelow={nextBlock?.type === 'TEXT'}
                    onSideBySideAbove={prevBlock?.type === 'TEXT'
                      ? () => handleSideBySide(chapterId, prevBlock.items[0].id, 'side-right', 'below')
                      : undefined}
                    onSideBySideBelow={nextBlock?.type === 'TEXT'
                      ? () => handleSideBySide(chapterId, nextBlock.items[0].id, 'side-left', 'above')
                      : undefined}
                    selectedItemIds={selectedItemIds}
                    onItemToggle={(itemId, shiftKey, metaKey) =>
                      onItemToggle(chapterId, itemId, shiftKey, metaKey)
                    }
                  />
                )

                return (
                  <div key={block.blockId}>
                    {blockEl}
                    {renderInsertSlot(blockIdx + 1)}
                  </div>
                )
              })}
            </div>
          </SortableContext>

          <DragOverlay
            dropAnimation={{ duration: 250, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}
          >
            {activeBlockId && !draggingItemId ? (
              <div className="bg-edit-paper border border-edit-line rounded-btn p-3 opacity-90 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
                <div className="grid grid-cols-3 gap-2">
                  {activeBlockItems.map(item => (
                    <div
                      key={item.id}
                      className={item.item_type === 'PHOTO'
                        ? 'aspect-[3/2] overflow-hidden bg-edit-paper-2'
                        : 'col-span-3 bg-edit-paper border border-edit-line rounded-btn px-5 py-4'}
                    >
                      {item.item_type === 'PHOTO' ? (
                        item.image_url
                          ? <img src={item.image_url} className="w-full h-full object-contain" alt="" />
                          : <div className="w-full h-full bg-edit-paper-2" />
                      ) : (
                        <p className="text-sm text-edit-ink line-clamp-3">{item.text_content}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {draggingItemId ? (() => {
              const draggedItem = itemsRef.current.find(i => i.id === draggingItemId)
              if (!draggedItem) return null
              if (draggedItem.item_type === 'TEXT') return (
                <div className="w-180 bg-edit-paper border border-edit-line rounded-btn px-5 py-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)] rotate-1 scale-105 opacity-95">
                  <p className="text-sm text-edit-ink line-clamp-3">{draggedItem.text_content}</p>
                </div>
              )
              return (
                <div className="aspect-[3/2] w-60 rounded-btn overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.06)] rotate-3 scale-105 bg-edit-paper-2 opacity-60 cursor-grabbing">
                  {draggedItem.image_url && <img src={draggedItem.image_url} className="w-full h-full object-contain" />}
                </div>
              )
            })() : null}
          </DragOverlay>
        </DndContext>
      )}
    </>
  )
}

export const StoryChapter = memo(StoryChapterComponent)
