import { useEffect, useState, useMemo, useRef, memo } from 'react'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import PhotoNotePanel from '../components/PhotoNotePanel'
import { useElectronSidebar } from '../context/ElectronSidebarContext'
import ConfirmModal from '../components/ConfirmModal'

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core'; 

import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';

import { CSS } from '@dnd-kit/utilities';

const API = import.meta.env.VITE_API_URL

interface Chapter {
  id: string
  project_id: string
  title: string
  description: string | null
  order_num: number
  parent_id: string | null
  layout: 'grid' | 'wide' | 'single'  // 추가
}

interface ChapterItem {
  id: string
  chapter_id: string
  order_num: number
  item_type: 'PHOTO' | 'TEXT'
  block_id: string | null        // 추가
  order_in_block: number         // 추가
  // PHOTO 전용
  photo_id: string | null
  image_url: string | null
  caption: string | null
  // TEXT 전용
  text_content: string | null
}

interface Photo {
  id: string
  image_url: string
  caption: string | null
  folder: string | null
}

// 개별 사진 드래그 컴포넌트
interface SortablePhotoChapterProps {
  id: string; 
  imageUrl: string | null;
  photoId: string | null;
  chapterId: string;
  caption: string | null; // 👇 [추가] 캡션 데이터
  onRemove: (chapterId: string, itemId: string) => void;
  onClick: () => void;
  onEditCaption: (photoId: string, currentCaption: string) => void; // 👇 [추가] 캡션 편집 이벤트
}

function SortablePhotoChapter({ id, imageUrl, photoId, chapterId, caption, onRemove, onClick, onEditCaption }: SortablePhotoChapterProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    // 👇 [수정] 최상위를 flex-col로 변경하여 이미지는 고정하고 텍스트만 아래로 늘어나게 설정 (제안 B)
    <div ref={setNodeRef} style={style} className="flex flex-col w-full h-full">
      
      {/* 1. 이미지 컨테이너 (3:2 비율 유지) */}
      <div className="relative group rounded overflow-hidden aspect-[3/2] shadow-sm">
        <img
          src={imageUrl ?? ''}
          alt={caption || ''}
          className="absolute inset-0 w-full h-full object-contain cursor-pointer"
          onClick={onClick}
        />

        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none" />

        {/* 2. 드래그 핸들 */}
        <div
          {...attributes}
          {...listeners}
          className="absolute top-1.5 left-1.5 p-1.5 rounded cursor-grab opacity-0 group-hover:opacity-100 transition-opacity z-20"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 3C6 3.55228 5.55228 4 5 4C4.44772 4 4 3.55228 4 3C4 2.44772 4.44772 2 5 2C5.55228 2 6 2.44772 6 3Z" fill="white"/>
            <path d="M6 8C6 8.55228 5.55228 9 5 9C4.44772 9 4 8.55228 4 8C4 7.44772 4.44772 7 5 7C5.55228 7 6 7.44772 6 8Z" fill="white"/>
            <path d="M6 13C6 13.5523 5.55228 14 5 14C4.44772 14 4 13.5523 4 13C4 12.4477 4.44772 12 5 12C5.55228 12 6 12.4477 6 13Z" fill="white"/>
            <path d="M12 3C12 3.55228 11.5523 4 11 4C10.4477 4 10 3.55228 10 3C10 2.44772 10.4477 2 11 2C11.5523 2 12 2.44772 12 3Z" fill="white"/>
            <path d="M12 8C12 8.55228 11.5523 9 11 9C10.4477 9 10 8.55228 10 8C10 7.44772 10.4477 7 11 7C11.5523 7 12 7.44772 12 8Z" fill="white"/>
            <path d="M12 13C12 13.5523 11.5523 14 11 14C10.4477 14 10 13.5523 10 13C10 12.4477 10.4477 12 11 12C11.5523 12 12 12.4477 12 13Z" fill="white"/>
          </svg>
        </div>

        {/* 3. 삭제 버튼 */}
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(chapterId, id); }}
          className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs font-bold opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-20"
        >
          ×
        </button>

        {/* 👇 [추가] 4. 캡션 편집(물방울) 버튼 */}
        <button
          onClick={(e) => { e.stopPropagation(); onEditCaption(photoId ?? '', caption || ''); }}
          className="absolute bottom-2 right-2 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20"
          title="Edit/Add Comment"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      </div>

      {/* 👇 [추가] 5. 이미지 하단 캡션 노출 영역 (ProjectDetail과 연동) */}
      {caption && (
        <div className="mt-2 px-1 pb-2">
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed whitespace-pre-wrap">
            {caption}
          </p>
        </div>
      )}
    </div>
  );
}

