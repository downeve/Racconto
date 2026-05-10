import { useEffect, useState, useMemo, useRef, memo, useCallback } from 'react'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { Eye, Plus, FileText, Sun, Moon, Grid3X3, Rows3, Square } from 'lucide-react'
import { cfUrl } from '../utils/cfImage'
//import { Rows3 } from 'lucide-react'
import PhotoNotePanel from '../components/PhotoNotePanel'
import { useElectronSidebar } from '../context/ElectronSidebarContext'
import ConfirmModal from '../components/ConfirmModal'
import PortfolioChapterItems, { type PortfolioChapterItem } from '../components/PortfolioChapterItems'
// import PortfolioPreview from '../components/PortfolioPreview'
import {
  SortablePhotoBlock,
  SortableTextBlock,
  SortableSideBySideBlock,
  InsertSlot,
  type ChapterItem as StoryChapterItem,
} from '../components/StoryBlocks'

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';

import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';


const API = import.meta.env.VITE_API_URL

interface Chapter {
  id: string
  project_id: string
  title: string
  description: string | null
  order_num: number
  parent_id: string | null
}

// StoryBlocks의 ChapterItem을 재export해서 파일 내에서 사용
type ChapterItem = StoryChapterItem

interface Photo {
  id: string
  image_url: string
  caption: string | null
  folder: string | null
}

interface ChapterBlock {
  type: 'PHOTO' | 'TEXT' | 'SIDE'
  blockId: string
  items: ChapterItem[]
  order_num: number
}

function groupIntoBlocks(items: ChapterItem[]): ChapterBlock[] {
  const blocks: ChapterBlock[] = []
  const blockMap = new Map<string, ChapterBlock>()

  items.forEach(item => {
    const bid = item.block_id || item.id
    const isSideBySide = item.block_type === 'side-left' || item.block_type === 'side-right'

    if (item.item_type === 'TEXT' && !isSideBySide) {
      blocks.push({ type: 'TEXT', blockId: item.id, items: [item], order_num: item.order_num })
    } else if (isSideBySide) {
      if (blockMap.has(bid)) {
        const existingBlock = blockMap.get(bid)!
        existingBlock.items.push(item)
        existingBlock.order_num = Math.min(existingBlock.order_num, item.order_num)
      } else {
        const block: ChapterBlock = { type: 'SIDE', blockId: bid, items: [item], order_num: item.order_num }
        blockMap.set(bid, block)
        blocks.push(block)
      }
    } else {
      if (blockMap.has(bid)) {
        blockMap.get(bid)!.items.push(item)
      } else {
        const block: ChapterBlock = { type: 'PHOTO', blockId: bid, items: [item], order_num: item.order_num }
        blockMap.set(bid, block)
        blocks.push(block)
      }
    }
  })

  // PHOTO 없는 SIDE 블록(사진 소프트 삭제 후 고스트) → 단독 TEXT 블록으로 변환
  return blocks.map(block => {
    if (block.type !== 'SIDE') return block
    if (block.items.some(i => i.item_type === 'PHOTO')) return block
    const textItem = block.items.find(i => i.item_type === 'TEXT')
    if (!textItem) return block
    return { type: 'TEXT' as const, blockId: textItem.id, items: [textItem], order_num: block.order_num }
  })
}

