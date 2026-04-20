import { useEffect, useState, useMemo, useRef, memo } from 'react'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import PhotoNotePanel from '../components/PhotoNotePanel'
import { useElectronSidebar } from '../context/ElectronSidebarContext'
import ConfirmModal from '../components/ConfirmModal'
import PortfolioChapterItems, { type PortfolioChapterItem } from '../components/PortfolioChapterItems'
import {
  SortablePhotoBlock,
  SortableTextBlock,
  SortableSideBySideBlock,
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
  const [addingTextChapterId, setAddingTextChapterId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null)

  // 기존 상태들 아래에 추가
  const [editingTextItemId, setEditingTextItemId] = useState<string | null>(null)
  const [textDraft, setTextDraft] = useState('')

  const { t } = useTranslation()

  // 라이트박스 상태
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [currentChapterPhotos, setCurrentChapterPhotos] = useState<ChapterItem[]>([]);

  // 포트폴리오 미리보기
  const [showPreview, setShowPreview] = useState(false)
  const [previewDarkMode, setPreviewDarkMode] = useState(false)

  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const [activeBlockItems, setActiveBlockItems] = useState<ChapterItem[]>([])

  const chapterRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const scrollToChapter = (chapterId: string) => {
    chapterRefs.current[chapterId]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const [showNotePanel, setShowNotePanel] = useState(false)
  const isElectron = !!window.racconto
  const { setSidebarContent } = useElectronSidebar()

  // O(N²) 성능 저하를 막기 위한 Set(해시테이블) 캐싱
  const allPhotoIds = useMemo(() => new Set(allPhotos.map(p => p.id)), [allPhotos]);
  
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
  
  const fetchChapterPhotos = async (chapterId: string) => {
    const res = await axios.get(`${API}/chapters/${chapterId}/items`)
    setChapterPhotos(prev => ({ ...prev, [chapterId]: res.data }))
  }

  // 변경 후 — API 호출 없이 모달만 열고, 저장 시 생성
  const handleAddTextBlock = (chapterId: string) => {
    setAddingTextChapterId(chapterId)
    setTextDraft('')
    setEditingTextItemId('new')  // 'new' = 신규 생성 플래그
  }

  const handleSaveTextBlock = async () => {
    if (!textDraft.trim()) return

    if (editingTextItemId === 'new') {
      // 신규 생성
      if (!addingTextChapterId) return
      await axios.post(`${API}/chapters/${addingTextChapterId}/texts`, {
        text_content: textDraft
      })
      fetchChapterPhotos(addingTextChapterId)
      setAddingTextChapterId(null)
    } else {
      // 기존 수정
      if (!editingTextItemId) return
      const chapterId = Object.keys(chapterPhotos).find(cid =>
        chapterPhotos[cid].some(item => item.id === editingTextItemId)
      )
      if (!chapterId) return
      await axios.put(`${API}/chapters/${chapterId}/texts/${editingTextItemId}`, {
        text_content: textDraft
      })
      fetchChapterPhotos(chapterId)
    }

    setEditingTextItemId(null)
    setTextDraft('')
  }

  // 라이트박스 키보드 네비게이션
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedPhotoIndex === null || !currentChapterPhotos.length) return;

      const lastIndex = currentChapterPhotos.length - 1;

      if (      (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D')) {
        if (selectedPhotoIndex < lastIndex) {
          setSelectedPhotoIndex(prev => prev! + 1);
          setShowNotePanel(false)
        }
      } else if ((e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A')) {
        if (selectedPhotoIndex > 0) {
          setSelectedPhotoIndex(prev => prev! - 1);
          setShowNotePanel(false)
        }
      } else if (e.key === 'Escape') {
        setSelectedPhotoIndex(null); 
        setShowNotePanel(false)
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhotoIndex, currentChapterPhotos]);

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

  const handleRemoveItem = async (chapterId: string, itemId: string) => {
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
          return
        }
      }
    }

    fetchChapterPhotos(chapterId)
  }

  const handleSideBySide = async (
    chapterId: string,
    textItemId: string,
    position: 'side-left' | 'side-right',
    direction: 'above' | 'below'
  ) => {
    // 인접한 사진 블록의 block_id 찾기
    const blocks = groupIntoBlocks(getVisibleChapterItems(chapterId))
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
  }

  const handleCancelSideBySide = async (chapterId: string, textItemId: string) => {
    await axios.put(`${API}/chapters/${chapterId}/side-by-side/cancel`, {
      text_item_id: textItemId
    })
    fetchChapterPhotos(chapterId)
  }

  const handleBlockLayoutChange = async (
    chapterId: string,
    blockId: string,
    layout: 'grid' | 'wide' | 'single'
  ) => {
    // 낙관적 업데이트 — 서버 응답 전에 UI 즉시 반영
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
  }

  // 블록 간 순서 변경 (외부 DnD)
  const handleBlockDragEnd = (event: DragEndEvent, chapterId: string, blocks: ChapterBlock[]) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = blocks.findIndex(b => b.blockId === active.id)
    const newIndex = blocks.findIndex(b => b.blockId === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const newBlocks = arrayMove(blocks, oldIndex, newIndex)

    // 새 order_num 계산: 블록 인덱스 * 10 (여유 공간)
    const allItemIds: string[] = []
    newBlocks.forEach(block => {
      block.items.forEach(item => allItemIds.push(item.id))
    })

    setChapterPhotos(prev => {
      const items = prev[chapterId] || []
      const newItems = [...items].sort((a, b) => {
        const aIdx = allItemIds.indexOf(a.id)
        const bIdx = allItemIds.indexOf(b.id)
        return aIdx - bIdx
      })
      return { ...prev, [chapterId]: newItems }
    })

    axios.put(`${API}/chapters/${chapterId}/items/reorder`, {
      item_ids: allItemIds
    }).catch(err => console.error('블록 순서 업데이트 실패:', err))
  }

  // 블록 내 사진 순서 변경 (내부 DnD)
  const handleInnerDragEnd = (event: DragEndEvent, blockId: string, chapterId: string) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    // state 업데이트 전에 미리 계산 (stale closure 방지)
    const currentItems = chapterPhotos[chapterId] || []
    const blockItems = currentItems
      .filter(i => i.block_id === blockId)
      .sort((a, b) => a.order_in_block - b.order_in_block)  // 현재 순서 기준으로 정렬

    const oldIndex = blockItems.findIndex(i => i.id === active.id)
    const newIndex = blockItems.findIndex(i => i.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const newBlockItems = arrayMove(blockItems, oldIndex, newIndex)
    const newItemIds = newBlockItems.map(i => i.id)

    // 낙관적 업데이트 — 배열 순서 자체를 newBlockItems 기준으로 재구성
    setChapterPhotos(prev => {
      const items = prev[chapterId] || []
      const blockItemIdSet = new Set(newBlockItems.map(i => i.id))
      const nonBlockItems = items.filter(i => !blockItemIdSet.has(i.id))
      const updatedBlockItems = newBlockItems.map((item, idx) => ({
        ...item,
        order_in_block: idx
      }))
      // 블록 아이템이 원래 있던 첫 번째 위치에 삽입
      const firstIdx = items.findIndex(i => blockItemIdSet.has(i.id))
      const result = [...nonBlockItems]
      result.splice(firstIdx === -1 ? result.length : firstIdx, 0, ...updatedBlockItems)
      return { ...prev, [chapterId]: result }
    })

    // 미리 계산한 값으로 API 호출
    axios.put(`${API}/chapters/${chapterId}/blocks/${blockId}/reorder`, {
      block_id: blockId,
      item_ids: newItemIds
    }).catch(err => console.error('블록 내 순서 업데이트 실패:', err))
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
      return (chapterPhotos[chapterId] || []).filter(item =>
        item.item_type === 'TEXT' || (item.photo_id != null && allPhotoIds.has(item.photo_id))
      );
    };

    // 연속된 아이템을 블록 단위로 그룹화
    interface ChapterBlock {
      type: 'PHOTO' | 'TEXT' | 'SIDE'
      blockId: string        // TEXT는 item.id, PHOTO는 block_id
      items: ChapterItem[]   // TEXT는 1개, PHOTO는 N개
      order_num: number      // 블록의 order_num (같은 블록은 동일)
    }

    // 변경 후
    const groupIntoBlocks = (items: ChapterItem[]): ChapterBlock[] => {
      const blocks: ChapterBlock[] = []
      const blockMap = new Map<string, ChapterBlock>()

      items.forEach(item => {
        const bid = item.block_id || item.id
        const isSideBySide = item.block_type === 'side-left' || item.block_type === 'side-right'

        if (item.item_type === 'TEXT' && !isSideBySide) {
          // 독립 텍스트 블록
          blocks.push({ type: 'TEXT', blockId: item.id, items: [item], order_num: item.order_num })
        } else if (isSideBySide) {
          // side-by-side: PHOTO든 TEXT든 같은 block_id로 묶음
          if (blockMap.has(bid)) {
            blockMap.get(bid)!.items.push(item)
          } else {
            const block: ChapterBlock = {
              type: 'SIDE',
              blockId: bid,
              items: [item],
              order_num: item.order_num
            }
            blockMap.set(bid, block)
            blocks.push(block)
          }
        } else {
          // 일반 PHOTO 블록
          if (blockMap.has(bid)) {
            blockMap.get(bid)!.items.push(item)
            blockMap.get(bid)!.items.sort((a, b) => a.order_in_block - b.order_in_block)
          } else {
            const block: ChapterBlock = { type: 'PHOTO', blockId: bid, items: [item], order_num: item.order_num }
            blockMap.set(bid, block)
            blocks.push(block)
          }
        }
      })
      return blocks
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
        return `Chapter ${parentIndex + 1}.${subIndex + 1} - ${chapter.title}`;
      } else {
        // 최상위 챕터인 경우 (예: Chapter 1)
        const mainIndex = mainChapters.findIndex(c => c.id === chapterId);
        return `Chapter ${mainIndex + 1}. ${chapter.title}`;
      }
    };

  useEffect(() => {
    if (!isElectron) return
    if (activeTab !== 'story') return
    setSidebarContent(
      <div className="p-4">
        <p className="text-xs font-semibold text-gray-500 mb-3">{t('story.chapters')}</p>
        <button
          onClick={() => { setShowAddChapter(true); setAddingSubChapterTo(null) }}
          className="w-full mb-2 text-xs bg-stone-600 text-white px-2 py-1.5 rounded hover:bg-stone-700 tracking-wider"
        >
          {t('story.addChapter')}
        </button>
        <button
          onClick={() => setShowPreview(true)}
          className="w-full mb-3 text-xs border border-stone-400 text-stone-600 px-2 py-1.5 rounded hover:bg-stone-50 transition-colors tracking-wider"
        >
          👁 {t('story.preview')}
        </button>
        <div className="space-y-1">
          {chapters.filter(c => !c.parent_id).map((chapter, idx) => {
            const mainChapters = chapters.filter(c => !c.parent_id)
            const subChapters = chapters.filter(c => c.parent_id === chapter.id)
            return (
              <div key={chapter.id}>
                <div className="flex items-center gap-1 group rounded hover:bg-gray-50">
                  <button onClick={() => scrollToChapter(chapter.id)}
                    className="flex-1 text-left px-2 py-1.5 text-xs flex items-center gap-1.5 min-w-0">
                    <span className="text-gray-300 shrink-0">{idx + 1}</span>
                    <span className="truncate text-gray-700 group-hover:text-black">{chapter.title}</span>
                  </button>
                  <div className="flex shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleMoveChapter(chapter.id, 'up')} disabled={idx === 0}
                      className="text-gray-300 hover:text-black disabled:opacity-20 px-0.5 text-xs">↑</button>
                    <button onClick={() => handleMoveChapter(chapter.id, 'down')} disabled={idx === mainChapters.length - 1}
                      className="text-gray-300 hover:text-black disabled:opacity-20 px-0.5 text-xs">↓</button>
                  </div>
                </div>
                {subChapters.map((sub, subIdx) => (
                  <div key={sub.id} className="flex items-center gap-1 group rounded hover:bg-gray-50">
                    <button onClick={() => scrollToChapter(sub.id)}
                      className="flex-1 text-left pl-5 pr-1 py-1 text-xs flex items-center gap-1.5 min-w-0">
                      <span className="text-gray-200 shrink-0">{idx + 1}.{subIdx + 1}</span>
                      <span className="truncate text-gray-400 group-hover:text-gray-700">{sub.title}</span>
                    </button>
                    <div className="flex shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleMoveChapter(sub.id, 'up')} disabled={subIdx === 0}
                        className="text-gray-300 hover:text-black disabled:opacity-20 px-0.5 text-xs">↑</button>
                      <button onClick={() => handleMoveChapter(sub.id, 'down')} disabled={subIdx === subChapters.length - 1}
                        className="text-gray-300 hover:text-black disabled:opacity-20 px-0.5 text-xs">↓</button>
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    )
  }, [isElectron, activeTab, chapters, t])

  return (
    <div className="flex gap-6 relative">
    
    {confirmModal && (
      <ConfirmModal
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(null)}
        dangerous
      />
    )}

      {/* 사이드바 */}
      <div className={`${isElectron ? 'hidden' : ''} w-48 shrink-0 sticky top-4 self-start`}>
        <div className="bg-white rounded-lg shadow p-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
          <p className="text-xs font-semibold text-gray-500 mb-3">{t('story.chapters')}</p>

          {/* 챕터 추가 버튼 */}
          <button
            onClick={() => { setShowAddChapter(true); setAddingSubChapterTo(null) }}
            className="w-full mb-2 text-xs bg-stone-600 text-white px-2 py-1.5 rounded hover:bg-stone-700 transition-colors tracking-wider"
          >
            {t('story.addChapter')}
          </button>

          {/* 미리보기 버튼 */}
          <button
            onClick={() => setShowPreview(true)}
            className="w-full mb-3 text-xs border border-stone-400 text-stone-600 px-2 py-1.5 rounded hover:bg-stone-50 transition-colors tracking-wider"
          >
            👁 {t('story.preview')}
          </button>

          {/* 챕터 네비게이션 목록 */}
          <div className="space-y-1">
          {chapters.filter(c => !c.parent_id).map((chapter, idx) => {
            const mainChapters = chapters.filter(c => !c.parent_id)
            const subChapters = chapters.filter(c => c.parent_id === chapter.id)
            return (
              <div key={chapter.id}>
                {/* 부모 챕터 */}
                <div className="flex items-center gap-1 group rounded hover:bg-gray-50">
                  <button
                    onClick={() => scrollToChapter(chapter.id)}
                    className="flex-1 text-left px-2 py-1.5 text-xs flex items-center gap-1.5 min-w-0"
                  >
                    <span className="text-gray-500 shrink-0">{t('story.chapter')} {idx + 1}</span>
                    <span className="truncate text-gray-700 group-hover:text-black">{chapter.title}</span>
                  </button>
                  <div className="flex shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleMoveChapter(chapter.id, 'up')}
                      disabled={idx === 0}
                      className="text-gray-300 hover:text-black disabled:opacity-20 px-0.5 text-xs"
                    >↑</button>
                    <button
                      onClick={() => handleMoveChapter(chapter.id, 'down')}
                      disabled={idx === mainChapters.length - 1}
                      className="text-gray-300 hover:text-black disabled:opacity-20 px-0.5 text-xs"
                    >↓</button>
                  </div>
                </div>

                {/* 서브챕터 */}
                {subChapters.map((sub, subIdx) => (
                  <div key={sub.id} className="flex items-center gap-1 group rounded hover:bg-gray-50">
                    <button
                      onClick={() => scrollToChapter(sub.id)}
                      className="flex-1 text-left pl-5 pr-1 py-1 text-xs flex items-center gap-1.5 min-w-0"
                    >
                      <span className="text-gray-400 shrink-0">{t('story.chapter')} {idx + 1}.{subIdx + 1}</span>
                      <span className="truncate text-gray-400 group-hover:text-gray-700">{sub.title}</span>
                    </button>
                    <div className="flex shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleMoveChapter(sub.id, 'up')}
                        disabled={subIdx === 0}
                        className="text-gray-300 hover:text-black disabled:opacity-20 px-0.5 text-xs"
                      >↑</button>
                      <button
                        onClick={() => handleMoveChapter(sub.id, 'down')}
                        disabled={subIdx === subChapters.length - 1}
                        className="text-gray-300 hover:text-black disabled:opacity-20 px-0.5 text-xs"
                      >↓</button>
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
            {chapters.length === 0 && (
              <p className="text-xs text-gray-300 px-2">{t('story.noChapter')}</p>
            )}
          </div>
        </div>
      </div>

      {/* 메인 영역 */}
      <div className="flex-1">

        {/* 챕터 추가 폼 — 사이드바 버튼 클릭 시 표시 */}
        {showAddChapter && !addingSubChapterTo && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <input
              className="w-full border rounded px-3 py-2 text-sm mb-2"
              placeholder={t('story.chapterTitle')}
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              autoFocus
            />
            <textarea
              className="w-full border rounded px-3 py-2 text-sm mb-3 resize-none"
              placeholder={t('story.chapterDescription')}
              rows={2}
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddChapter}
                className="bg-stone-600 text-white px-3 py-1 text-sm tracking-wider hover:bg-stone-700 transition-colors rounded"
              >
                {t('common.add')}
              </button>
              <button
                onClick={() => { setShowAddChapter(false); setAddingSubChapterTo(null); setNewTitle(''); setNewDesc('') }}
                className="border px-3 py-1 text-sm hover:bg-gray-50 rounded"
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
              >
                {/* 최상위 챕터 */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="p-4 border-b">
                    {editingChapter === chapter.id ? (
                      <div>
                        <input
                          className="w-full border rounded px-3 py-2 text-sm mb-2"
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                        />
                        <textarea
                          className="w-full border rounded px-3 py-2 text-sm mb-2"
                          rows={2}
                          value={editDesc}
                          onChange={e => setEditDesc(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <button onClick={() => handleUpdateChapter(chapter)} className="bg-stone-600 text-white px-3 py-1 text-xs tracking-wider hover:bg-stone-700 transition-colors rounded">{t('common.save')}</button>
                          <button onClick={() => setEditingChapter(null)} className="border px-3 py-1 text-xs rounded">{t('common.cancel')}</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-xs text-gray-500 mr-2">{t('story.chapter')} {idx + 1}</span>
                          <span className="font-semibold">{chapter.title}</span>
                          {chapter.description && <p className="text-sm text-gray-500 mt-1">{chapter.description}</p>}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => {
                              setShowAddChapter(true)
                              setAddingSubChapterTo(chapter.id)
                              setNewTitle('') 
                              setNewDesc('')
                            }}
                            className="text-xs text-blue-500 hover:text-blue-700"
                          >
                            + Sub
                          </button>
                          <button
                            onClick={() => handleMoveChapter(chapter.id, 'up')}
                            disabled={idx === 0}
                            className="text-xs text-gray-400 hover:text-black disabled:opacity-30"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => handleMoveChapter(chapter.id, 'down')}
                            disabled={idx === chapters.filter(c => !c.parent_id).length - 1}
                            className="text-xs text-gray-400 hover:text-black disabled:opacity-30"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => { 
                              setEditingChapter(chapter.id)
                              setEditTitle(chapter.title)
                              setEditDesc(chapter.description || '')
                            }}
                            className="text-xs text-gray-400 hover:text-black"
                          >
                            {t('common.edit')}
                          </button>
                          <button onClick={() => handleDeleteChapter(chapter.id)} className="text-xs text-red-400 hover:text-red-600">{t('common.delete')}</button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 서브 챕터 추가 폼 */}
                  {addingSubChapterTo === chapter.id && (
                    <div className="ml-8 mt-3 p-4 bg-gray-50 border border-gray-200 rounded-lg shadow-inner">
                      <p className="text-xs text-gray-500 mb-2">↳ {chapter.title}{t('story.addSubChapter')}</p>
                      <input
                        className="w-full border rounded px-3 py-2 text-sm mb-2"
                        placeholder={t('story.chapterTitle')}
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                      />
                      <textarea
                        className="w-full border rounded px-3 py-2 text-sm mb-3"
                        placeholder={t('story.chapterDescription')}
                        rows={2}
                        value={newDesc}
                        onChange={e => setNewDesc(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <button onClick={handleAddChapter} className="bg-stone-600 text-white px-3 py-1 text-xs tracking-wider hover:bg-stone-700 transition-colors rounded">
                          {t('common.add')}
                        </button>
                        <button 
                          onClick={() => {
                            setShowAddChapter(false)
                            setAddingSubChapterTo(null)
                          }} 
                          className="border px-3 py-1 text-xs hover:bg-gray-50 rounded"
                        >
                          {t('common.cancel')}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 챕터 사진/텍스트 블록 영역 */}
                  <div className="p-4">
                    {(() => {
                      const items = getVisibleChapterItems(chapter.id)
                      const blocks = groupIntoBlocks(items)
                      if (blocks.length === 0) return (
                        <p className="text-sm text-gray-400 py-2">{t('story.addPhotoGuide')}</p>
                      )
                      return (
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragStart={(e) => {
                            const draggedBlock = blocks.find(b => b.blockId === e.active.id)
                            if (draggedBlock) {
                              setActiveBlockId(String(e.active.id))
                              setActiveBlockItems(draggedBlock.items)
                            }
                          }}
                          onDragEnd={(e) => {
                            setActiveBlockId(null)
                            setActiveBlockItems([])
                            handleBlockDragEnd(e, chapter.id, blocks)  // 서브챕터면 subChapter.id
                          }}
                        >
                          <SortableContext items={blocks.map(b => b.blockId)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-2">
                            {blocks.map((block, blockIdx) => {
                              const prevBlock = blocks[blockIdx - 1]
                              const nextBlock = blocks[blockIdx + 1]

                              if (block.type === 'SIDE') {
                                return (
                                  <SortableSideBySideBlock
                                    key={block.blockId}
                                    blockId={block.blockId}
                                    chapterId={chapter.id}
                                    items={block.items}
                                    onRemoveItem={handleRemoveItem}
                                    onEdit={(itemId, text) => { setEditingTextItemId(itemId); setTextDraft(text) }}
                                    onPhotoClick={(item) => {
                                      const flatPhotos = getFlattenedPhotos().filter(i => i.item_type === 'PHOTO')
                                      const globalIndex = flatPhotos.findIndex(i => i.id === item.id)
                                      setCurrentChapterPhotos(flatPhotos)
                                      setSelectedPhotoIndex(globalIndex)
                                    }}
                                    onCancelSideBySide={handleCancelSideBySide}
                                  />
                                )
                              }

                              if (block.type === 'TEXT') {
                                return (
                                  <SortableTextBlock
                                    key={block.blockId}
                                    id={block.blockId}
                                    itemId={block.items[0].id}
                                    chapterId={chapter.id}
                                    text_content={block.items[0].text_content || ''}
                                    hasPhotoAbove={prevBlock?.type === 'PHOTO'}
                                    hasPhotoBelow={nextBlock?.type === 'PHOTO'}
                                    onRemove={handleRemoveItem}
                                    onEdit={(itemId, text) => { setEditingTextItemId(itemId); setTextDraft(text) }}
                                    onSideBySide={(itemId, position, direction) =>
                                      handleSideBySide(chapter.id, itemId, position, direction)
                                    }
                                  />
                                )
                              }

                              return (
                                <SortablePhotoBlock
                                  key={block.blockId}
                                  blockId={block.blockId}
                                  chapterId={chapter.id}
                                  items={block.items}
                                  sensors={sensors}
                                  onRemoveItem={handleRemoveItem}
                                  onPhotoClick={(item) => {
                                    const flatPhotos = getFlattenedPhotos().filter(i => i.item_type === 'PHOTO')
                                    const globalIndex = flatPhotos.findIndex(i => i.id === item.id)
                                    setCurrentChapterPhotos(flatPhotos)
                                    setSelectedPhotoIndex(globalIndex)
                                  }}
                                  onInnerDragEnd={handleInnerDragEnd}
                                  onLayoutChange={(blockId, layout) =>
                                    handleBlockLayoutChange(chapter.id, blockId, layout)
                                  }
                                />
                              )
                            })}
                            </div>
                          </SortableContext>
                          {/* DragOverlay — 드래그 중인 블록의 고스트 렌더 */}
                          <DragOverlay>
                            {activeBlockId ? (
                              <div className="bg-stone-50 border border-stone-300 rounded-lg p-3 opacity-90 shadow-xl">
                                <div className="grid grid-cols-3 gap-2">
                                  {activeBlockItems.filter(i => i.item_type === 'PHOTO').map(item => (
                                    <div key={item.id} className="aspect-[3/2] rounded overflow-hidden bg-gray-100">
                                      <img src={item.image_url ?? ''} className="w-full h-full object-contain" />
                                    </div>
                                  ))}
                                  {activeBlockItems[0]?.item_type === 'TEXT' && (
                                    <div className="col-span-3 bg-stone-50 border border-stone-200 rounded-lg px-5 py-4">
                                      <p className="text-sm text-gray-700 line-clamp-3">{activeBlockItems[0].text_content}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : null}
                          </DragOverlay>
                        </DndContext>
                      )
                    })()}
                    <button
                      onClick={() => handleAddTextBlock(chapter.id)}
                      className="mt-2 text-xs text-gray-400 hover:text-gray-600 border border-dashed border-gray-300 hover:border-gray-400 rounded px-3 py-1.5 w-full transition-colors"
                    >
                      + 텍스트 블록 추가
                    </button>
                  </div>
                </div>

                {/* 서브챕터들 (인덴트) */}
                {subChapters.map((subChapter, subIdx) => (
                  <div
                    key={subChapter.id}
                    ref={el => { chapterRefs.current[subChapter.id] = el }}
                    className="ml-8 border-l-2 border-blue-200 pl-4 bg-white rounded-lg shadow overflow-hidden mt-3"
                  >
                    {/* 서브챕터 헤더 */}
                    <div className="p-4 border-b">
                      {editingChapter === subChapter.id ? (
                        <div>
                          <input
                            className="w-full border rounded px-3 py-2 text-sm mb-2"
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                          />
                          <textarea
                            className="w-full border rounded px-3 py-2 text-sm mb-2"
                            rows={2}
                            value={editDesc}
                            onChange={e => setEditDesc(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <button onClick={() => handleUpdateChapter(subChapter)} className="bg-stone-600 text-white px-3 py-1 text-xs tracking-wider hover:bg-stone-700 transition-colors rounded">{t('common.save')}</button>
                            <button onClick={() => setEditingChapter(null)} className="border px-3 py-1 text-xs rounded">{t('common.cancel')}</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs text-gray-400 mr-2">{t('story.chapter')} {idx + 1}.{subIdx + 1}</span>
                            <span className="font-semibold">{subChapter.title}</span>
                            {subChapter.description && <p className="text-sm text-gray-400 mt-1">{subChapter.description}</p>}
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => handleMoveChapter(subChapter.id, 'up')}
                              disabled={subIdx === 0}
                              className="text-xs text-gray-400 hover:text-black disabled:opacity-30"
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => handleMoveChapter(subChapter.id, 'down')}
                              disabled={subIdx === subChapters.length - 1}
                              className="text-xs text-gray-400 hover:text-black disabled:opacity-30"
                            >
                              ↓
                            </button>

                            <button
                              onClick={() => { 
                                setEditingChapter(subChapter.id)
                                setEditTitle(subChapter.title)
                                setEditDesc(subChapter.description || '')
                              }}
                              className="text-xs text-gray-400 hover:text-black"
                            >
                              {t('common.edit')}
                            </button>
                            <button onClick={() => handleDeleteChapter(subChapter.id)} className="text-xs text-red-400 hover:text-red-600">{t('common.delete')}</button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 서브 챕터 사진/텍스트 블록 영역 */}
                    <div className="p-4">
                      {(() => {
                        const items = getVisibleChapterItems(subChapter.id)
                        const blocks = groupIntoBlocks(items)
                        if (blocks.length === 0) return (
                          <p className="text-sm text-gray-400 py-2">{t('story.addPhotoGuide')}</p>
                        )
                        return (
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragStart={(e) => {
                              const draggedBlock = blocks.find(b => b.blockId === e.active.id)
                              if (draggedBlock) {
                                setActiveBlockId(String(e.active.id))
                                setActiveBlockItems(draggedBlock.items)
                              }
                            }}
                            onDragEnd={(e) => {
                              setActiveBlockId(null)
                              setActiveBlockItems([])
                              handleBlockDragEnd(e, subChapter.id, blocks)
                            }}
                          >
                            <SortableContext items={blocks.map(b => b.blockId)} strategy={verticalListSortingStrategy}>
                              <div className="space-y-2">
                              {blocks.map((block, blockIdx) => {
                                const prevBlock = blocks[blockIdx - 1]
                                const nextBlock = blocks[blockIdx + 1]

                                if (block.type === 'SIDE') {
                                  return (
                                    <SortableSideBySideBlock
                                      key={block.blockId}
                                      blockId={block.blockId}
                                      chapterId={subChapter.id}
                                      items={block.items}
                                      onRemoveItem={handleRemoveItem}
                                      onEdit={(itemId, text) => { setEditingTextItemId(itemId); setTextDraft(text) }}
                                      onPhotoClick={(item) => {
                                        const flatPhotos = getFlattenedPhotos().filter(i => i.item_type === 'PHOTO')
                                        const globalIndex = flatPhotos.findIndex(i => i.id === item.id)
                                        setCurrentChapterPhotos(flatPhotos)
                                        setSelectedPhotoIndex(globalIndex)
                                      }}
                                      onCancelSideBySide={handleCancelSideBySide}
                                    />
                                  )
                                }

                                if (block.type === 'TEXT') {
                                  return (
                                    <SortableTextBlock
                                      key={block.blockId}
                                      id={block.blockId}
                                      itemId={block.items[0].id}
                                      chapterId={subChapter.id}
                                      text_content={block.items[0].text_content || ''}
                                      hasPhotoAbove={prevBlock?.type === 'PHOTO'}
                                      hasPhotoBelow={nextBlock?.type === 'PHOTO'}
                                      onRemove={handleRemoveItem}
                                      onEdit={(itemId, text) => { setEditingTextItemId(itemId); setTextDraft(text) }}
                                      onSideBySide={(itemId, position, direction) =>
                                        handleSideBySide(subChapter.id, itemId, position, direction)
                                      }
                                    />
                                  )
                                }

                                return (
                                  <SortablePhotoBlock
                                    key={block.blockId}
                                    blockId={block.blockId}
                                    chapterId={subChapter.id}
                                    items={block.items}
                                    sensors={sensors}
                                    onRemoveItem={handleRemoveItem}
                                    onPhotoClick={(item) => {
                                      const flatPhotos = getFlattenedPhotos().filter(i => i.item_type === 'PHOTO')
                                      const globalIndex = flatPhotos.findIndex(i => i.id === item.id)
                                      setCurrentChapterPhotos(flatPhotos)
                                      setSelectedPhotoIndex(globalIndex)
                                    }}
                                    onInnerDragEnd={handleInnerDragEnd}
                                    onLayoutChange={(blockId, layout) =>
                                      handleBlockLayoutChange(subChapter.id, blockId, layout)
                                    }
                                  />
                                )
                              })}
                              </div>
                          </SortableContext>
                          {/* DragOverlay — 드래그 중인 블록의 고스트 렌더 */}
                          <DragOverlay>
                            {activeBlockId ? (
                              <div className="bg-stone-50 border border-stone-300 rounded-lg p-3 opacity-90 shadow-xl">
                                <div className="grid grid-cols-3 gap-2">
                                  {activeBlockItems.filter(i => i.item_type === 'PHOTO').map(item => (
                                    <div key={item.id} className="aspect-[3/2] rounded overflow-hidden bg-gray-100">
                                      <img src={item.image_url ?? ''} className="w-full h-full object-contain" />
                                    </div>
                                  ))}
                                  {activeBlockItems[0]?.item_type === 'TEXT' && (
                                    <div className="col-span-3 bg-stone-50 border border-stone-200 rounded-lg px-5 py-4">
                                      <p className="text-sm text-gray-700 line-clamp-3">{activeBlockItems[0].text_content}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : null}
                          </DragOverlay>
                        </DndContext>
                        )
                      })()}
                      <button
                        onClick={() => handleAddTextBlock(subChapter.id)}
                        className="mt-2 text-xs text-gray-400 hover:text-gray-600 border border-dashed border-gray-300 hover:border-gray-400 rounded px-3 py-1.5 w-full transition-colors"
                      >
                        {t('story.addTextBlock')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) 
          })}
          </div>

        {chapters.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg mb-2">{t('story.noChapter')}</p>
          </div>
        )}
      </div>

      {/* 라이트박스 */}
      {selectedPhotoIndex !== null && currentChapterPhotos[selectedPhotoIndex] && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex flex-col"
          onClick={() => {setSelectedPhotoIndex(null); setShowNotePanel(false)}}
        >
          {/* 상단: 챕터명 + 카운터 + 닫기 */}
          <div className="flex items-center justify-between px-6 py-3 shrink-0" style={{ paddingTop: window.racconto ? '2rem' : undefined }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
            {/* 노트 버튼 */}
              <button
                onClick={e => { e.stopPropagation(); setShowNotePanel(v => !v) }}
                className={`text-xs px-2 py-1 border rounded transition-colors ${
                  showNotePanel
                    ? 'border-white/50 text-white'
                    : 'border-white/20 text-white/60 hover:text-white hover:border-white/50'
                }`}
              >
                📝 {t('note.title')}
              </button>
              <span className="text-white/50 text-sm">
                {selectedPhotoIndex + 1} / {currentChapterPhotos.length}
              </span>
              <span className="text-white/30 text-sm">|</span>
              <span className="text-white/40 text-xs">
                {getChapterDisplayTitle(currentChapterPhotos[selectedPhotoIndex].chapter_id)}
              </span>
            </div>
            <button onClick={() => {setSelectedPhotoIndex(null); setShowNotePanel(false)}} className="text-white/70 hover:text-white text-2xl p-3">✕</button>
          </div>

          {/* 중앙: 이미지 + 좌우 화살표 */}
          <div className="flex-1 flex items-center justify-center relative min-h-0" onClick={() => setSelectedPhotoIndex(null)}>
            {selectedPhotoIndex > 0 && (
              <button
                className="absolute left-4 z-10 text-white/70 hover:text-white text-5xl select-none"
                onClick={e => { e.stopPropagation(); setSelectedPhotoIndex(prev => prev! - 1) }}
              >‹</button>
            )}
            <img
              src={currentChapterPhotos[selectedPhotoIndex].image_url ?? ''}
              alt={currentChapterPhotos[selectedPhotoIndex].caption || ''}
              className="max-w-[calc(100%-8rem)] max-h-full object-contain"
              onClick={e => e.stopPropagation()}
            />
            {selectedPhotoIndex < currentChapterPhotos.length - 1 && (
              <button
                className="absolute right-4 z-10 text-white/70 hover:text-white text-5xl select-none"
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
        const bg = dm ? 'bg-[#1A1A1A] text-white' : 'bg-[#F5F0EB] text-gray-900'
        const headerBg = dm ? 'bg-[#1A1A1A]/90 border-white/10' : 'bg-[#F5F0EB]/90 border-gray-200'
        const subText = dm ? 'text-gray-400' : 'text-gray-500'
        const divider = dm ? 'bg-white/10' : 'bg-gray-200'
        const accent = dm ? 'bg-white/30' : 'bg-gray-400'
        const titleColor = dm ? 'text-white' : 'text-gray-900'
        const closeColor = dm ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-700'
        const toggleClass = dm
          ? 'border-gray-600 text-gray-400 hover:text-white'
          : 'border-gray-300 text-gray-500 hover:text-gray-900'

        return (
          <div className={`fixed inset-0 z-[90] ${bg} overflow-y-auto transition-colors duration-300`}>
            {/* 헤더 */}
            <div className={`sticky top-0 z-10 backdrop-blur-sm border-b ${headerBg}`}>
              <div className="max-w-4xl mx-auto px-6 h-12 flex items-center justify-between">
                <span className={`text-xs tracking-widest uppercase ${subText}`}>Portfolio Preview</span>
                <div className="flex items-center gap-3">
                  {/* 다크/라이트 토글 */}
                  <button
                    onClick={() => setPreviewDarkMode(v => !v)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${toggleClass}`}
                  >
                    {dm ? '☀️ ' + t('settings.themeBeige') : '🌙 ' + t('settings.themeDark')}
                  </button>
                  <button
                    onClick={() => setShowPreview(false)}
                    className={`text-xl p-2 transition-colors ${closeColor}`}
                  >✕</button>
                </div>
              </div>
            </div>

            {/* 본문 */}
            <div className="max-w-4xl mx-auto px-6 py-12">
              {chapters.length === 0 ? (
                <p className={`text-center py-20 ${subText}`}>{t('story.noChapter')}</p>
              ) : (
                <div className="space-y-0">
                  {chapters.filter(c => !c.parent_id).map((chapter, idx) => {
                    const subChapters = chapters.filter(c => c.parent_id === chapter.id)
                    const items = getVisibleChapterItems(chapter.id)
                    return (
                      <div key={chapter.id} className="pt-20">
                        {idx > 0 && <div className={`h-px mb-20 ${divider}`} />}

                        {/* 챕터 헤더 */}
                        <div className="mb-10">
                          <div className="flex items-baseline gap-2 mb-2">
                            <p className={`text-xs tracking-widest uppercase ${subText}`}>
                              {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                            </p>
                            <h3 className={`text-2xl font-bold tracking-tight ${titleColor}`} style={{ fontFamily: "'Georgia', serif" }}>
                              {chapter.title}
                            </h3>
                          </div>
                          {chapter.description && (
                            <p className={`text-base leading-relaxed max-w-xl mt-2 ${subText}`} style={{ fontFamily: "'Georgia', serif" }}>
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
                        {subChapters.map((sub, subIdx) => (
                          <div key={sub.id} className="mt-16">
                            <div className={`h-px mb-10 w-1/3 ${divider}`} />
                            <div className="mb-8">
                              <div className="flex items-baseline gap-2 mb-2">
                                <p className={`text-xs tracking-widest uppercase ${subText}`}>
                                  {idx + 1}.{subIdx + 1}
                                </p>
                                <h4 className={`text-xl font-semibold ${titleColor}`} style={{ fontFamily: "'Georgia', serif" }}>
                                  {sub.title}
                                </h4>
                              </div>
                              {sub.description && (
                                <p className={`text-sm leading-relaxed mt-2 max-w-xl ${subText}`} style={{ fontFamily: "'Georgia', serif" }}>
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

      {editingTextItemId && (
      <div
        className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
        onClick={() => setEditingTextItemId(null)}
      >
        <div
          className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <h3 className="text-base font-semibold mb-3 text-gray-900">{t("story.editTextBlock")}</h3>
          <textarea
            className="w-full h-40 px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-gray-900"
            value={textDraft}
            onChange={e => setTextDraft(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2 justify-end mt-4">
            <button
              onClick={() => setEditingTextItemId(null)}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 font-medium"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSaveTextBlock}
              className="px-4 py-2 text-sm rounded-lg bg-gray-900 hover:bg-gray-700 text-white font-medium"
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  )
}
export default memo(ProjectStory)