interface SortableTextBlockProps {
  id: string
  itemId: string
  chapterId: string
  text_content: string
  onRemove: (chapterId: string, itemId: string) => void
  onEdit: (itemId: string, currentText: string) => void
}

function SortableTextBlock({ id, itemId, chapterId, text_content, onRemove, onEdit }: SortableTextBlockProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="col-span-3 group relative bg-stone-50 border border-stone-200 rounded-lg px-5 py-4 my-1">
      {/* 드래그 핸들 */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-3 left-3 cursor-grab opacity-0 group-hover:opacity-40 transition-opacity"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M6 3C6 3.55228 5.55228 4 5 4C4.44772 4 4 3.55228 4 3C4 2.44772 4.44772 2 5 2C5.55228 2 6 2.44772 6 3Z" fill="#999"/>
          <path d="M6 8C6 8.55228 5.55228 9 5 9C4.44772 9 4 8.55228 4 8C4 7.44772 4.44772 7 5 7C5.55228 7 6 7.44772 6 8Z" fill="#999"/>
          <path d="M6 13C6 13.5523 5.55228 14 5 14C4.44772 14 4 13.5523 4 13C4 12.4477 4.44772 12 5 12C5.55228 12 6 12.4477 6 13Z" fill="#999"/>
          <path d="M12 3C12 3.55228 11.5523 4 11 4C10.4477 4 10 3.55228 10 3C10 2.44772 10.4477 2 11 2C11.5523 2 12 2.44772 12 3Z" fill="#999"/>
          <path d="M12 8C12 8.55228 11.5523 9 11 9C10.4477 9 10 8.55228 10 8C10 7.44772 10.4477 7 11 7C11.5523 7 12 7.44772 12 8Z" fill="#999"/>
          <path d="M12 13C12 13.5523 11.5523 14 11 14C10.4477 14 10 13.5523 10 13C10 12.4477 10.4477 12 11 12C11.5523 12 12 12.4477 12 13Z" fill="#999"/>
        </svg>
      </div>
      {/* 액션 버튼 */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(itemId, text_content)}
          className="text-xs px-2 py-0.5 rounded border border-gray-300 text-gray-500 hover:text-gray-800 bg-white"
        >
          편집
        </button>
        <button
          onClick={() => onRemove(chapterId, itemId)}
          className="text-xs px-2 py-0.5 rounded border border-red-200 text-red-400 hover:text-red-600 bg-white"
        >
          ×
        </button>
      </div>
      {/* 본문 */}
      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap pl-4">{text_content}</p>
    </div>
  )
}

interface SortablePhotoBlockProps {
  blockId: string
  chapterId: string
  items: ChapterItem[]
  layout: 'grid' | 'wide' | 'single'
  sensors: ReturnType<typeof useSensors>
  onRemoveItem: (chapterId: string, itemId: string) => void
  onEditCaption: (photoId: string, caption: string) => void
  onPhotoClick: (item: ChapterItem) => void
  onInnerDragEnd: (event: DragEndEvent, blockId: string, chapterId: string) => void
}