function ProjectStory({
  projectId,
  activeTab,
  allPhotos,
  chapterPhotoCount,
  onChapterChange,
}: {
  projectId: string,
  activeTab: string,
  allPhotos: Photo[],
  chapterPhotoCount: number,
  onChapterChange?: (count: number) => void,
  onPhotoUpdate?: (photoId: string, newCaption: string) => void
}) {
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [chapterPhotos, setChapterPhotos] = useState<Record<string, ChapterItem[]>>({})
  const fetchedAtCount = useRef(-1)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [showAddChapter, setShowAddChapter] = useState(false)
  const [addingSubChapterTo, setAddingSubChapterTo] = useState<string | null>(null)
  const [editingChapter, setEditingChapter] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null)

  // 기존 상태들 아래에 추가
  const [editingTextItemId, setEditingTextItemId] = useState<string | null>(null)
  const [textDraft, setTextDraft] = useState('')

  // 0-2: 인서트 슬롯 상태
  const [insertSlotActive, setInsertSlotActive] = useState<{ chapterId: string; insertIndex: number } | null>(null)
  const [insertTextDraft, setInsertTextDraft] = useState('')

  const { t } = useTranslation()

  // 라이트박스 상태
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [currentChapterPhotos, setCurrentChapterPhotos] = useState<ChapterItem[]>([]);

  // 포트폴리오 미리보기 (모달)
  const [showPreview, setShowPreview] = useState(false)
  const [previewDarkMode, setPreviewDarkMode] = useState(false)
  const [chapterPreviewId, setChapterPreviewId] = useState<string | null>(null)
  const [chapterPreviewOpen, setChapterPreviewOpen] = useState(false)

  // Ghost Frame + Preview Panel 토글 (localStorage 영속화)
  //const [ghostMode, setGhostMode] = useState<boolean>(() => {
  //  const saved = localStorage.getItem('story.ghostMode')
  //  return saved === null ? true : saved === 'true'
  //})
  // const [showPortfolioPreview, setShowPortfolioPreview] = useState(false)
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const [activeBlockItems, setActiveBlockItems] = useState<ChapterItem[]>([])

  // 0-4: 다중 선택 상태
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())
  const lastSelectedRef = useRef<{ chapterId: string; itemId: string } | null>(null)

  // 블록 간 사진 이동 드래그 state
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null)
  const [draggingItemBlockId, setDraggingItemBlockId] = useState<string | null>(null)
  // onDragEnd stale closure 방지용 ref
  const draggingItemIdRef = useRef<string | null>(null)
  const draggingItemBlockIdRef = useRef<string | null>(null)
  const currentDragBlockIdRef = useRef<string | null>(null)
  // fetchChapterPhotos 경쟁 조건 방지: 챕터별 시퀀스 번호
  const fetchSeqRef = useRef<Record<string, number>>({})

  const chapterRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const scrollToChapter = (chapterId: string) => {
    chapterRefs.current[chapterId]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const [showNotePanel, setShowNotePanel] = useState(false)
  const [collapsedChapters, setCollapsedChapters] = useState<Set<string>>(new Set())
  const { setSidebarContent } = useElectronSidebar()

  // O(N²) 성능 저하를 막기 위한 Set(해시테이블) 캐싱
  const allPhotoIds = useMemo(() => new Set(allPhotos.map(p => p.id)), [allPhotos]);

  //useEffect(() => { localStorage.setItem('story.ghostMode', String(ghostMode)) }, [ghostMode])

  const blocksPerChapter = useMemo(() => {
    const map: Record<string, ChapterBlock[]> = {}
    Object.keys(chapterPhotos).forEach(chapterId => {
      const visibleItems = (chapterPhotos[chapterId] || [])
        .filter(item =>
          item.item_type === 'TEXT' || (item.photo_id != null && allPhotoIds.has(item.photo_id))
        )
        .sort((a, b) => {
          if (a.order_num !== b.order_num) return a.order_num - b.order_num
          return a.order_in_block - b.order_in_block
        })
      map[chapterId] = groupIntoBlocks(visibleItems)
    })
    return map
  }, [chapterPhotos, allPhotoIds])

  // const allBlocksForPreview = useMemo(() => {
  //   type PreviewBlock = { blockId: string; blockLayout: 'grid'|'wide'|'single'; items: ChapterItem[]; blockType: 'PHOTO'|'TEXT'|'SIDE' }
  //   const result: PreviewBlock[] = []
  //   chapters.filter(c => !c.parent_id).forEach(ch => {
  //     ;(blocksPerChapter[ch.id] || []).forEach(b =>
  //       result.push({ blockId: b.blockId, blockLayout: b.items[0]?.block_layout || 'grid', items: b.items, blockType: b.type })
  //     )
  //     chapters.filter(c => c.parent_id === ch.id).forEach(sub => {
  //       ;(blocksPerChapter[sub.id] || []).forEach(b =>
  //         result.push({ blockId: b.blockId, blockLayout: b.items[0]?.block_layout || 'grid', items: b.items, blockType: b.type })
  //       )
  //     })
  //   })
  //   return result
  // }, [chapters, blocksPerChapter])

  // 드래그 센서
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchChapters = async (notifyParent = false) => {
    try {
      const res = await axios.get(`${API}/chapters/all-items?project_id=${projectId}`)
      setChapters(res.data.chapters)
      setChapterPhotos(res.data.items_by_chapter)
      if (notifyParent) onChapterChange?.(res.data.chapters.length)
    } catch (err) {
      console.error(err)
    }
  }
  
  const fetchChapterPhotos = useCallback(async (chapterId: string) => {
    fetchSeqRef.current[chapterId] = (fetchSeqRef.current[chapterId] ?? 0) + 1
    const seq = fetchSeqRef.current[chapterId]
    const res = await axios.get(`${API}/chapters/${chapterId}/items`)
    setChapterPhotos(prev => {
      // 더 최신 fetch 요청이 이미 있으면 이 응답은 무시
      if (fetchSeqRef.current[chapterId] !== seq) return prev
      return { ...prev, [chapterId]: res.data }
    })
  }, [])

  // 변경 후 — API 호출 없이 모달만 열고, 저장 시 생성
  //const handleAddTextBlock = (chapterId: string) => {
  //  const blocks = blocksPerChapter[chapterId] || []
  //  setInsertSlotActive({ chapterId, insertIndex: blocks.length })
  //  setInsertTextDraft('')
  //}

  // 0-2: 특정 위치에 텍스트 블록 삽입
  const handleAddTextBlockAt = async (chapterId: string, insertIndex: number, textContent: string) => {
    if (!textContent.trim()) return
    try {
      const res = await axios.post(`${API}/chapters/${chapterId}/texts`, { text_content: textContent })
      const newItemId = res.data?.id

      if (newItemId) {
        const blocks = blocksPerChapter[chapterId] || []
        const reorderedBlocks = [
          ...blocks.slice(0, insertIndex),
          { blockId: newItemId, items: [res.data] },
          ...blocks.slice(insertIndex),
        ]
        const itemsToSync: { id: string; block_id: string | null; order_num: number; order_in_block: number }[] = []
        reorderedBlocks.forEach((block, blockIdx) => {
          block.items.forEach((item: StoryChapterItem, itemIdx: number) => {
            itemsToSync.push({ id: item.id, block_id: block.blockId, order_num: blockIdx * 10, order_in_block: itemIdx })
          })
        })
        await axios.put(`${API}/chapters/${chapterId}/items/bulk-sync`, { items: itemsToSync })
      }

      await fetchChapterPhotos(chapterId)
      setInsertSlotActive(null)
      setInsertTextDraft('')
    } catch (err) {
      console.error('텍스트 블록 추가 실패:', err)
    }
  }

  const handleSaveTextBlock = async () => {
    if (!textDraft.trim() || !editingTextItemId) return

    try {
      const chapterId = Object.keys(chapterPhotos).find(cid =>
        chapterPhotos[cid].some(item => item.id === editingTextItemId)
      )
      if (!chapterId) return

      await axios.put(`${API}/chapters/${chapterId}/texts/${editingTextItemId}`, {
        text_content: textDraft
      })
      fetchChapterPhotos(chapterId)
      setEditingTextItemId(null)
      setTextDraft('')
    } catch (err) {
      console.error('텍스트 저장 중 에러:', err)
      alert('저장에 실패했습니다.')
    }
  }

  // 키보드 네비게이션 (라이트박스, 노트 패널, 미리보기)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedPhotoIndex === null || !currentChapterPhotos.length) return;

      const lastIndex = currentChapterPhotos.length - 1;

      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        if (selectedPhotoIndex < lastIndex) {
          setSelectedPhotoIndex(prev => prev! + 1);
          setShowNotePanel(false)
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        if (selectedPhotoIndex > 0) {
          setSelectedPhotoIndex(prev => prev! - 1);
          setShowNotePanel(false)
        }
      } else if (e.key === 'Escape') {
        setSelectedPhotoIndex(null); 
        setShowNotePanel(false)
        setShowPreview(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhotoIndex, currentChapterPhotos]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (chapterPreviewOpen) { closeChapterPreview(); return }
      if (showPreview) { setShowPreview(false); (document.activeElement as HTMLElement)?.blur(); return }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [chapterPreviewOpen, showPreview])

  useEffect(() => {
    if (chapterPreviewOpen) {
      const scrollY = window.scrollY
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
    } else {
      const top = document.body.style.top
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      if (top) window.scrollTo(0, parseInt(top) * -1)
    }
    return () => {
      const top = document.body.style.top
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      if (top) window.scrollTo(0, parseInt(top) * -1)
    }
  }, [chapterPreviewOpen])

  useEffect(() => {
    if (activeTab !== 'story') return
    if (fetchedAtCount.current === chapterPhotoCount) return
    fetchedAtCount.current = chapterPhotoCount
    fetchChapters()
  }, [activeTab, chapterPhotoCount, projectId])

  const handleAddChapter = async () => {
    if (!newTitle.trim()) return
    await axios.post(`${API}/chapters/`, {
      project_id: projectId,
      title: newTitle,
      description: newDesc,
      order_num: chapters.length,
      parent_id: addingSubChapterTo,
    })
    setNewTitle('')
    setNewDesc('')
    setShowAddChapter(false)
    setAddingSubChapterTo(null)
    fetchChapters(true)
  }

  const handleUpdateChapter = async (chapter: Chapter) => {
    await axios.put(`${API}/chapters/${chapter.id}`, {
      title: editTitle,
      description: editDesc,
      order_num: chapter.order_num,
      parent_id: chapter.parent_id,
      project_id: chapter.project_id,
    })
    setEditingChapter(null)
    fetchChapters(true)
  }

  const handleDeleteChapter = async (chapterId: string) => {
    setConfirmModal({
      message: t('story.chapterDeleteWarning'),
      onConfirm: async () => {
        setConfirmModal(null)
        await axios.delete(`${API}/chapters/${chapterId}`)
        fetchChapters(true)
      }
    })
  }

  const closeChapterPreview = () => {
    setChapterPreviewOpen(false)
    setTimeout(() => setChapterPreviewId(null), 300)
  }

  const handleCancelSideBySide = useCallback(async (chapterId: string, textItemId: string) => {
    await axios.put(`${API}/chapters/${chapterId}/side-by-side/cancel`, {
      text_item_id: textItemId
    })
    fetchChapterPhotos(chapterId)
  }, [fetchChapterPhotos])

  const handleRemoveItem = useCallback(async (chapterId: string, itemId: string) => {
    const item = (chapterPhotos[chapterId] || []).find(i => i.id === itemId)
    const blockId = item?.block_id

    await axios.delete(`${API}/chapters/${chapterId}/items/${itemId}`)

    // PHOTO 아이템 삭제 시에만 side-by-side 자동 해제 체크
    if (blockId && item?.item_type === 'PHOTO') {
      const remaining = (chapterPhotos[chapterId] || [])
        .filter(i => i.id !== itemId && i.block_id === blockId && i.item_type === 'PHOTO')
      if (remaining.length === 0) {
        const textItem = (chapterPhotos[chapterId] || [])
          .find(i => i.block_id === blockId && i.item_type === 'TEXT')
        if (textItem) {
          await handleCancelSideBySide(chapterId, textItem.id)
          onChapterChange?.(0)
          return
        }
      }
    }

    fetchChapterPhotos(chapterId)
    if (item?.item_type === 'PHOTO') onChapterChange?.(0)
  }, [chapterPhotos, handleCancelSideBySide, fetchChapterPhotos, onChapterChange])

  const handleSideBySide = useCallback(async (
    chapterId: string,
    textItemId: string,
    position: 'side-left' | 'side-right',
    direction: 'above' | 'below'
  ) => {
    const blocks = blocksPerChapter[chapterId] || []
    const textBlockIdx = blocks.findIndex(b =>
      b.type === 'TEXT' && b.items[0]?.id === textItemId
    )
    if (textBlockIdx === -1) return

    const adjacentIdx = direction === 'above' ? textBlockIdx - 1 : textBlockIdx + 1
    const adjacentBlock = blocks[adjacentIdx]
    if (!adjacentBlock || adjacentBlock.type !== 'PHOTO') return

    await axios.put(`${API}/chapters/${chapterId}/side-by-side`, {
      text_item_id: textItemId,
      photo_block_id: adjacentBlock.blockId,
      position
    })
    fetchChapterPhotos(chapterId)
  }, [blocksPerChapter, fetchChapterPhotos])

  // 0-3: 슬롯에서 side-by-side 연결 (slotAfterBlockIdx 뒤 슬롯 기준)
  const handleSideBySideFromSlot = useCallback((chapterId: string, slotAfterBlockIdx: number) => {
    const blocks = blocksPerChapter[chapterId] || []
    const blockAbove = blocks[slotAfterBlockIdx]
    const blockBelow = blocks[slotAfterBlockIdx + 1]
    if (!blockAbove || !blockBelow) return

    if (blockAbove.type === 'PHOTO' && blockBelow.type === 'TEXT') {
      handleSideBySide(chapterId, blockBelow.items[0].id, 'side-left', 'above')
    } else if (blockAbove.type === 'TEXT' && blockBelow.type === 'PHOTO') {
      handleSideBySide(chapterId, blockAbove.items[0].id, 'side-right', 'below')
    }
  }, [blocksPerChapter, handleSideBySide])

  const handleSlotInsertText = useCallback((chapterId: string, insertIndex: number) => {
    setInsertSlotActive({ chapterId, insertIndex })
    setInsertTextDraft('')
  }, [])

  const handleSlotSideBySide = useCallback((chapterId: string, insertIndex: number) => {
    handleSideBySideFromSlot(chapterId, insertIndex - 1)
  }, [handleSideBySideFromSlot])

  const handleBlockLayoutChange = useCallback(async (
    chapterId: string,
    blockId: string,
    layout: 'grid' | 'wide' | 'single'
  ) => {
    setChapterPhotos(prev => {
      const next = { ...prev }
      next[chapterId] = (prev[chapterId] || []).map(item =>
        item.block_id === blockId ? { ...item, block_layout: layout } : item
      )
      return next
    })
    await axios.put(`${API}/chapters/${chapterId}/blocks/${blockId}/layout`, {
      block_layout: layout
    })
  }, [])

  // 블록 간 순서 변경 (외부 DnD)
  const handleBlockDragEnd = (event: DragEndEvent, chapterId: string, blocks: ChapterBlock[]) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const findBlockIndex = (dndId: string) => {
      return blocks.findIndex(b => {
        // TEXT 블록은 blockId === item.id이므로 이 조건으로도 매칭됨
        if (b.blockId === dndId) return true;
        // 사진 위에 drop된 경우, 그 사진을 포함한 블록 찾기
        if (b.items.some(item => item.id === dndId)) return true;
        return false;
      });
    };

    // 기존 로직 다 지우고 이 두 줄로 끝!
    const oldIndex = findBlockIndex(String(active.id));
    const newIndex = findBlockIndex(String(over.id));

    if (oldIndex === -1 || newIndex === -1) return;

    const newBlocks = arrayMove(blocks, oldIndex, newIndex);
    
    // 🌟 주석으로만 있던 '블록 인덱스 * 10' 로직을 실제로 구현하여 완벽한 동기화 데이터 생성
    const itemsToSync: any[] = [];
    newBlocks.forEach((block, blockIndex) => {
      const blockOrderNum = blockIndex * 10; // 블록 단위 여유 공간 확보
      block.items.forEach((item, itemIndex) => {
        itemsToSync.push({
          id: item.id,
          block_id: block.blockId,
          order_in_block: itemIndex,
          order_num: blockOrderNum // 같은 블록의 아이템은 똑같은 order_num을 가지게 됨!
        });
      });
    });

    // 낙관적 업데이트 (서버의 정렬 기준인 order_num -> order_in_block 순서와 똑같이 정렬)
    setChapterPhotos(prev => {
      const items = prev[chapterId] || [];
      const newItems = items.map(item => {
        const syncData = itemsToSync.find(i => i.id === item.id);
        if (syncData) {
          return { ...item, order_num: syncData.order_num, order_in_block: syncData.order_in_block, block_id: syncData.block_id };
        }
        return item;
      }).sort((a, b) => {
        if (a.order_num !== b.order_num) return a.order_num - b.order_num;
        return a.order_in_block - b.order_in_block;
      });
      
      return { ...prev, [chapterId]: newItems };
    });

    // 🌟 기존의 reorder API 대신, 앞서 만든 완벽한 bulk-sync API로 통일!
    axios.put(`${API}/chapters/${chapterId}/items/bulk-sync`, {
      items: itemsToSync
    }).catch(err => console.error('블록 순서 업데이트 실패:', err));
  };

  const handleMoveBlock = (chapterId: string, blockId: string, direction: 'up' | 'down') => {
    const blocks = blocksPerChapter[chapterId] || []
    const idx = blocks.findIndex(b => b.blockId === blockId)
    if (idx === -1) return
    const newIdx = direction === 'up' ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= blocks.length) return
    // Reuse handleBlockDragEnd logic via a synthetic call
    const newBlocks = arrayMove(blocks, idx, newIdx)
    const itemsToSync: { id: string; block_id: string | null; order_num: number; order_in_block: number }[] = []
    newBlocks.forEach((block, blockIndex) => {
      const blockOrderNum = blockIndex * 10
      block.items.forEach((item, itemIndex) => {
        itemsToSync.push({ id: item.id, block_id: block.blockId, order_in_block: itemIndex, order_num: blockOrderNum })
      })
    })
    setChapterPhotos(prev => {
      const items = prev[chapterId] || []
      const newItems = items.map(item => {
        const syncData = itemsToSync.find(i => i.id === item.id)
        if (syncData) return { ...item, order_num: syncData.order_num, order_in_block: syncData.order_in_block }
        return item
      }).sort((a, b) => a.order_num !== b.order_num ? a.order_num - b.order_num : a.order_in_block - b.order_in_block)
      return { ...prev, [chapterId]: newItems }
    })
    axios.put(`${API}/chapters/${chapterId}/items/bulk-sync`, { items: itemsToSync })
      .catch(err => console.error('블록 순서 업데이트 실패:', err))
  }

  // 블록 내 사진 순서 변경 (내부 DnD)
  const handleInnerDragEnd = useCallback((event: DragEndEvent, blockId: string, chapterId: string) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeId = String(active.id)
    const overId = String(over.id)

    // 사용자가 의도한 순서를 현재 state 기준으로 계산 (API 호출용)
    const currentItems = chapterPhotos[chapterId] || []
    const blockItems = currentItems
      .filter(i => i.block_id === blockId)
      .sort((a, b) => a.order_in_block - b.order_in_block)

    const oldIndex = blockItems.findIndex(i => i.id === activeId)
    const newIndex = blockItems.findIndex(i => i.id === overId)
    if (oldIndex === -1 || newIndex === -1) return

    const intendedOrder = arrayMove(blockItems, oldIndex, newIndex).map(i => i.id)

    // 낙관적 업데이트 — prev로 최신 state를 읽어 intendedOrder 적용
    setChapterPhotos(prev => {
      const items = prev[chapterId] || []
      const intendedOrderSet = new Set(intendedOrder)
      // order_num 값이 아닌 배열 위치 기준으로 삽입 위치 결정
      const firstBlockItemIdx = items.findIndex(i => intendedOrderSet.has(i.id))
      const nonBlockItems = items.filter(i => !intendedOrderSet.has(i.id))
      const reorderedItems = intendedOrder
        .flatMap(id => {
          const item = items.find(i => i.id === id)
          return item ? [item] : []
        })
        .map((item, idx) => ({ ...item, order_in_block: idx }))
      if (reorderedItems.length === 0) return prev
      const insertIdx = nonBlockItems.filter((_, i) => {
        const originalIdx = items.findIndex(item => item.id === nonBlockItems[i].id)
        return originalIdx < firstBlockItemIdx
      }).length
      const result = [...nonBlockItems]
      result.splice(insertIdx, 0, ...reorderedItems)
      return { ...prev, [chapterId]: result }
    })

    axios.put(`${API}/chapters/${chapterId}/blocks/${blockId}/reorder`, {
      block_id: blockId,
      item_ids: intendedOrder
    }).catch(err => console.error('블록 내 순서 업데이트 실패:', err))
  }, [chapterPhotos])

  // 블록 간 사진 이동
  const handleCrossBlockDragEnd = useCallback(async (
    chapterId: string,
    itemId: string,
    sourceBlockId: string,
    targetBlockId: string
  ) => {
    // 새 블록으로 이동
    if (targetBlockId === 'new') {
      const newBlockId = crypto.randomUUID()

      setChapterPhotos(prev => {
        const all = prev[chapterId] || []
        const sourceOrderNum = all.find(i => i.id === itemId)?.order_num ?? 0
        const usedOrderNums = new Set(all.map(i => i.order_num))
        let newOrderNum = sourceOrderNum + 1
        while (usedOrderNums.has(newOrderNum)) newOrderNum++
        const sourceRemaining = all.filter(i =>
          i.block_id === sourceBlockId && i.item_type === 'PHOTO' && i.id !== itemId
        )
        const updated = all.map(i => {
          if (i.id === itemId) {
            return { ...i, block_id: newBlockId, order_in_block: 0, order_num: newOrderNum, block_layout: 'grid' as const }
          }
          const srcIdx = sourceRemaining.findIndex(s => s.id === i.id)
          if (srcIdx !== -1) return { ...i, order_in_block: srcIdx }
          return i
        })
        if (sourceRemaining.length === 0) {
          return {
            ...prev,
            [chapterId]: updated.map(i => {
              if (i.block_id === sourceBlockId && i.item_type === 'TEXT') {
                return { ...i, block_id: crypto.randomUUID(), block_type: 'default' }
              }
              return i
            })
          }
        }
        return { ...prev, [chapterId]: updated }
      })

      try {
        await axios.put(`${API}/chapters/${chapterId}/items/move-to-block`, {
          item_id: itemId,
          target_block_id: newBlockId,
        })
      } catch (err) {
        console.error('새 블록 이동 실패:', err)
        fetchChapterPhotos(chapterId)
      }
      return
    }

    // 낙관적 업데이트 — prev로 최신 state를 읽어 stale closure 방지 + order_num 갱신
    setChapterPhotos(prev => {
      const all = prev[chapterId] || []
      const prevTargetItems = all.filter(i => i.block_id === targetBlockId && i.item_type === 'PHOTO')
      const prevTargetLayout = prevTargetItems[0]?.block_layout || 'grid'
      const prevTargetOrderNum = prevTargetItems[0]?.order_num ?? (all[all.length - 1]?.order_num ?? 0)
      const prevSourceRemaining = all.filter(i =>
        i.block_id === sourceBlockId && i.item_type === 'PHOTO' && i.id !== itemId
      )

      const updated = all.map(i => {
        if (i.id === itemId) {
          return {
            ...i,
            block_id: targetBlockId,
            order_in_block: prevTargetItems.length,
            order_num: prevTargetOrderNum,
            block_layout: prevTargetLayout,
          }
        }
        const srcIdx = prevSourceRemaining.findIndex(s => s.id === i.id)
        if (srcIdx !== -1) return { ...i, order_in_block: srcIdx }
        return i
      })
      // 원래 블록이 비면 side-by-side 텍스트도 독립 처리
      if (prevSourceRemaining.length === 0) {
        return {
          ...prev,
          [chapterId]: updated.map(i => {
            if (i.block_id === sourceBlockId && i.item_type === 'TEXT') {
              return { ...i, block_id: crypto.randomUUID(), block_type: 'default' }
            }
            return i
          })
        }
      }
      return { ...prev, [chapterId]: updated }
    })

    try {
      await axios.put(`${API}/chapters/${chapterId}/items/move-to-block`, {
        item_id: itemId,
        target_block_id: targetBlockId,
      })
    } catch (err) {
      console.error('블록 간 이동 실패:', err)
      fetchChapterPhotos(chapterId)
    }
  }, [fetchChapterPhotos])

  //챕터 블록 <DndContext /> 헬퍼 함수
  const renderChapterBlocks = (targetChapterId: string) => {
  const blocks = blocksPerChapter[targetChapterId] || []

  // blocks를 순회하기 전에 각 블록의 otherBlocks 계산
  const photoBlocks = blocks.filter(b => b.type === 'PHOTO')

  const renderInsertSlot = (insertIndex: number) => {
    if (insertSlotActive?.chapterId === targetChapterId && insertSlotActive.insertIndex === insertIndex) {
      return (
        <div className="my-2 px-4 py-3 bg-edit-paper border border-edit-line
                        rounded-[2px] shadow-[0_1px_0_rgba(0,0,0,0.04)]
                        animate-in fade-in slide-in-from-top-1 duration-150" key={`form-${insertIndex}`}>
          <textarea
            className="w-full h-32 p-3 font-serif text-[0.9375rem] leading-[1.6]
                       bg-edit-paper border-0 border-b border-edit-line
                       focus:border-edit-ink focus:outline-none
                       resize-none placeholder:text-edit-faint
                       whitespace-pre-wrap overflow-x-hidden break-words
                       transition-colors duration-150"
            value={insertTextDraft}
            onChange={(e) => setInsertTextDraft(e.target.value)}
            placeholder={t('story.textBlockPlaceholder')}
            autoFocus
          />
          <div className="flex gap-2 justify-end mt-3">
            <button
              onClick={() => { setInsertSlotActive(null); setInsertTextDraft('') }}
              className="px-4 py-1.5 text-[0.75rem] tracking-[0.04em] uppercase
                         text-edit-muted hover:text-edit-ink
                         bg-transparent border border-edit-line rounded-[2px]
                         transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={() => handleAddTextBlockAt(targetChapterId, insertIndex, insertTextDraft)}
              className="px-4 py-1.5 text-[0.75rem] tracking-[0.04em] uppercase
                         bg-edit-ink text-edit-paper hover:bg-edit-ink/85
                         rounded-[2px] transition-colors"
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      )
    }

    // 슬롯 컨텍스트: 인접 블록이 PHOTO+TEXT 또는 TEXT+PHOTO 조합이면 ↔ 옵션 노출
    const blockAbove = blocks[insertIndex - 1]
    const blockBelow = blocks[insertIndex]
    const canSideBySide =
      (blockAbove?.type === 'PHOTO' && blockBelow?.type === 'TEXT') ||
      (blockAbove?.type === 'TEXT' && blockBelow?.type === 'PHOTO')

    return (
      <InsertSlot
        key={`slot-${targetChapterId}-${insertIndex}`}
        chapterId={targetChapterId}
        insertIndex={insertIndex}
        canSideBySide={canSideBySide}
        onInsertText={handleSlotInsertText}
        onSideBySide={canSideBySide ? handleSlotSideBySide : undefined}
      />
    )
  }

  return (
    <>
      {/* 빈 챕터 */}
      {blocks.length === 0 && (
        <div className="py-2">
          <p className="text-sm text-gray-400 mb-2">{t('story.addPhotoGuide')}</p>
          {renderInsertSlot(0)}
        </div>
      )}

      {/* 블록이 하나라도 있을 때만 DndContext 렌더링 */}
      {blocks.length > 0 && (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e) => {
          const activeIdStr = String(e.active.id)
          // 블록을 먼저 확인: blockId === item.id인 경우(Lightbox 단건 추가) 오인식 방지
          const draggedBlock = blocks.find(b => b.blockId === activeIdStr)
          if (draggedBlock) {
            setActiveBlockId(activeIdStr)
            setActiveBlockItems(draggedBlock.items)
          } else {
            const allItems = Object.values(chapterPhotos).flat()
            const activeItem = allItems.find(i => i.id === activeIdStr)
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
            const overItem = Object.values(chapterPhotos).flat().find(i => i.id === overId)
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
            if (over) handleBlockDragEnd(e, targetChapterId, blocks)
            return
          }
          if (!over) {
            fetchChapterPhotos(targetChapterId)
            return
          }

          if (finalBlockId && sourceBlockId && finalBlockId !== sourceBlockId) {
            handleCrossBlockDragEnd(targetChapterId, itemId, sourceBlockId, finalBlockId)
            return
          }

          const activeId = String(active.id)

          // stale closure 방지: 함수형 업데이트로 최신 state 읽기
          // onDragOver가 이미 block_id를 바꿔둔 상태에서 정확히 읽음
          let syncChapterId: string | null = null
          let syncItems: { id: string; block_id: string | null; order_num: number; order_in_block: number }[] = []

          setChapterPhotos(prev => {
            const chapterId = Object.keys(prev).find(cid => prev[cid].some(i => i.id === activeId))
            if (!chapterId) return prev

            const items = prev[chapterId]
            if (!items.find(i => i.id === activeId)) return prev

            // arrayMove 대신 블록 단위 그룹화 → order_num 기준 재정렬
            // TEXT 블록이 섞여 있어도 순서가 뒤바뀌지 않음
            const blockOrder = new Map<string, number>()
            items.forEach(item => {
              const bid = item.block_id ?? item.id
              if (!blockOrder.has(bid)) blockOrder.set(bid, item.order_num)
            })

            const sortedBlockIds = [...blockOrder.entries()]
              .sort((a, b) => a[1] - b[1])
              .map(e => e[0])

            const blockGroups = new Map<string, typeof items>()
            items.forEach(item => {
              const bid = item.block_id ?? item.id
              if (!blockGroups.has(bid)) blockGroups.set(bid, [])
              blockGroups.get(bid)!.push(item)
            })

            const finalItems: typeof items = []
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

            syncChapterId = chapterId
            syncItems = finalItems.map(item => ({
              id: item.id,
              block_id: item.block_id,
              order_num: item.order_num,
              order_in_block: item.order_in_block,
            }))

            return { ...prev, [chapterId]: finalItems }
          })

          if (syncChapterId) {
            axios.put(`${API}/chapters/${syncChapterId}/items/bulk-sync`, {
              items: syncItems
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
                  chapterId={targetChapterId}
                  items={block.items}
                  onRemoveItem={handleRemoveItem}
                  onEdit={(itemId, text) => { setEditingTextItemId(itemId); setTextDraft(text) }}
                  onPhotoClick={(item) => {
                    const flatPhotos = getFlattenedPhotos().filter(i => i.item_type === 'PHOTO')
                    setCurrentChapterPhotos(flatPhotos)
                    setSelectedPhotoIndex(flatPhotos.findIndex(i => i.id === item.id))
                  }}
                  onLayoutChange={(_, layout) =>
                    handleBlockLayoutChange(targetChapterId, block.blockId, layout)
                  }
                  onCancelSideBySide={handleCancelSideBySide}
                  editingTextItemId={editingTextItemId}
                  textDraft={textDraft}
                  onTextDraftChange={setTextDraft}
                  onSaveText={handleSaveTextBlock}
                  onCancelEdit={() => setEditingTextItemId(null)}
                  onMoveBlock={(dir) => handleMoveBlock(targetChapterId, block.blockId, dir)}
                  isFirst={blockIdx === 0}
                  isLast={blockIdx === blocks.length - 1}
                />
              ) : block.type === 'TEXT' ? (
                <SortableTextBlock
                  key={block.blockId}
                  id={block.blockId}
                  itemId={block.items[0].id}
                  chapterId={targetChapterId}
                  text_content={block.items[0].text_content || ''}
                  hasPhotoAbove={prevBlock?.type === 'PHOTO'}
                  hasPhotoBelow={nextBlock?.type === 'PHOTO'}
                  onRemove={handleRemoveItem}
                  onEdit={(itemId, text) => { setEditingTextItemId(itemId); setTextDraft(text) }}
                  onSideBySide={(itemId, position, direction) =>
                    handleSideBySide(targetChapterId, itemId, position, direction)
                  }
                  editingTextItemId={editingTextItemId}
                  textDraft={textDraft}
                  onTextDraftChange={setTextDraft}
                  onSaveText={handleSaveTextBlock}
                  onCancelEdit={() => setEditingTextItemId(null)}
                  onMoveBlock={(dir) => handleMoveBlock(targetChapterId, block.blockId, dir)}
                  isFirst={blockIdx === 0}
                  isLast={blockIdx === blocks.length - 1}
                />
              ) : (
                <SortablePhotoBlock
                  key={block.blockId}
                  blockId={block.blockId}
                  chapterId={targetChapterId}
                  items={block.items}
                  sensors={sensors}
                  onRemoveItem={handleRemoveItem}
                  onPhotoClick={(item) => {
                    const flatPhotos = getFlattenedPhotos().filter(i => i.item_type === 'PHOTO')
                    setCurrentChapterPhotos(flatPhotos)
                    setSelectedPhotoIndex(flatPhotos.findIndex(i => i.id === item.id))
                  }}
                  onInnerDragEnd={handleInnerDragEnd}
                  onLayoutChange={(_, layout) =>
                    handleBlockLayoutChange(targetChapterId, block.blockId, layout)
                  }
                  draggingItemId={draggingItemId}
                  draggingItemBlockId={draggingItemBlockId}
                  otherBlocks={photoBlocks
                    .filter(b => b.blockId !== block.blockId)
                    .map(b => ({
                      blockId: b.blockId,
                      firstImageUrl: b.items[0]?.image_url ?? null,
                      count: b.items.length,
                    }))}
                  onRequestMove={(itemId, chapterId, sourceBlockId) =>
                    setMoveModalItem({ itemId, chapterId, sourceBlockId })
                  }
                  onMoveBlock={(dir) => handleMoveBlock(targetChapterId, block.blockId, dir)}
                  isFirst={blockIdx === 0}
                  isLast={blockIdx === blocks.length - 1}
                  hasTextAbove={prevBlock?.type === 'TEXT'}
                  hasTextBelow={nextBlock?.type === 'TEXT'}
                  onSideBySideAbove={prevBlock?.type === 'TEXT'
                    ? () => handleSideBySide(targetChapterId, prevBlock.items[0].id, 'side-right', 'below')
                    : undefined}
                  onSideBySideBelow={nextBlock?.type === 'TEXT'
                    ? () => handleSideBySide(targetChapterId, nextBlock.items[0].id, 'side-left', 'above')
                    : undefined}
                  selectedItemIds={selectedItemIds}
                  onItemToggle={(itemId, shiftKey, metaKey) => handleItemToggle(targetChapterId, itemId, shiftKey, metaKey)}
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
        <DragOverlay dropAnimation={{ duration: 250, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
          {activeBlockId && !draggingItemId ? (
            <div className="bg-edit-paper border border-edit-line rounded-[2px] p-3 opacity-90 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
              <div className="grid grid-cols-3 gap-2">
                {activeBlockItems.map(item => (
                  <div key={item.id} className={item.item_type === 'PHOTO' ? "aspect-[3/2] overflow-hidden bg-edit-paper-2" : "col-span-3 bg-edit-paper border border-edit-line rounded-[2px] px-5 py-4"}>
                    {item.item_type === 'PHOTO' ? (
                      item.image_url ? <img src={item.image_url} className="w-full h-full object-contain" alt="" /> : <div className="w-full h-full bg-edit-paper-2" />
                    ) : (
                      <p className="text-sm text-edit-ink line-clamp-3">{item.text_content}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {draggingItemId ? (() => {
            const draggedItem = Object.values(chapterPhotos).flat().find(i => i.id === draggingItemId)
            if (!draggedItem) return null
            if (draggedItem.item_type === 'TEXT') return (
              <div className="w-180 bg-edit-paper border border-edit-line rounded-[2px] px-5 py-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)] rotate-1 scale-105 opacity-95">
                <p className="text-sm text-edit-ink line-clamp-3">{draggedItem.text_content}</p>
              </div>
            )
            return (
              <div className="aspect-[3/2] w-60 rounded-[2px] overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.06)] rotate-3 scale-105 bg-edit-paper-2 opacity-60 cursor-grabbing">
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

  const renderChapterActionBar = (chapterId: string) => {
    const chapterSelectedIds = (chapterPhotos[chapterId] || [])
      .filter(i => i.item_type === 'PHOTO' && selectedItemIds.has(i.id))
      .map(i => i.id)
    if (chapterSelectedIds.length === 0) return null

    const sourceBlockIds = [...new Set(
      (chapterPhotos[chapterId] || [])
        .filter(i => chapterSelectedIds.includes(i.id))
        .map(i => i.block_id)
        .filter((id): id is string => !!id)
    )]

    return (
      <div className="flex items-center gap-3 mb-4 px-3 py-2
                      bg-edit-paper-2 border border-edit-line rounded-[2px]">
        <span className="t-caption text-edit-muted flex-1">
          {t('story.selected', { count: chapterSelectedIds.length })}
        </span>
        <button
          onClick={() => setMoveModalItems({ itemIds: chapterSelectedIds, chapterId, sourceBlockIds })}
          className="t-caption text-edit-muted hover:text-edit-ink px-2 py-0.5
                     border border-edit-line rounded-[1px] hover:border-edit-line-strong
                     transition-colors duration-150"
        >
          {t('story.toOtherBlock')}
        </button>
        <button
          onClick={() => setConfirmModal({
            message: t('story.bulkDeleteConfirm', { count: chapterSelectedIds.length }),
            onConfirm: () => { handleBulkDelete(chapterId, chapterSelectedIds); setConfirmModal(null) }
          })}
          className="t-caption text-edit-danger hover:opacity-80 px-2 py-0.5 transition-opacity"
        >
          {t('common.delete')}
        </button>
        <button
          onClick={() => setSelectedItemIds(prev => {
            const next = new Set(prev)
            chapterSelectedIds.forEach(id => next.delete(id))
            return next
          })}
          className="t-caption text-edit-muted hover:text-edit-ink px-2 py-0.5 transition-colors"
        >
          {t('story.deselectAll')}
        </button>
      </div>
    )
  }

  const handleMoveChapter = async (chapterId: string, direction: 'up' | 'down') => {
      const currentChapter = chapters.find(c => c.id === chapterId)
      if (!currentChapter) return

      const siblings = chapters
        .filter(c => (c.parent_id || null) === (currentChapter.parent_id || null))
        .sort((a, b) => a.order_num - b.order_num)

      const currentIndex = siblings.findIndex(c => c.id === chapterId)
      if (currentIndex === -1) return

      if (direction === 'up' && currentIndex === 0) return
      if (direction === 'down' && currentIndex === siblings.length - 1) return

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
      
      const newSiblings = [...siblings]
      const [movedItem] = newSiblings.splice(currentIndex, 1)
      newSiblings.splice(targetIndex, 0, movedItem)

      try {
        const chapterIds = newSiblings.map(c => c.id)
        await axios.put(`${API}/chapters/reorder`, { chapter_ids: chapterIds })
        fetchChapters(true)
      } catch (error) {
        // 다국어 적용: 콘솔 에러 및 alert 메시지
        console.error(t('story.error.ReorderFailedLog'), error)
        alert(t('story.error.ReorderFailedAlert'))
      }
    }

  // 배열의 .some() 대신 O(1) 해시 검색인 .has()를 사용하여 성능 최적화
    // 변경 후 — TEXT 타입은 photo_id 없으므로 PHOTO만 필터, TEXT는 무조건 통과
    const getVisibleChapterItems = (chapterId: string) => {
      return (chapterPhotos[chapterId] || [])
        .filter(item => item.item_type === 'TEXT' || (item.photo_id != null && allPhotoIds.has(item.photo_id)))
        .sort((a, b) => a.order_num !== b.order_num ? a.order_num - b.order_num : a.order_in_block - b.order_in_block)
    };

    // 챕터(및 하위 서브챕터 포함 여부 선택)의 사진 장수 반환
    const getChapterPhotoCount = (chapterId: string, includeSubChapters = false): number => {
      const own = (chapterPhotos[chapterId] || []).filter(item =>
        item.item_type === 'PHOTO' && item.photo_id != null && allPhotoIds.has(item.photo_id)
      ).length
      if (!includeSubChapters) return own
      const subs = chapters.filter(c => c.parent_id === chapterId)
      return own + subs.reduce((sum, sub) => sum + getChapterPhotoCount(sub.id), 0)
    }

    // 1. 화면에 보이는 순서대로 모든 사진을 연결하는 함수 (수정됨)
    const getFlattenedPhotos = () => {
      let flat: ChapterItem[] = [];
      const mainChapters = chapters.filter(c => !c.parent_id); 
      
      mainChapters.forEach(mainChap => {
        flat = flat.concat(getVisibleChapterItems(mainChap.id));
        const subChapters = chapters.filter(c => c.parent_id === mainChap.id);
        subChapters.forEach(subChap => {
          flat = flat.concat(getVisibleChapterItems(subChap.id));
        });
      });
      return flat;
    };

    // 라이트박스에서 'Chapter 1.1 - 제목' 형태로 정확히 표시해 주는 함수
    const getChapterDisplayTitle = (chapterId: string) => {
      const chapter = chapters.find(c => c.id === chapterId);
      if (!chapter) return '';

      const mainChapters = chapters.filter(c => !c.parent_id);

      if (chapter.parent_id) {
        // 서브 챕터인 경우 (예: Chapter 1.1)
        const parentIndex = mainChapters.findIndex(c => c.id === chapter.parent_id);
        const subChapters = chapters.filter(c => c.parent_id === chapter.parent_id);
        const subIndex = subChapters.findIndex(c => c.id === chapterId);
        return `Ch. ${parentIndex + 1}.${subIndex + 1} - ${chapter.title}`;
      } else {
        // 최상위 챕터인 경우 (예: Ch. 1)
        const mainIndex = mainChapters.findIndex(c => c.id === chapterId);
        return `Ch. ${mainIndex + 1}. ${chapter.title}`;
      }
    };

  useEffect(() => {
    if (activeTab !== 'story') return
    setSidebarContent(
      <div className="p-3">
        {/* 챕터 추가 */}
        <button
          onClick={() => { setShowAddChapter(true); setAddingSubChapterTo(null) }}
          className="w-full mb-1.5 px-3 py-2 rounded-[1px] inline-flex justify-center items-center gap-2 text-[0.75rem] font-sans font-medium
                     border border-edit-line text-edit-muted hover:text-edit-ink hover:border-edit-line-strong
                     transition-colors duration-150"
        >
          <Plus size={13} strokeWidth={1.5} />
          <span>{t('story.addChapter')}</span>
        </button>

        {/* 미리보기 */}
        <button
          onClick={() => setShowPreview(true)}
          className="w-full mb-3 px-3 py-2 rounded-[1px] inline-flex justify-center items-center gap-2 text-[0.75rem] font-sans font-medium
                     border border-edit-line text-edit-muted hover:text-edit-ink hover:border-edit-line-strong
                     transition-colors duration-150"
        >
          <Eye size={13} strokeWidth={1.5} />
          <span>{t('story.preview')}</span>
        </button>

        <div className="mx-1 mb-3 border-t border-edit-line" />

        {/* PHOTO 블록 레이아웃 안내 */}
        <div className="px-1 mb-4">
          <p className="t-eyebrow text-edit-faint mb-2">{t('story.layoutGuide')}</p>
          <div className="flex gap-1.5">
            {([
              { icon: <Grid3X3 size={12} strokeWidth={1.5} />, key: 'portfolio.columnGrid' },
              { icon: <Rows3 size={12} strokeWidth={1.5} />, key: 'portfolio.columnWide' },
              { icon: <Square size={12} strokeWidth={1.5} />, key: 'portfolio.columnSingle' },
            ] as const).map(({ icon, key }) => (
              <div
                key={key}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2
                           border border-edit-line rounded-[1px] t-eyebrow text-edit-faint"
              >
                <span>{t(key)}</span>{icon}
              </div>
            ))}
          </div>
        </div>

        <div className="mx-1 mb-3 border-t border-edit-line" />

        {/* 챕터 목록 */}
        <div className="space-y-0.5">
          {chapters.filter(c => !c.parent_id).map((chapter, idx) => {
            const mainChapters = chapters.filter(c => !c.parent_id)
            const subChapters = chapters.filter(c => c.parent_id === chapter.id)
            const isCollapsed = collapsedChapters.has(chapter.id)
            const toggleCollapse = () => setCollapsedChapters(prev => {
              const next = new Set(prev)
              next.has(chapter.id) ? next.delete(chapter.id) : next.add(chapter.id)
              return next
            })
            return (
              <div key={chapter.id}>
                <div className="flex items-center gap-0.5 group rounded-[1px] hover:bg-edit-paper-2">
                  {subChapters.length > 0 ? (
                    <button
                      onClick={toggleCollapse}
                      aria-label={isCollapsed ? '펼치기' : '접기'}
                      className="shrink-0 pl-1 t-eyebrow text-edit-faint hover:text-edit-ink w-4"
                    >
                      {isCollapsed ? '▸' : '▾'}
                    </button>
                  ) : (
                    <span className="shrink-0 w-4" />
                  )}
                  <button
                    onClick={() => scrollToChapter(chapter.id)}
                    className="flex-1 text-left px-1 py-1 text-[0.75rem] font-sans text-edit-muted
                               group-hover:text-edit-ink truncate min-w-0
                               transition-colors duration-150"
                  >
                    <span className="truncate">
                      <span className="text-edit-faint mr-0.5">Ch. {idx + 1}.</span>{chapter.title}
                    </span>
                  </button>
                  <div className="flex items-center shrink-0 opacity-0 group-hover:opacity-100
                                  transition-opacity gap-0.5 pr-1">
                    <button
                      onClick={() => { setChapterPreviewId(chapter.id); setChapterPreviewOpen(true) }}
                      aria-label="챕터 미리보기"
                      className="p-0.5 t-eyebrow text-edit-faint hover:text-edit-ink transition-colors"
                    >
                      <Eye size={11} strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={() => handleMoveChapter(chapter.id, 'up')}
                      disabled={idx === 0}
                      aria-label="위로 이동"
                      className="px-0.5 py-0.5 t-eyebrow text-edit-faint hover:text-edit-ink
                                 disabled:opacity-20 transition-colors"
                    >↑</button>
                    <button
                      onClick={() => handleMoveChapter(chapter.id, 'down')}
                      disabled={idx === mainChapters.length - 1}
                      aria-label="아래로 이동"
                      className="px-0.5 py-0.5 t-eyebrow text-edit-faint hover:text-edit-ink
                                 disabled:opacity-20 transition-colors"
                    >↓</button>
                  </div>
                </div>
                {!isCollapsed && subChapters.length > 0 && (
                  <div className="ml-3 border-l border-edit-line pl-2 mt-0.5 space-y-0.5">
                    {subChapters.map((sub, subIdx) => (
                      <div key={sub.id} className="flex items-center gap-0.5 group rounded-[1px] hover:bg-edit-paper-2">
                        <button
                          onClick={() => scrollToChapter(sub.id)}
                          className="flex-1 text-left pl-2 py-0.5 text-[0.75rem] font-sans text-edit-faint
                                     group-hover:text-edit-muted truncate min-w-0
                                     transition-colors duration-150"
                        >
                          <span className="truncate">
                            <span className="mr-0.5">Ch. {idx + 1}.{subIdx + 1}.</span>{sub.title}
                          </span>
                        </button>
                        <div className="flex items-center shrink-0 opacity-0 group-hover:opacity-100
                                        transition-opacity gap-0.5 pr-1">
                          <button
                            onClick={() => { setChapterPreviewId(sub.id); setChapterPreviewOpen(true) }}
                            aria-label="챕터 미리보기"
                            className="p-0.5 t-eyebrow text-edit-faint hover:text-edit-ink transition-colors"
                          >
                            <Eye size={11} strokeWidth={1.5} />
                          </button>
                          <button
                            onClick={() => handleMoveChapter(sub.id, 'up')}
                            disabled={subIdx === 0}
                            aria-label="위로 이동"
                            className="px-0.5 py-0.5 t-eyebrow text-edit-faint hover:text-edit-ink
                                       disabled:opacity-20 transition-colors"
                          >↑</button>
                          <button
                            onClick={() => handleMoveChapter(sub.id, 'down')}
                            disabled={subIdx === subChapters.length - 1}
                            aria-label="아래로 이동"
                            className="px-0.5 py-0.5 t-eyebrow text-edit-faint hover:text-edit-ink
                                       disabled:opacity-20 transition-colors"
                          >↓</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }, [activeTab, chapters, collapsedChapters, t])


  // 0-4: 다중 이동 모달
  const [moveModalItems, setMoveModalItems] = useState<{
    itemIds: string[]
    chapterId: string
    sourceBlockIds: string[]
  } | null>(null)

  // 0-4: 단건 이동 (기존 DnD/이동 버튼 경로)
  const [moveModalItem, setMoveModalItem] = useState<{
    itemId: string
    chapterId: string
    sourceBlockId: string
  } | null>(null)

  // 0-4: 아이템 토글 (Shift/Meta 클릭 지원)
  const handleItemToggle = useCallback((chapterId: string, itemId: string, shiftKey: boolean, _metaKey: boolean) => {
    if (shiftKey && lastSelectedRef.current?.chapterId === chapterId) {
      // Range select: 같은 챕터 내 마지막 선택~현재 범위
      const flatOrder = (blocksPerChapter[chapterId] || [])
        .flatMap(b => b.items.filter(i => i.item_type === 'PHOTO'))
        .map(i => i.id)
      const lastIdx = flatOrder.indexOf(lastSelectedRef.current!.itemId)
      const curIdx = flatOrder.indexOf(itemId)
      if (lastIdx !== -1 && curIdx !== -1) {
        const [from, to] = [Math.min(lastIdx, curIdx), Math.max(lastIdx, curIdx)]
        const rangeIds = flatOrder.slice(from, to + 1)
        setSelectedItemIds(prev => {
          const next = new Set(prev)
          rangeIds.forEach(id => next.add(id))
          return next
        })
        return
      }
    }
    setSelectedItemIds(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) { next.delete(itemId) } else { next.add(itemId) }
      return next
    })
    lastSelectedRef.current = { chapterId, itemId }
  }, [blocksPerChapter])

  // 0-4: 일괄 이동
  const handleBulkMove = useCallback(async (
    chapterId: string,
    itemIds: string[],
    targetBlockId: string
  ) => {
    const resolvedTargetId = targetBlockId === 'new' ? crypto.randomUUID() : targetBlockId

    // 낙관적 업데이트
    setChapterPhotos(prev => {
      const all = prev[chapterId] || []
      const prevTargetItems = all.filter(i => i.block_id === resolvedTargetId && i.item_type === 'PHOTO')
      const prevTargetLayout = prevTargetItems[0]?.block_layout || 'grid'
      const prevTargetOrderNum = prevTargetItems[0]?.order_num ?? (all[all.length - 1]?.order_num ?? 0)

      const updated = all.map((item) => {
        if (!itemIds.includes(item.id)) return item
        const newIdx = prevTargetItems.length + itemIds.indexOf(item.id)
        return { ...item, block_id: resolvedTargetId, order_in_block: newIdx, order_num: prevTargetOrderNum, block_layout: prevTargetLayout }
      })
      return { ...prev, [chapterId]: updated }
    })

    setSelectedItemIds(prev => {
      const next = new Set(prev)
      itemIds.forEach(id => next.delete(id))
      return next
    })

    try {
      await Promise.all(itemIds.map(itemId =>
        axios.put(`${API}/chapters/${chapterId}/items/move-to-block`, {
          item_id: itemId,
          target_block_id: resolvedTargetId,
        })
      ))
    } catch (err) {
      console.error('일괄 이동 실패:', err)
      fetchChapterPhotos(chapterId)
    }
  }, [fetchChapterPhotos])

  // 0-4: 일괄 삭제
  const handleBulkDelete = useCallback(async (chapterId: string, itemIds: string[]) => {
    setChapterPhotos(prev => ({
      ...prev,
      [chapterId]: (prev[chapterId] || []).filter(i => !itemIds.includes(i.id))
    }))
    setSelectedItemIds(prev => {
      const next = new Set(prev)
      itemIds.forEach(id => next.delete(id))
      return next
    })
    try {
      await Promise.all(itemIds.map(itemId =>
        axios.delete(`${API}/chapters/${chapterId}/items/${itemId}`)
      ))
      onChapterChange?.(0)
    } catch (err) {
      console.error('일괄 삭제 실패:', err)
      fetchChapterPhotos(chapterId)
    }
  }, [fetchChapterPhotos, onChapterChange])

  return (
    <div className="relative flex flex-row items-start gap-6">
    
    {confirmModal && (
      <ConfirmModal
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(null)}
        dangerous
      />
    )}

    {moveModalItem && (() => {
      const blocks = blocksPerChapter[moveModalItem.chapterId] || []
      const photoBlocks = blocks.filter(b => b.type === 'PHOTO')
      const otherBlocks = photoBlocks
        .filter(b => b.blockId !== moveModalItem.sourceBlockId)
        .map(b => ({
          blockId: b.blockId,
          firstImageUrl: b.items[0]?.image_url ?? null,
          count: b.items.length,
        }))

      return (
        <ConfirmModal
          type="moveBlock"
          blocks={otherBlocks}
          onSelect={(targetBlockId) => {
            handleCrossBlockDragEnd(
              moveModalItem.chapterId,
              moveModalItem.itemId,
              moveModalItem.sourceBlockId,
              targetBlockId
            )
            setMoveModalItem(null)
          }}
          onCancel={() => setMoveModalItem(null)}
        />
      )
      })()}

    {moveModalItems && (() => {
      const blocks = blocksPerChapter[moveModalItems.chapterId] || []
      const photoBlocks = blocks.filter(b => b.type === 'PHOTO')
      const usedBlockIds = new Set(moveModalItems.sourceBlockIds)
      const otherBlocks = photoBlocks
        .filter(b => !usedBlockIds.has(b.blockId))
        .map(b => ({
          blockId: b.blockId,
          firstImageUrl: b.items[0]?.image_url ?? null,
          count: b.items.length,
        }))
      return (
        <ConfirmModal
          type="moveBlock"
          blocks={otherBlocks}
          onSelect={(targetBlockId) => {
            handleBulkMove(moveModalItems.chapterId, moveModalItems.itemIds, targetBlockId)
            setMoveModalItems(null)
          }}
          onCancel={() => setMoveModalItems(null)}
        />
      )
    })()}

      <div className="flex-1 max-w-5xl">

        {/* 챕터 추가 폼 — 사이드바 버튼 클릭 시 표시 */}
        {showAddChapter && !addingSubChapterTo && (
          <div className="bg-edit-paper border border-edit-line rounded-[2px] p-5 mb-8">
            <input
              className="w-full px-3 py-2 text-body bg-edit-paper border border-edit-line rounded-[2px]
                         focus:border-edit-ink focus:outline-none placeholder:text-edit-faint
                         transition-colors mb-2"
              placeholder={t('story.chapterTitle')}
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              autoFocus
            />
            <textarea
              className="w-full px-3 py-2 text-body bg-edit-paper border border-edit-line rounded-[2px]
                         focus:border-edit-ink focus:outline-none placeholder:text-edit-faint
                         resize-none transition-colors mb-4"
              placeholder={t('story.chapterDescription')}
              rows={2}
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleAddChapter}
                className="px-4 py-1.5 t-caption bg-edit-ink text-edit-paper
                           hover:bg-edit-ink/85 rounded-[2px] transition-colors"
              >
                {t('common.add')}
              </button>
              <button
                onClick={() => { setShowAddChapter(false); setAddingSubChapterTo(null); setNewTitle(''); setNewDesc('') }}
                className="px-4 py-1.5 t-caption border border-edit-line text-edit-muted
                           hover:text-edit-ink hover:border-edit-line-strong rounded-[2px] transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}

        {/* 챕터 목록 */}
        <div className="space-y-8">
        {chapters
          .filter(c => !c.parent_id) 
          .map((chapter, idx) => {
            const subChapters = chapters.filter(c => c.parent_id === chapter.id) 
            
            return (
              <div
                key={chapter.id}
                ref={el => { chapterRefs.current[chapter.id] = el }}
                className="group/chapter"
              >
                {/* 최상위 챕터 헤더 — hairline 구조 */}
                <header className="mb-6">
                  {editingChapter === chapter.id ? (
                    <div className="bg-edit-paper border border-edit-line rounded-[2px] p-4">
                      <input
                        className="w-full px-3 py-2 text-body bg-edit-paper border border-edit-line rounded-[2px]
                                   focus:border-edit-ink focus:outline-none placeholder:text-edit-faint
                                   transition-colors mb-2"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        autoFocus
                      />
                      <textarea
                        className="w-full px-3 py-2 text-body bg-edit-paper border border-edit-line rounded-[2px]
                                   focus:border-edit-ink focus:outline-none placeholder:text-edit-faint
                                   resize-none transition-colors mb-3"
                        rows={2}
                        value={editDesc}
                        onChange={e => setEditDesc(e.target.value)}
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleUpdateChapter(chapter)}
                          className="px-4 py-1.5 t-caption bg-edit-ink text-edit-paper
                                     hover:bg-edit-ink/85 rounded-[2px] transition-colors"
                        >
                          {t('common.save')}
                        </button>
                        <button
                          onClick={() => setEditingChapter(null)}
                          className="px-4 py-1.5 t-caption border border-edit-line text-edit-muted
                                     hover:text-edit-ink hover:border-edit-line-strong rounded-[2px] transition-colors"
                        >
                          {t('common.cancel')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-baseline justify-between gap-4">
                        <div className="flex items-baseline gap-3 min-w-0">
                          <h3 className="font-serif text-h3 text-edit-ink tracking-tight [word-break:keep-all]">
                            <span className="font-sans text-body text-edit-muted mr-2">Ch. {idx + 1}.</span>{chapter.title}
                          </h3>
                          {getChapterPhotoCount(chapter.id) > 0 && (
                            <span className="t-eyebrow text-edit-faint shrink-0">
                              {t('story.chapterPhotoCount', { count: getChapterPhotoCount(chapter.id) })}
                            </span>
                          )}
                        </div>
                        {/* 컨트롤 — hover 시에만 노출 */}
                        <div className="flex items-center gap-3 shrink-0
                                        opacity-0 group-hover/chapter:opacity-100 focus-within:opacity-100
                                        transition-opacity duration-150">
                          <button
                            onClick={() => { setChapterPreviewId(chapter.id); setChapterPreviewOpen(true) }}
                            aria-label="챕터 미리보기"
                            className="t-caption text-edit-muted hover:text-edit-ink transition-colors
                                       inline-flex items-center gap-1"
                          >
                            <Eye size={12} strokeWidth={1.5} />
                          </button>
                          <button
                            onClick={() => { setShowAddChapter(true); setAddingSubChapterTo(chapter.id); setNewTitle(''); setNewDesc('') }}
                            className="t-caption text-edit-muted hover:text-edit-ink transition-colors"
                          >
                            + Sub
                          </button>
                          <button
                            onClick={() => handleMoveChapter(chapter.id, 'up')}
                            disabled={idx === 0}
                            aria-label="위로 이동"
                            className="t-caption text-edit-muted hover:text-edit-ink disabled:opacity-30 transition-colors"
                          >↑</button>
                          <button
                            onClick={() => handleMoveChapter(chapter.id, 'down')}
                            disabled={idx === chapters.filter(c => !c.parent_id).length - 1}
                            aria-label="아래로 이동"
                            className="t-caption text-edit-muted hover:text-edit-ink disabled:opacity-30 transition-colors"
                          >↓</button>
                          <button
                            onClick={() => { setEditingChapter(chapter.id); setEditTitle(chapter.title); setEditDesc(chapter.description || '') }}
                            className="t-caption text-edit-muted hover:text-edit-ink transition-colors"
                          >
                            {t('common.edit')}
                          </button>
                          <button
                            onClick={() => handleDeleteChapter(chapter.id)}
                            className="t-caption text-edit-danger hover:opacity-80 transition-opacity"
                          >
                            {t('common.delete')}
                          </button>
                        </div>
                      </div>

                      {/* description */}
                      {chapter.description && (
                        <p className="font-serif text-small text-edit-muted max-w-xl [word-break:keep-all] mt-1.5">
                          {chapter.description}
                        </p>
                      )}

                      {/* hairline divider */}
                      <div className="mt-4 h-px bg-edit-line" />
                    </>
                  )}
                </header>

                {/* 서브 챕터 추가 폼 */}
                {addingSubChapterTo === chapter.id && (
                  <div className="ml-6 mt-2 mb-6 pl-5 border-l border-edit-line">
                    <p className="t-eyebrow text-edit-faint mb-3">
                      ↳ {chapter.title} · {t('story.addSubChapter')}
                    </p>
                    <input
                      className="w-full px-3 py-2 text-body bg-edit-paper border border-edit-line rounded-[2px]
                                 focus:border-edit-ink focus:outline-none placeholder:text-edit-faint
                                 transition-colors mb-2"
                      placeholder={t('story.chapterTitle')}
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      autoFocus
                    />
                    <textarea
                      className="w-full px-3 py-2 text-body bg-edit-paper border border-edit-line rounded-[2px]
                                 focus:border-edit-ink focus:outline-none placeholder:text-edit-faint
                                 resize-none transition-colors mb-3"
                      placeholder={t('story.chapterDescription')}
                      rows={2}
                      value={newDesc}
                      onChange={e => setNewDesc(e.target.value)}
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={handleAddChapter}
                        className="px-4 py-1.5 t-caption bg-edit-ink text-edit-paper
                                   hover:bg-edit-ink/85 rounded-[2px] transition-colors"
                      >
                        {t('common.add')}
                      </button>
                      <button
                        onClick={() => { setShowAddChapter(false); setAddingSubChapterTo(null) }}
                        className="px-4 py-1.5 t-caption border border-edit-line text-edit-muted
                                   hover:text-edit-ink hover:border-edit-line-strong rounded-[2px] transition-colors"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  </div>
                )}

                {/* 챕터 블록 영역 */}
                <div>
                  {renderChapterActionBar(chapter.id)}
                  {renderChapterBlocks(chapter.id)}
                </div>

                {/* 서브챕터들 */}
                {subChapters.map((subChapter, subIdx) => (
                  <div
                    key={subChapter.id}
                    ref={el => { chapterRefs.current[subChapter.id] = el }}
                    className="ml-6 mt-10 pl-6 border-l border-edit-line group/chapter"
                  >
                    {/* 서브챕터 헤더 */}
                    <header className="mb-6">
                      {editingChapter === subChapter.id ? (
                        <div className="bg-edit-paper border border-edit-line rounded-[2px] p-4">
                          <input
                            className="w-full px-3 py-2 text-body bg-edit-paper border border-edit-line rounded-[2px]
                                       focus:border-edit-ink focus:outline-none placeholder:text-edit-faint
                                       transition-colors mb-2"
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            autoFocus
                          />
                          <textarea
                            className="w-full px-3 py-2 text-body bg-edit-paper border border-edit-line rounded-[2px]
                                       focus:border-edit-ink focus:outline-none placeholder:text-edit-faint
                                       resize-none transition-colors mb-3"
                            rows={2}
                            value={editDesc}
                            onChange={e => setEditDesc(e.target.value)}
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleUpdateChapter(subChapter)}
                              className="px-4 py-1.5 t-caption bg-edit-ink text-edit-paper
                                         hover:bg-edit-ink/85 rounded-[2px] transition-colors"
                            >
                              {t('common.save')}
                            </button>
                            <button
                              onClick={() => setEditingChapter(null)}
                              className="px-4 py-1.5 t-caption border border-edit-line text-edit-muted
                                         hover:text-edit-ink hover:border-edit-line-strong rounded-[2px] transition-colors"
                            >
                              {t('common.cancel')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-baseline justify-between gap-4">
                            <div className="flex items-baseline gap-3 min-w-0">
                              <h4 className="font-serif text-h3 text-edit-ink tracking-tight [word-break:keep-all]">
                                <span className="font-sans text-body text-edit-muted mr-2">Ch. {idx + 1}.{subIdx + 1}.</span>{subChapter.title}
                              </h4>
                              {getChapterPhotoCount(subChapter.id) > 0 && (
                                <span className="t-eyebrow text-edit-faint shrink-0">
                                  {t('story.chapterPhotoCount', { count: getChapterPhotoCount(subChapter.id) })}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 shrink-0
                                            opacity-0 group-hover/chapter:opacity-100 focus-within:opacity-100
                                            transition-opacity duration-150">
                              <button
                                onClick={() => { setChapterPreviewId(subChapter.id); setChapterPreviewOpen(true) }}
                                aria-label="챕터 미리보기"
                                className="t-caption text-edit-muted hover:text-edit-ink transition-colors
                                           inline-flex items-center gap-1"
                              >
                                <Eye size={12} strokeWidth={1.5} />
                              </button>
                              <button
                                onClick={() => handleMoveChapter(subChapter.id, 'up')}
                                disabled={subIdx === 0}
                                aria-label="위로 이동"
                                className="t-caption text-edit-muted hover:text-edit-ink disabled:opacity-30 transition-colors"
                              >↑</button>
                              <button
                                onClick={() => handleMoveChapter(subChapter.id, 'down')}
                                disabled={subIdx === subChapters.length - 1}
                                aria-label="아래로 이동"
                                className="t-caption text-edit-muted hover:text-edit-ink disabled:opacity-30 transition-colors"
                              >↓</button>
                              <button
                                onClick={() => { setEditingChapter(subChapter.id); setEditTitle(subChapter.title); setEditDesc(subChapter.description || '') }}
                                className="t-caption text-edit-muted hover:text-edit-ink transition-colors"
                              >
                                {t('common.edit')}
                              </button>
                              <button
                                onClick={() => handleDeleteChapter(subChapter.id)}
                                className="t-caption text-edit-danger hover:opacity-80 transition-opacity"
                              >
                                {t('common.delete')}
                              </button>
                            </div>
                          </div>
                          {subChapter.description && (
                            <p className="font-serif text-small text-edit-muted max-w-xl [word-break:keep-all] mt-1.5">
                              {subChapter.description}
                            </p>
                          )}
                          <div className="mt-4 h-px bg-edit-line" />
                        </>
                      )}
                    </header>

                    {/* 서브챕터 블록 영역 */}
                    <div>
                      {renderChapterActionBar(subChapter.id)}
                      {renderChapterBlocks(subChapter.id)}
                    </div>
                  </div>
                ))}
              </div>
            ) 
          })}
          </div>

        {chapters.length === 0 && (
          <div className="text-center py-20 text-muted">
            <p className="text-h3 mb-2">{t('story.noChapter')}</p>
          </div>
        )}
      </div>

      {/* 포트폴리오 미리보기 패널 숨김 처리
      {showPortfolioPreview && (
        <div className="sticky top-4 w-80 shrink-0">
          <PortfolioPreview blocks={allBlocksForPreview} />
        </div>
      )}
      */}

      {/* 라이트박스 */}
      {selectedPhotoIndex !== null && currentChapterPhotos[selectedPhotoIndex] && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex flex-col"
          onClick={() => {setSelectedPhotoIndex(null); setShowNotePanel(false)}}
        >
          {/* 상단: 챕터명 + 노트 (중앙) | 카운트 + 닫기 (오른쪽) */}
          <div className="flex items-center justify-between px-4 pt-3 pb-0 shrink-0" style={{ paddingTop: window.racconto ? '2rem' : undefined }} onClick={e => e.stopPropagation()}>
            <div className="flex-1" />
            <div className="flex items-center gap-3">
              <span className="text-edit-paper/70 text-small">
                {getChapterDisplayTitle(currentChapterPhotos[selectedPhotoIndex].chapter_id)}
              </span>
              <button
                onClick={e => { e.stopPropagation(); setShowNotePanel(v => !v) }}
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
                {selectedPhotoIndex + 1} / {currentChapterPhotos.length}
              </span>
              <button onClick={() => { setSelectedPhotoIndex(null); setShowNotePanel(false) }} className="text-edit-paper/80 hover:text-edit-paper text-h2 p-3">✕</button>
            </div>
          </div>

          {/* 중앙: 이미지 + 좌우 화살표 */}
          <div className="flex-1 flex items-center justify-center relative min-h-0" onClick={() => setSelectedPhotoIndex(null)}>
            {selectedPhotoIndex > 0 && (
              <button
                className="absolute left-4 z-10 text-edit-paper/80 hover:text-edit-paper text-h1 select-none p-4"
                onMouseDown={e => e.preventDefault()}
                onClick={e => { e.stopPropagation(); setSelectedPhotoIndex(prev => prev! - 1) }}
              >‹</button>
            )}
            <img
              src={cfUrl(currentChapterPhotos[selectedPhotoIndex].image_url, 'public') || undefined}
              alt={currentChapterPhotos[selectedPhotoIndex].caption || undefined}
              className="max-w-[calc(100%-8rem)] max-h-full object-contain"
              onClick={e => e.stopPropagation()}
            />
            {selectedPhotoIndex < currentChapterPhotos.length - 1 && (
              <button
                className="absolute right-4 z-10 text-edit-paper/80 hover:text-edit-paper text-h1 select-none p-4"
                onMouseDown={e => e.preventDefault()}
                onClick={e => { e.stopPropagation(); setSelectedPhotoIndex(prev => prev! + 1) }}
              >›</button>
            )}
          </div>

          {/* 하단: 캡션 */}
          <div className="shrink-0 bg-black/80 border-t border-white/10 px-6 py-4" onClick={e => e.stopPropagation()}>
            <div className="max-w-[calc(100%-8rem)] mx-auto min-h-[1.25rem]">
              {currentChapterPhotos[selectedPhotoIndex].caption && (
                <p className="text-sm text-white/70">
                  {currentChapterPhotos[selectedPhotoIndex].caption}
                </p>
              )}
            </div>
          </div>

          {showNotePanel && (
            <PhotoNotePanel
              photoId={currentChapterPhotos[selectedPhotoIndex].photo_id!}
              projectId={projectId}
              onClose={() => setShowNotePanel(false)}
            />
          )}
        </div>
      )}

      {/* ── 포트폴리오 미리보기 오버레이 ─────────────────────── */}
      {showPreview && (() => {
        const dm = previewDarkMode
        const bg = dm ? 'bg-ink text-hair' : 'bg-canvas text-ink'
        const headerBg = dm ? 'bg-ink/90 border-hair/10' : 'bg-canvas/90 border-faint'
        const subText = dm ? 'text-faint' : 'text-muted'
        const divider = dm ? 'bg-muted' : 'bg-faint'
        const accent = dm ? 'bg-card/30' : 'bg-faint'
        const closeColor = dm ? 'text-faint hover:text-hair' : 'text-faint hover:text-ink-2'
        const toggleClass = dm
          ? 'border-muted text-faint hover:text-hair'
          : 'border-faint text-muted hover:text-ink'


        return (
          <div className={`fixed inset-0 z-[90] ${bg} overflow-y-auto transition-[background,color,border] duration-150 ease-out`}>
            {/* 헤더 */}
            <div className={`sticky top-0 z-10 backdrop-blur-sm border-b ${headerBg}`}>
              <div className="max-w-4xl mx-auto px-6 h-12 flex items-center justify-between">
                <span className={`text-xs tracking-widest uppercase ${subText}`}>Portfolio Preview</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setPreviewDarkMode(v => !v)}
                    className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-btn border transition-[background,color,border] duration-150 ease-out ${toggleClass}`}
                  >
                    {dm
                      ? <><Sun size={12} strokeWidth={1.5} />{t('settings.themeBeige')}</>
                      : <><Moon size={12} strokeWidth={1.5} />{t('settings.themeDark')}</>}
                  </button>
                  <button
                    onClick={() => setShowPreview(false)}
                    className={`text-xl p-2 rounded-btn transition-[background,color,border] duration-150 ease-out ${closeColor}`}
                  >✕</button>
                </div>
              </div>
            </div>

            {/* 본문 */}
            <div className="max-w-4xl mx-auto px-6 pt-space-md pb-space-xl">
              {chapters.length === 0 ? (
                <p className={`text-center py-20 ${subText}`}>{t('story.noChapter')}</p>
              ) : (
                <div className="space-y-0">
                  {chapters.filter(c => !c.parent_id).map((chapter, idx) => {
                    const subChapters = chapters.filter(c => c.parent_id === chapter.id)
                    const items = getVisibleChapterItems(chapter.id)
                    return (
                      <div key={chapter.id} className="pt-space-lg">
                        {idx > 0 && <div className={`h-px mb-space-md ${divider}`} />}

                        {/* 챕터 헤더 */}
                        <div className="mb-space-md">
                          <div className="mb-2">
                            <h3 className="text-h2 font-bold font-serif mb-4 tracking-tight">
                              {chapter.title}
                            </h3>
                          </div>
                          {chapter.description && (
                            <p className={`text-body font-serif max-w-xl [word-break:keep-all] mt-2 ${subText}`}>
                              {chapter.description}
                            </p>
                          )}
                          <div className={`mt-6 h-px w-12 ${accent}`} />
                        </div>

                        <PortfolioChapterItems
                          items={items as PortfolioChapterItem[]}
                          darkMode={dm}
                        />

                        {/* 서브챕터 */}
                        {subChapters.map((sub) => (
                          <div key={sub.id} className="mt-space-md">
                            <div className={`h-px mb-10 w-1/3 ${divider}`} />
                            <div className="mb-8">
                              <div className="mb-2">
                                <h4 className="text-h3 font-serif font-semibold">
                                  {sub.title}
                                </h4>
                              </div>
                              {sub.description && (
                                <p className={`text-body font-serif mt-2 max-w-xl [word-break:keep-all] ${subText}`}>
                                  {sub.description}
                                </p>
                              )}
                            </div>
                            <PortfolioChapterItems
                              items={getVisibleChapterItems(sub.id) as PortfolioChapterItem[]}
                              darkMode={dm}
                            />
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>
        )
      })()}

      {/* ── 챕터별 슬라이드오버 Preview ─────────────────────── */}
      {chapterPreviewId && (() => {
        const dm = previewDarkMode
        const bg = dm ? 'bg-ink text-hair' : 'bg-canvas text-ink'
        const headerBg = dm ? 'bg-ink/90 border-hair/10' : 'bg-canvas/90 border-faint'
        const subText = dm ? 'text-faint' : 'text-muted'
        //const divider = dm ? 'bg-muted' : 'bg-faint'
        const accent = dm ? 'bg-card/30' : 'bg-faint'
        const toggleClass = dm
          ? 'border-muted text-faint hover:text-hair'
          : 'border-faint text-muted hover:text-ink'

        const targetChapter = chapters.find(c => c.id === chapterPreviewId)
        if (!targetChapter) return null

        const isSubChapter = !!targetChapter.parent_id
        const parentChapter = isSubChapter
          ? chapters.find(c => c.id === targetChapter.parent_id)
          : null

        return (
          <>
            {/* 딤 배경 */}
            <div
              className={`fixed inset-0 z-[85] bg-black/30 backdrop-blur-[2px] transition-opacity duration-300 ${chapterPreviewOpen ? 'opacity-100' : 'opacity-0'}`}
              onClick={closeChapterPreview}
            />

            {/* 슬라이드오버 패널 */}
            <div
              className={`fixed top-0 right-0 h-full z-[86] w-[min(600px,100vw)] ${bg} shadow-2xl flex flex-col
                transition-transform duration-300 ease-out
                ${chapterPreviewOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
              {/* 패널 헤더 */}
              <div className={`shrink-0 sticky top-0 z-10 backdrop-blur-sm border-b ${headerBg}`}>
                <div className="px-5 h-12 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-serif text-h3 tracking-tight truncate">{targetChapter.title}</span>
                    {isSubChapter && parentChapter && (
                      <span className={`text-xs shrink-0 ${subText}`}>↑ {parentChapter.title}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setPreviewDarkMode(v => !v)}
                      className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-btn border transition-[background,color,border] duration-150 ease-out ${toggleClass}`}
                    >
                      {dm
                        ? <><Sun size={11} strokeWidth={1.5} />Beige</>
                        : <><Moon size={11} strokeWidth={1.5} />Dark</>}
                    </button>
                    <button
                      onClick={closeChapterPreview}
                      className={`text-lg p-1.5 rounded-btn transition-[background,color,border] duration-150 ease-out ${subText} hover:text-ink`}
                    >✕</button>
                  </div>
                </div>
              </div>

              {/* 패널 본문 */}
              <div className="flex-1 overflow-y-auto px-8 pt-6 pb-12">
                <div className="mb-8">
                  {targetChapter.description && (
                    <p className={`text-body font-serif max-w-full [word-break:keep-all] mb-6 ${subText}`}>
                      {targetChapter.description}
                    </p>
                  )}
                  <div className={`mb-6 h-px w-10 ${accent}`} />
                  <PortfolioChapterItems
                    items={getVisibleChapterItems(chapterPreviewId) as PortfolioChapterItem[]}
                    darkMode={dm}
                    containerWidth={536}
                  />
                </div>
              </div>
            </div>

          </>
        )
      })()}
    </div>
  )
}
export default memo(ProjectStory)