function SortablePhotoBlock({
  blockId, chapterId, items, layout, sensors,
  onRemoveItem, onEditCaption, onPhotoClick, onInnerDragEnd
}: SortablePhotoBlockProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: blockId })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const gridClass = layout === 'single' ? 'grid-cols-1' : layout === 'wide' ? 'grid-cols-2' : 'grid-cols-3'

  return (
    <div ref={setNodeRef} style={style} className="group/block relative mb-2">
      {/* 블록 드래그 핸들 */}
      <div
        {...attributes}
        {...listeners}
        className="absolute -left-5 top-1/2 -translate-y-1/2 cursor-grab opacity-0 group-hover/block:opacity-40 transition-opacity z-10 p-1"
      >
        <svg width="12" height="20" viewBox="0 0 12 20" fill="none">
          <circle cx="3" cy="4" r="1.5" fill="#999"/>
          <circle cx="9" cy="4" r="1.5" fill="#999"/>
          <circle cx="3" cy="10" r="1.5" fill="#999"/>
          <circle cx="9" cy="10" r="1.5" fill="#999"/>
          <circle cx="3" cy="16" r="1.5" fill="#999"/>
          <circle cx="9" cy="16" r="1.5" fill="#999"/>
        </svg>
      </div>

      {/* 내부 사진 DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(e) => onInnerDragEnd(e, blockId, chapterId)}
      >
        <SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
          <div className={`grid ${gridClass} gap-2`}>
            {items.map(item => (
              <SortablePhotoChapter
                key={item.id}
                id={item.id}
                imageUrl={item.image_url}
                photoId={item.photo_id}
                chapterId={chapterId}
                caption={item.caption}
                onRemove={onRemoveItem}
                onClick={() => onPhotoClick(item)}
                onEditCaption={onEditCaption}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}

function ProjectStory({
  projectId,
  activeTab,
  allPhotos,
  chapterPhotoCount,
  onChapterChange,
  onPhotoUpdate
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
  const [editLayout, setEditLayout] = useState<'grid' | 'wide' | 'single'>('grid')
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

  // 캡션(코멘트) 편집 상태
  const [editingCaptionPhotoId, setEditingCaptionPhotoId] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState('');

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
      const res = await axios.get(`${API}/chapters/?project_id=${projectId}`)
      setChapters(res.data)
      await Promise.all(res.data.map((chapter: Chapter) => fetchChapterPhotos(chapter.id)))
      if (notifyParent) onChapterChange?.(res.data.length)
    } catch (err) {
      console.error(err)
    }
  }
  
  const fetchChapterPhotos = async (chapterId: string) => {
    const res = await axios.get(`${API}/chapters/${chapterId}/items`)
    setChapterPhotos(prev => ({ ...prev, [chapterId]: res.data }))
  }

  // 캡션 저장 로직 (PUT 방식으로 변경) + 낙관적 업데이트 적용 (딜레이 0초)
  const handleSaveCaption = async () => {
    if (!editingCaptionPhotoId) return;

    const targetId = editingCaptionPhotoId;
    const newCaption = captionDraft;

    // 1. 전체 사진 목록(allPhotos)에서 현재 수정 중인 원본 사진 데이터를 찾습니다.
    const originalPhoto = allPhotos.find(p => p.id === targetId);
    
    // ✅ 다국어 적용: 에러 메시지
    if (!originalPhoto) {
      alert(t('photo.error.OriginalNotFound'));
      return;
    }

    // 🔥 [Optimistic Update 1] 서버 응답 대기 없이 화면에 즉시 반영되도록 상태 업데이트
    setChapterPhotos(prev => {
      const next = { ...prev };
      for (const [chId, photos] of Object.entries(next)) {
        next[chId] = photos.map(p => 
          p.photo_id === targetId ? { ...p, caption: newCaption } : p
        );
      }
      return next;
    });

    // 🔥 [Optimistic Update 2] 부모(ProjectDetail)의 전체 사진 배열도 즉시 업데이트!
    // (이전에 안내해 드린 대로 onPhotoUpdate가 인자를 받도록 수정된 상태여야 합니다)
    if (onPhotoUpdate) {
      onPhotoUpdate(targetId, newCaption); 
    }

    // 입력창 즉시 닫기
    setEditingCaptionPhotoId(null);
    setCaptionDraft('');

    try {
      // 2. patch 대신 put을 사용하고, 기존 사진 데이터에 caption만 새것으로 교체하여 서버에 전체를 보냅니다.
      // 화면은 이미 바뀌었으므로 여기서 발생하는 네트워크 딜레이는 사용자가 느끼지 못합니다.
      await axios.put(`${API}/photos/${targetId}`, { 
        ...originalPhoto, 
        caption: newCaption 
      });
      
    } catch (error) {
      // ✅ 다국어 적용: 콘솔 에러 로그 및 사용자 알림(alert)
      console.error(t('photo.error.SaveCaptionFailed'), error);
      alert(t('photo.error.SaveFailedAlert'));
      
      // (선택) 에러가 났을 때만 부모의 전체 데이터를 다시 불러와 원래대로 복구시킬 수 있습니다.
      // onPhotoUpdate(); // 인자 없이 호출하면 기존처럼 fetchPhotos()를 하도록 짤 수도 있습니다.
    }
  };

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

      if (e.key === 'ArrowRight') {
        if (selectedPhotoIndex < lastIndex) {
          setSelectedPhotoIndex(prev => prev! + 1);
          setShowNotePanel(false)
        }
      } else if (e.key === 'ArrowLeft') {
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
      layout: editLayout
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
      layout: editLayout
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
    await axios.delete(`${API}/chapters/${chapterId}/items/${itemId}`)
    fetchChapterPhotos(chapterId)
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

    setChapterPhotos(prev => {
      const items = prev[chapterId] || []
      const blockItems = items.filter(i => i.block_id === blockId)
      const oldIndex = blockItems.findIndex(i => i.id === active.id)
      const newIndex = blockItems.findIndex(i => i.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return prev

      const newBlockItems = arrayMove(blockItems, oldIndex, newIndex)
      const newItems = items.map(i => {
        const newBlockIdx = newBlockItems.findIndex(b => b.id === i.id)
        if (newBlockIdx !== -1) return { ...i, order_in_block: newBlockIdx }
        return i
      })
      return { ...prev, [chapterId]: newItems }
    })

    axios.put(`${API}/chapters/${chapterId}/blocks/${blockId}/reorder`, {
      block_id: blockId,
      item_ids: (() => {
        const items = chapterPhotos[chapterId] || []
        const blockItems = items.filter(i => i.block_id === blockId)
        const oldIndex = blockItems.findIndex(i => i.id === active.id)
        const newIndex = blockItems.findIndex(i => i.id === over.id)
        return arrayMove(blockItems, oldIndex, newIndex).map(i => i.id)
      })()
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
      type: 'PHOTO' | 'TEXT'
      blockId: string        // TEXT는 item.id, PHOTO는 block_id
      items: ChapterItem[]   // TEXT는 1개, PHOTO는 N개
      order_num: number      // 블록의 order_num (같은 블록은 동일)
    }

    const groupIntoBlocks = (items: ChapterItem[]): ChapterBlock[] => {
      const blocks: ChapterBlock[] = []
      const blockMap = new Map<string, ChapterBlock>()

      items.forEach(item => {
        if (item.item_type === 'TEXT') {
          blocks.push({ type: 'TEXT', blockId: item.id, items: [item], order_num: item.order_num })
        } else {
          const bid = item.block_id || item.id
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
          className="w-full mb-3 text-xs bg-stone-600 text-white px-2 py-1.5 rounded hover:bg-stone-700 tracking-wider"
        >
          {t('story.addChapter')}
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
            className="w-full mb-3 text-xs bg-stone-600 text-white px-2 py-1.5 rounded hover:bg-stone-700 transition-colors tracking-wider"
          >
            {t('story.addChapter')}
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
            <div className="flex gap-2 mb-2">
            {(['grid', 'wide', 'single'] as const).map(l => (
              <button
                key={l}
                onClick={() => setEditLayout(l)}
                className={`px-2 py-1 text-xs rounded border ${
                  editLayout === l ? 'bg-stone-600 text-white border-stone-600' : 'border-gray-300 text-gray-500'
                }`}
              >
              {l === 'grid' ? '3열' : l === 'wide' ? '2열' : '1열'}
              </button>
              ))}
            </div>
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
                        <div className="flex gap-2 mb-2">
                          {(['grid', 'wide', 'single'] as const).map(l => (
                            <button
                              key={l}
                              type="button"
                              onClick={() => setEditLayout(l)}
                              className={`px-2 py-1 text-xs rounded border ${
                                editLayout === l ? 'bg-stone-600 text-white border-stone-600' : 'border-gray-300 text-gray-500'
                              }`}
                            >
                              {l === 'grid' ? '3열' : l === 'wide' ? '2열' : '1열'}
                            </button>
                          ))}
                        </div>
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
                              setEditLayout(chapter.layout || 'grid') }}
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
                      <div className="flex gap-2 mb-2">
                      {(['grid', 'wide', 'single'] as const).map(l => (
                        <button
                          key={l}
                          onClick={() => setEditLayout(l)}
                          className={`px-2 py-1 text-xs rounded border ${
                            editLayout === l ? 'bg-stone-600 text-white border-stone-600' : 'border-gray-300 text-gray-500'
                          }`}
                        >
                        {l === 'grid' ? '3열' : l === 'wide' ? '2열' : '1열'}
                        </button>
                        ))}
                      </div>
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
                          onDragEnd={(e) => handleBlockDragEnd(e, chapter.id, blocks)}
                        >
                          <SortableContext items={blocks.map(b => b.blockId)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-2">
                              {blocks.map(block =>
                                block.type === 'TEXT' ? (
                                  <SortableTextBlock
                                    key={block.blockId}
                                    id={block.blockId}
                                    itemId={block.items[0].id}
                                    chapterId={chapter.id}
                                    text_content={block.items[0].text_content || ''}
                                    onRemove={handleRemoveItem}
                                    onEdit={(itemId, text) => { setEditingTextItemId(itemId); setTextDraft(text) }}
                                  />
                                ) : (
                                  <SortablePhotoBlock
                                    key={block.blockId}
                                    blockId={block.blockId}
                                    chapterId={chapter.id}
                                    items={block.items}
                                    layout={chapter.layout || 'grid'}
                                    sensors={sensors}
                                    onRemoveItem={handleRemoveItem}
                                    onEditCaption={(photoId, caption) => {
                                      setEditingCaptionPhotoId(photoId)
                                      setCaptionDraft(caption)
                                    }}
                                    onPhotoClick={(item) => {
                                      const flatPhotos = getFlattenedPhotos().filter(i => i.item_type === 'PHOTO')
                                      const globalIndex = flatPhotos.findIndex(i => i.id === item.id)
                                      setCurrentChapterPhotos(flatPhotos)
                                      setSelectedPhotoIndex(globalIndex)
                                    }}
                                    onInnerDragEnd={handleInnerDragEnd}
                                  />
                                )
                              )}
                            </div>
                          </SortableContext>
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
                          <div className="flex gap-2 mb-2">
                            {(['grid', 'wide', 'single'] as const).map(l => (
                              <button
                                key={l}
                                type="button"
                                onClick={() => setEditLayout(l)}
                                className={`px-2 py-1 text-xs rounded border ${
                                  editLayout === l ? 'bg-stone-600 text-white border-stone-600' : 'border-gray-300 text-gray-500'
                                }`}
                              >
                                {l === 'grid' ? '3열' : l === 'wide' ? '2열' : '1열'}
                              </button>
                            ))}
                          </div>
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
                                setEditLayout(subChapter.layout || 'grid') }}
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
                            onDragEnd={(e) => handleBlockDragEnd(e, subChapter.id, blocks)}
                          >
                            <SortableContext items={blocks.map(b => b.blockId)} strategy={verticalListSortingStrategy}>
                              <div className="space-y-2">
                                {blocks.map(block =>
                                  block.type === 'TEXT' ? (
                                    <SortableTextBlock
                                      key={block.blockId}
                                      id={block.blockId}
                                      itemId={block.items[0].id}
                                      chapterId={subChapter.id}
                                      text_content={block.items[0].text_content || ''}
                                      onRemove={handleRemoveItem}
                                      onEdit={(itemId, text) => { setEditingTextItemId(itemId); setTextDraft(text) }}
                                    />
                                  ) : (
                                    <SortablePhotoBlock
                                      key={block.blockId}
                                      blockId={block.blockId}
                                      chapterId={subChapter.id}
                                      items={block.items}
                                      layout={subChapter.layout || 'grid'}
                                      sensors={sensors}
                                      onRemoveItem={handleRemoveItem}
                                      onEditCaption={(photoId, caption) => {
                                        setEditingCaptionPhotoId(photoId)
                                        setCaptionDraft(caption)
                                      }}
                                      onPhotoClick={(item) => {
                                        const flatPhotos = getFlattenedPhotos().filter(i => i.item_type === 'PHOTO')
                                        const globalIndex = flatPhotos.findIndex(i => i.id === item.id)
                                        setCurrentChapterPhotos(flatPhotos)
                                        setSelectedPhotoIndex(globalIndex)
                                      }}
                                      onInnerDragEnd={handleInnerDragEnd}
                                    />
                                  )
                                )}
                              </div>
                            </SortableContext>
                          </DndContext>
                        )
                      })()}
                      <button
                        onClick={() => handleAddTextBlock(subChapter.id)}
                        className="mt-2 text-xs text-gray-400 hover:text-gray-600 border border-dashed border-gray-300 hover:border-gray-400 rounded px-3 py-1.5 w-full transition-colors"
                      >
                        + 텍스트 블록 추가
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

      {/* 캡션 편집 모달 창 (DeliveryPage 스타일 적용) */}
      {editingCaptionPhotoId && (
        <div
          className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setEditingCaptionPhotoId(null)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold mb-3 text-gray-900">{t('photo.addCaption')}</h3>
            <textarea
              className="w-full h-28 px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder={t('photo.addCaptionDesc')}
              value={captionDraft}
              onChange={e => setCaptionDraft(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2 justify-end mt-4">
              <button
                onClick={() => setEditingCaptionPhotoId(null)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 font-medium"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSaveCaption}
                className="px-4 py-2 text-sm rounded-lg bg-gray-900 hover:bg-gray-700 text-white font-medium shadow-sm"
              >
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingTextItemId && (
      <div
        className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
        onClick={() => setEditingTextItemId(null)}
      >
        <div
          className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <h3 className="text-base font-semibold mb-3 text-gray-900">텍스트 블록 편집</h3>
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
