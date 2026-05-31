import { useEffect, useState, useMemo, useRef, memo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { Eye, Plus, Grid3X3, Rows3, Square, Images, Trash2, ArrowRightLeft } from 'lucide-react'
import ConfirmModal from '../components/ConfirmModal'
import {
  type ChapterItem as StoryChapterItem,
} from '../components/StoryBlocks'
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { StoryChapter } from './story/StoryChapter'
import { imeSafeClick } from '../utils/imeSafeClick'
import { flushPendingTextEdit } from '../utils/pendingTextEdit'
import PhotoLibraryPanel from '../components/PhotoLibraryPanel'
import StoryLightbox from './story/StoryLightbox'
import StoryPreviewModal from './story/StoryPreviewModal'


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

interface StorySidebarContentProps {
  chapters: Chapter[]
  collapsedChapters: Set<string>
  setCollapsedChapters: React.Dispatch<React.SetStateAction<Set<string>>>
  scrollToChapter: (chapterId: string) => void
  setShowAddChapter: (v: boolean) => void
  setAddingSubChapterTo: (v: string | null) => void
  setShowPreview: (v: boolean) => void
  setChapterPreviewId: (v: string) => void
  setChapterPreviewOpen: (v: boolean) => void
  handleMoveChapter: (chapterId: string, direction: 'up' | 'down') => void
  showLibrary: boolean
  setShowLibrary: (v: boolean) => void
}

function StorySidebarContent({
  chapters, collapsedChapters, setCollapsedChapters,
  scrollToChapter, setShowAddChapter, setAddingSubChapterTo,
  setShowPreview, setChapterPreviewId, setChapterPreviewOpen, handleMoveChapter,
  showLibrary, setShowLibrary,
}: StorySidebarContentProps) {
  const { t } = useTranslation()

  return (
    <div className="p-3">
      {/* 챕터 추가 */}
      <button
        onClick={async () => { await flushPendingTextEdit(); setShowAddChapter(true); setAddingSubChapterTo(null) }}
        className="w-full mb-1.5 px-3 py-2 rounded-[1px] inline-flex justify-center items-center gap-2 text-[0.8125rem] font-sans font-medium
                   bg-edit-ink/80 text-edit-paper hover:bg-edit-ink/90
                   transition-colors duration-150"
      >
        <Plus size={13} strokeWidth={1.5} />
        <span>{t('story.addChapter')}</span>
      </button>

      {/* 미리보기 */}
      <button
        onClick={() => setShowPreview(true)}
        className="w-full mb-1.5 px-3 py-2 rounded-[1px] inline-flex justify-center items-center gap-2 text-[0.8125rem] font-sans font-medium
                   border border-edit-line text-edit-muted hover:text-edit-ink hover:border-edit-line-strong
                   transition-colors duration-150"
      >
        <Eye size={13} strokeWidth={1.5} />
        <span>{t('story.preview')}</span>
      </button>

      {/* 사진 라이브러리 토글 */}
      <button
        onClick={() => setShowLibrary(!showLibrary)}
        className={`w-full mb-3 px-3 py-2 rounded-[1px] inline-flex justify-center items-center gap-2 text-[0.8125rem] font-sans font-medium
                   border transition-colors duration-150
                   ${showLibrary
                     ? 'border-edit-ink bg-edit-ink/5 text-edit-ink'
                     : 'border-edit-line text-edit-muted hover:text-edit-ink hover:border-edit-line-strong'
                   }`}
      >
        <Images size={13} strokeWidth={1.5} />
        <span>{t('story.photoLibrary')}</span>
      </button>

      <div className="mx-1 mb-3 border-t border-edit-line" />

      {/* PHOTO 블록 레이아웃 안내 */}
      <div className="px-1 mb-4">
        <p className="t-caption text-center text-edit-faint mb-2">{t('story.layoutGuide')}</p>
        <p className="t-caption text-center text-edit-faint mb-2">{t('story.layoutGuide2')}</p>
        <div className="flex gap-1.5">
          {([
            { icon: <Grid3X3 size={12} strokeWidth={1.5} />, key: 'portfolio.columnGrid' },
            { icon: <Rows3 size={12} strokeWidth={1.5} />, key: 'portfolio.columnWide' },
            { icon: <Square size={12} strokeWidth={1.5} />, key: 'portfolio.columnSingle' },
          ] as const).map(({ icon, key }) => (
            <div
              key={key}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2
                         border border-edit-line rounded-[1px] t-caption text-edit-faint"
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
                    className="shrink-0 pl-1 t-caption text-edit-faint hover:text-edit-ink w-4"
                  >
                    {isCollapsed ? '▸' : '▾'}
                  </button>
                ) : (
                  <span className="shrink-0 w-4" />
                )}
                <button
                  onClick={() => scrollToChapter(chapter.id)}
                  className="flex-1 text-left px-1 py-1 text-[0.8125rem] font-sans text-edit-muted
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
                    className="p-0.5 t-caption text-edit-faint hover:text-edit-ink transition-colors"
                  >
                    <Eye size={11} strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => handleMoveChapter(chapter.id, 'up')}
                    disabled={idx === 0}
                    aria-label="위로 이동"
                    className="px-0.5 py-0.5 t-caption text-edit-faint hover:text-edit-ink
                               disabled:opacity-20 transition-colors"
                  >↑</button>
                  <button
                    onClick={() => handleMoveChapter(chapter.id, 'down')}
                    disabled={idx === mainChapters.length - 1}
                    aria-label="아래로 이동"
                    className="px-0.5 py-0.5 t-caption text-edit-faint hover:text-edit-ink
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
                        className="flex-1 text-left pl-2 py-0.5 text-[0.8125rem] font-sans text-edit-faint
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
                          className="p-0.5 t-caption text-edit-faint hover:text-edit-ink transition-colors"
                        >
                          <Eye size={11} strokeWidth={1.5} />
                        </button>
                        <button
                          onClick={() => handleMoveChapter(sub.id, 'up')}
                          disabled={subIdx === 0}
                          aria-label="위로 이동"
                          className="px-0.5 py-0.5 t-caption text-edit-faint hover:text-edit-ink
                                     disabled:opacity-20 transition-colors"
                        >↑</button>
                        <button
                          onClick={() => handleMoveChapter(sub.id, 'down')}
                          disabled={subIdx === subChapters.length - 1}
                          aria-label="아래로 이동"
                          className="px-0.5 py-0.5 t-caption text-edit-faint hover:text-edit-ink
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

type ToastType = 'success' | 'error' | 'warning'

function ProjectStory({
  projectId,
  activeTab,
  allPhotos,
  onChapterChange,
  showToast,
}: {
  projectId: string,
  activeTab: string,
  allPhotos: Photo[],
  chapterPhotoCount?: number,
  onChapterChange?: () => void,
  onPhotoUpdate?: (photoId: string, newCaption: string) => void,
  showToast?: (message: string, type: ToastType) => void
}) {
  const queryClient = useQueryClient()
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [chapterPhotos, setChapterPhotos] = useState<Record<string, ChapterItem[]>>({})
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [showAddChapter, setShowAddChapter] = useState(false)
  const [addingSubChapterTo, setAddingSubChapterTo] = useState<string | null>(null)
  const [editingChapter, setEditingChapter] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  // textarea/input DOM 직접 읽기용 refs — IME composition commit 직후 React state 가 아직
  // re-render 되지 않은 상태에서도 최신 값을 보장 (StoryBlocks 의 EditTextArea 와 동일 패턴).
  const newTitleRef = useRef<HTMLInputElement>(null)
  const newDescRef = useRef<HTMLTextAreaElement>(null)
  const editTitleRef = useRef<HTMLInputElement>(null)
  const editDescRef = useRef<HTMLTextAreaElement>(null)
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null)
  const [savingChapter, setSavingChapter] = useState(false)

  const { t } = useTranslation()

  // 라이트박스 상태
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [currentChapterPhotos, setCurrentChapterPhotos] = useState<ChapterItem[]>([]);

  // 포트폴리오 미리보기 (모달)
  const [showPreview, setShowPreview] = useState(false)
  const [previewDarkMode, setPreviewDarkMode] = useState(false)
  const [chapterPreviewId, setChapterPreviewId] = useState<string | null>(null)
  const [chapterPreviewOpen, setChapterPreviewOpen] = useState(false)

  // 0-4: 다중 선택 상태
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())
  const lastSelectedRef = useRef<{ chapterId: string; itemId: string } | null>(null)

  const chapterRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const scrollToChapter = (chapterId: string) => {
    chapterRefs.current[chapterId]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const [showNotePanel, setShowNotePanel] = useState(false)
  const [collapsedChapters, setCollapsedChapters] = useState<Set<string>>(new Set())
  const [showLibrary, setShowLibrary] = useState(false)
  // O(N²) 성능 저하를 막기 위한 Set(해시테이블) 캐싱
  const allPhotoIds = useMemo(() => new Set(allPhotos.map(p => p.id)), [allPhotos]);

  // 라이브러리 패널용: 챕터별 이미 추가된 photo_id Set
  const chapterPhotoIds = useMemo(() => {
    const result: Record<string, Set<string>> = {}
    Object.entries(chapterPhotos).forEach(([cid, items]) => {
      result[cid] = new Set(
        items.filter(i => i.item_type === 'PHOTO' && i.photo_id).map(i => i.photo_id!)
      )
    })
    return result
  }, [chapterPhotos])

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

  const { data: storyData } = useQuery({
    queryKey: ['storyChapters', projectId],
    queryFn: async () => (await axios.get(`${API}/chapters/all-items?project_id=${projectId}`)).data,
    enabled: activeTab === 'story',
  })

  useEffect(() => {
    if (!storyData) return
    setChapters(storyData.chapters ?? [])
    setChapterPhotos(storyData.items_by_chapter ?? {})
  }, [storyData])

  // Story 탭 진입 시 항상 최신 데이터 보장 + 라이브러리 패널 초기화
  useEffect(() => {
    if (activeTab === 'story') {
      queryClient.invalidateQueries({ queryKey: ['storyChapters', projectId] })
    } else {
      setShowLibrary(false)
    }
  }, [activeTab, projectId, queryClient])

  const invalidateStory = useCallback(() => {
    // ProjectDetail 도 같은 ['storyChapters', projectId] 캐시를 공유하므로 단일 invalidate 로
    // 양쪽 페이지 모두 갱신됨 (이전엔 별도 chapterPhotos 캐시도 함께 무효화했지만 통합 후 불필요).
    queryClient.invalidateQueries({ queryKey: ['storyChapters', projectId] })
  }, [queryClient, projectId])

  const fetchChapterPhotos = useCallback((_chapterId: string): Promise<void> => {
    return queryClient.invalidateQueries({ queryKey: ['storyChapters', projectId] })
  }, [queryClient, projectId])


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
      if (showLibrary) { setShowLibrary(false); return }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [chapterPreviewOpen, showPreview, showLibrary])

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

  const handleAddChapter = async () => {
    if (savingChapter) return
    // textarea/input DOM 의 값을 직접 읽어 IME race 에서 React state 가 stale 인 경우에도
    // 최신 값으로 저장. ref 가 null 이면 state 로 fallback.
    const title = (newTitleRef.current?.value ?? newTitle).trim()
    const desc = newDescRef.current?.value ?? newDesc
    if (!title) return
    // 편집 중인 텍스트 블록이 있다면 먼저 자동 저장
    await flushPendingTextEdit()
    setSavingChapter(true)
    try {
      await axios.post(`${API}/chapters/`, {
        project_id: projectId,
        title,
        description: desc,
        order_num: chapters.length,
        parent_id: addingSubChapterTo,
      })
      // 성공 시에만 폼 닫기 — 실패 시 사용자가 입력값을 유지하고 재시도 가능.
      setNewTitle('')
      setNewDesc('')
      setShowAddChapter(false)
      setAddingSubChapterTo(null)
      invalidateStory(); onChapterChange?.()
    } catch (err) {
      console.error('챕터 추가 실패:', err)
      showToast?.(t('story.chapterSaveFailed'), 'error')
    } finally {
      setSavingChapter(false)
    }
  }

  const handleUpdateChapter = async (chapter: Chapter) => {
    if (savingChapter) return
    const title = (editTitleRef.current?.value ?? editTitle).trim()
    const desc = editDescRef.current?.value ?? editDesc
    if (!title) return
    // 편집 중인 텍스트 블록이 있다면 먼저 자동 저장
    await flushPendingTextEdit()
    setSavingChapter(true)
    try {
      await axios.put(`${API}/chapters/${chapter.id}`, {
        title,
        description: desc,
        order_num: chapter.order_num,
        parent_id: chapter.parent_id,
        project_id: chapter.project_id,
      })
      setEditingChapter(null)
      invalidateStory(); onChapterChange?.()
    } catch (err) {
      console.error('챕터 수정 실패:', err)
      showToast?.(t('story.chapterSaveFailed'), 'error')
    } finally {
      setSavingChapter(false)
    }
  }

  const handleDeleteChapter = async (chapterId: string) => {
    setConfirmModal({
      message: t('story.chapterDeleteWarning'),
      onConfirm: async () => {
        setConfirmModal(null)
        await axios.delete(`${API}/chapters/${chapterId}`)
        invalidateStory(); onChapterChange?.()
      }
    })
  }

  const closeChapterPreview = () => {
    setChapterPreviewOpen(false)
    setTimeout(() => setChapterPreviewId(null), 300)
    ;(document.activeElement as HTMLElement)?.blur()
  }

  // 블록 간 사진 이동 (move modal에서도 호출)
  const handleCrossBlockMove = useCallback(async (
    chapterId: string,
    itemId: string,
    sourceBlockId: string,
    targetBlockId: string
  ) => {
    if (targetBlockId === 'new') {
      const newBlockId = crypto.randomUUID()
      setChapterPhotos(prev => {
        const all = prev[chapterId] || []
        const sourceOrderNum = all.find(i => i.id === itemId)?.order_num ?? 0
        // source 바로 뒤(order_num + 1)에 자리를 만들기 위해 후속 아이템 +1 시프트.
        // (이전엔 빈 order_num까지 +1 반복 → 후속 블록이 빽빽하면 맨 끝으로 밀려남)
        const targetOrderNum = sourceOrderNum + 1
        const sourceRemaining = all.filter(i =>
          i.block_id === sourceBlockId && i.item_type === 'PHOTO' && i.id !== itemId
        )
        const updated = all.map(i => {
          if (i.id === itemId) return { ...i, block_id: newBlockId, order_in_block: 0, order_num: targetOrderNum, block_layout: 'grid' as const }
          const shifted = i.order_num >= targetOrderNum ? { ...i, order_num: i.order_num + 1 } : i
          const srcIdx = sourceRemaining.findIndex(s => s.id === shifted.id)
          if (srcIdx !== -1) return { ...shifted, order_in_block: srcIdx }
          return shifted
        })
        if (sourceRemaining.length === 0) {
          return { ...prev, [chapterId]: updated.map(i => i.block_id === sourceBlockId && i.item_type === 'TEXT' ? { ...i, block_id: crypto.randomUUID(), block_type: 'default' } : i) }
        }
        return { ...prev, [chapterId]: updated }
      })
      try {
        await axios.put(`${API}/chapters/${chapterId}/items/move-to-block`, { item_id: itemId, target_block_id: newBlockId })
      } catch (err) {
        console.error('새 블록 이동 실패:', err)
        fetchChapterPhotos(chapterId)
      }
      return
    }
    setChapterPhotos(prev => {
      const all = prev[chapterId] || []
      const prevTargetItems = all.filter(i => i.block_id === targetBlockId && i.item_type === 'PHOTO')
      // target 블록에 PHOTO가 하나도 없는 비정상 케이스 — 새 블록 분기와 동일하게 source 바로 뒤로 처리
      if (prevTargetItems.length === 0) {
        const sourceOrderNum = all.find(i => i.id === itemId)?.order_num ?? 0
        const targetOrderNum = sourceOrderNum + 1
        const sourceRemaining = all.filter(i =>
          i.block_id === sourceBlockId && i.item_type === 'PHOTO' && i.id !== itemId
        )
        const updated = all.map(i => {
          if (i.id === itemId) return { ...i, block_id: targetBlockId, order_in_block: 0, order_num: targetOrderNum, block_layout: 'grid' as const }
          const shifted = i.order_num >= targetOrderNum ? { ...i, order_num: i.order_num + 1 } : i
          const srcIdx = sourceRemaining.findIndex(s => s.id === shifted.id)
          if (srcIdx !== -1) return { ...shifted, order_in_block: srcIdx }
          return shifted
        })
        if (sourceRemaining.length === 0) {
          return { ...prev, [chapterId]: updated.map(i => i.block_id === sourceBlockId && i.item_type === 'TEXT' ? { ...i, block_id: crypto.randomUUID(), block_type: 'default' } : i) }
        }
        return { ...prev, [chapterId]: updated }
      }
      const prevTargetLayout = prevTargetItems[0].block_layout || 'grid'
      const prevTargetOrderNum = prevTargetItems[0].order_num
      const prevSourceRemaining = all.filter(i => i.block_id === sourceBlockId && i.item_type === 'PHOTO' && i.id !== itemId)
      const updated = all.map(i => {
        if (i.id === itemId) return { ...i, block_id: targetBlockId, order_in_block: prevTargetItems.length, order_num: prevTargetOrderNum, block_layout: prevTargetLayout }
        const srcIdx = prevSourceRemaining.findIndex(s => s.id === i.id)
        if (srcIdx !== -1) return { ...i, order_in_block: srcIdx }
        return i
      })
      if (prevSourceRemaining.length === 0) {
        return { ...prev, [chapterId]: updated.map(i => i.block_id === sourceBlockId && i.item_type === 'TEXT' ? { ...i, block_id: crypto.randomUUID(), block_type: 'default' } : i) }
      }
      return { ...prev, [chapterId]: updated }
    })
    try {
      await axios.put(`${API}/chapters/${chapterId}/items/move-to-block`, { item_id: itemId, target_block_id: targetBlockId })
    } catch (err) {
      console.error('블록 간 이동 실패:', err)
      fetchChapterPhotos(chapterId)
    }
  }, [fetchChapterPhotos])

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
        invalidateStory(); onChapterChange?.()
      } catch (error) {
        console.error(t('story.error.ReorderFailedLog'), error)
        showToast?.(t('story.error.ReorderFailedAlert'), 'error')
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



  // 0-4: 다중 이동 모달
  const [moveModalItems, setMoveModalItems] = useState<{
    itemIds: string[]
    chapterId: string
    sourceBlockIds: string[]
  } | null>(null)

  // ref — stable callbacks용
  const blocksPerChapterRef = useRef(blocksPerChapter)
  blocksPerChapterRef.current = blocksPerChapter
  const chaptersRef = useRef(chapters)
  chaptersRef.current = chapters
  const chapterPhotosRef = useRef(chapterPhotos)
  chapterPhotosRef.current = chapterPhotos
  const allPhotoIdsRef = useRef(allPhotoIds)
  allPhotoIdsRef.current = allPhotoIds

  // stable callbacks — StoryChapter에 prop으로 전달
  const onOpenLightbox = useCallback((clickedItem: ChapterItem) => {
    const currentChapters = chaptersRef.current
    const currentChapterPhotos = chapterPhotosRef.current
    const currentAllPhotoIds = allPhotoIdsRef.current

    const getVisible = (cid: string) =>
      (currentChapterPhotos[cid] || [])
        .filter(i => i.item_type === 'TEXT' || (i.photo_id != null && currentAllPhotoIds.has(i.photo_id)))
        .sort((a, b) => a.order_num !== b.order_num ? a.order_num - b.order_num : a.order_in_block - b.order_in_block)

    let flat: ChapterItem[] = []
    currentChapters.filter(c => !c.parent_id).forEach(mainChap => {
      flat = flat.concat(getVisible(mainChap.id))
      currentChapters.filter(c => c.parent_id === mainChap.id).forEach(subChap => {
        flat = flat.concat(getVisible(subChap.id))
      })
    })
    const flatPhotos = flat.filter(i => i.item_type === 'PHOTO')
    setCurrentChapterPhotos(flatPhotos)
    setSelectedPhotoIndex(flatPhotos.findIndex(i => i.id === clickedItem.id))
  }, [])

  const onItemToggle = useCallback((chapterId: string, itemId: string, shiftKey: boolean, _metaKey: boolean) => {
    if (shiftKey && lastSelectedRef.current?.chapterId === chapterId) {
      const flatOrder = (blocksPerChapterRef.current[chapterId] || [])
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
  }, [])

  const onRequestBulkMove = useCallback((data: { itemIds: string[]; chapterId: string; sourceBlockIds: string[] }) => {
    setMoveModalItems(data)
  }, [])

  const onConfirmModal = useCallback((modal: { message: string; onConfirm: () => void }) => {
    setConfirmModal({
      message: modal.message,
      onConfirm: () => { setConfirmModal(null); modal.onConfirm() },
    })
  }, [])

  // 플로팅 바 — 단일 챕터 선택 여부 계산 (이동 버튼용)
  const selectedChapterData = useMemo(() => {
    const byChapter: Record<string, { itemIds: string[]; blockIds: string[] }> = {}
    Object.entries(chapterPhotos).forEach(([cid, items]) => {
      const sel = items.filter(i => i.item_type === 'PHOTO' && selectedItemIds.has(i.id))
      if (sel.length > 0) {
        byChapter[cid] = {
          itemIds: sel.map(i => i.id),
          blockIds: [...new Set(sel.map(i => i.block_id).filter((id): id is string => !!id))],
        }
      }
    })
    const cids = Object.keys(byChapter)
    return cids.length === 1 ? { chapterId: cids[0], ...byChapter[cids[0]] } : null
  }, [chapterPhotos, selectedItemIds])

  // 플로팅 바 — 전체 챕터에서 선택된 항목 일괄 삭제
  const handleGlobalBulkDelete = useCallback(async () => {
    const currentChapterPhotos = chapterPhotosRef.current
    const byChapter: Record<string, string[]> = {}
    Object.entries(currentChapterPhotos).forEach(([cid, items]) => {
      const ids = items
        .filter(i => i.item_type === 'PHOTO' && selectedItemIds.has(i.id))
        .map(i => i.id)
      if (ids.length > 0) byChapter[cid] = ids
    })
    setChapterPhotos(prev => {
      const next = { ...prev }
      Object.entries(byChapter).forEach(([cid, ids]) => {
        next[cid] = (prev[cid] || []).filter(i => !ids.includes(i.id))
      })
      return next
    })
    setSelectedItemIds(new Set())
    try {
      await Promise.all(
        Object.entries(byChapter).flatMap(([cid, ids]) =>
          ids.map(itemId => axios.delete(`${API}/chapters/${cid}/items/${itemId}`))
        )
      )
      // 낙관적 setChapterPhotos 로 Story 탭 UI 는 즉시 갱신되지만, ProjectDetail 의
      // chapterPhotoIds 도 같은 storyChapters 캐시에서 derive 하므로 invalidate 로 동기화.
      queryClient.invalidateQueries({ queryKey: ['storyChapters', projectId] })
    } catch (err) {
      console.error('일괄 삭제 실패:', err)
      Object.keys(byChapter).forEach(cid => fetchChapterPhotos(cid))
    }
  }, [selectedItemIds, setChapterPhotos, fetchChapterPhotos, queryClient, projectId])

  // 0-4: 일괄 이동
  const handleBulkMove = useCallback(async (
    chapterId: string,
    itemIds: string[],
    targetBlockId: string
  ) => {
    const resolvedTargetId = targetBlockId === 'new' ? crypto.randomUUID() : targetBlockId
    // 다중 호출 anchor — 첫 itemId의 원본 order_num. backend가 누적 시프트 방지에 사용.
    let sourceOrderNum: number | undefined

    // 낙관적 업데이트
    setChapterPhotos(prev => {
      const all = prev[chapterId] || []
      const firstSource = all.find(i => i.id === itemIds[0])
      if (!firstSource) return prev
      sourceOrderNum = firstSource.order_num

      if (targetBlockId === 'new') {
        // 새 블록: source 바로 뒤(order_num + 1)에 자리 → 후속 아이템 +1 시프트
        const targetOrderNum = sourceOrderNum + 1
        const movingIds = new Set(itemIds)
        // 각 itemId의 원래 block_id별 남은 PHOTO 그룹 (order_in_block 재정렬용)
        const sourceBlockIds = new Set(
          itemIds
            .map(id => all.find(i => i.id === id)?.block_id)
            .filter((bid): bid is string => !!bid)
        )
        const sourceRemainingByBlock = new Map<string, ChapterItem[]>()
        sourceBlockIds.forEach(bid => {
          sourceRemainingByBlock.set(
            bid,
            all.filter(i => i.block_id === bid && i.item_type === 'PHOTO' && !movingIds.has(i.id))
          )
        })

        const updated = all.map(i => {
          if (movingIds.has(i.id)) {
            const idx = itemIds.indexOf(i.id)
            return { ...i, block_id: resolvedTargetId, order_in_block: idx, order_num: targetOrderNum, block_layout: 'grid' as const }
          }
          const shifted = i.order_num >= targetOrderNum ? { ...i, order_num: i.order_num + 1 } : i
          for (const [, remaining] of sourceRemainingByBlock) {
            const srcIdx = remaining.findIndex(s => s.id === shifted.id)
            if (srcIdx !== -1) return { ...shifted, order_in_block: srcIdx }
          }
          return shifted
        })

        // 비게 된 source 블록의 side-by-side 텍스트 자동 해제
        let finalItems = updated
        sourceRemainingByBlock.forEach((remaining, bid) => {
          if (remaining.length === 0) {
            finalItems = finalItems.map(i => i.block_id === bid && i.item_type === 'TEXT'
              ? { ...i, block_id: crypto.randomUUID(), block_type: 'default' } : i)
          }
        })
        return { ...prev, [chapterId]: finalItems }
      }

      // 기존 블록 분기 — target_items[0]의 order_num 공유 (분산 없음)
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
          source_order_num: sourceOrderNum,
        })
      ))
    } catch (err) {
      console.error('일괄 이동 실패:', err)
      fetchChapterPhotos(chapterId)
    }
  }, [fetchChapterPhotos])

  const sidebarSlot = document.getElementById('sidebar-content-slot')

  return (
    <div className="relative flex flex-row items-start gap-6">

    {sidebarSlot && activeTab === 'story' && createPortal(
      <StorySidebarContent
        chapters={chapters}
        collapsedChapters={collapsedChapters}
        setCollapsedChapters={setCollapsedChapters}
        scrollToChapter={scrollToChapter}
        setShowAddChapter={setShowAddChapter}
        setAddingSubChapterTo={setAddingSubChapterTo}
        setShowPreview={setShowPreview}
        setChapterPreviewId={setChapterPreviewId}
        setChapterPreviewOpen={setChapterPreviewOpen}
        handleMoveChapter={handleMoveChapter}
        showLibrary={showLibrary}
        setShowLibrary={setShowLibrary}
      />,
      sidebarSlot
    )}

    {confirmModal && (
      <ConfirmModal
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(null)}
        dangerous
      />
    )}



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

      <div className="flex-1 max-w-5xl flex flex-col gap-4">

        {/* 챕터 추가 폼 — 사이드바 버튼 클릭 시 표시 */}
        {showAddChapter && !addingSubChapterTo && (
          <div className="bg-edit-paper border border-edit-line rounded-btn px-8 py-10">
            <div className="pb-4">
              <p className="t-eyebrow text-edit-muted mb-2">{t('project.labelTitle')}<span className="text-edit-danger ml-1">*</span></p>
              <input
                ref={newTitleRef}
                className="w-full font-serif text-body bg-transparent border-0 border-b border-edit-line
                           focus:border-edit-ink focus:outline-none py-2 transition-colors duration-150
                           placeholder:text-edit-faint"
                placeholder={t('story.chapterTitle')}
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                autoFocus
              />
            </div>
            <div className="py-4">
              <p className="t-eyebrow text-edit-muted mb-2">{t('project.labelDescription')}</p>
              <textarea
                className="w-full font-serif text-body bg-transparent border-0 border-b border-edit-line
                           focus:border-edit-ink focus:outline-none py-2 resize-none transition-colors duration-150
                           placeholder:text-edit-faint"
                placeholder={t('story.chapterDescription')}
                rows={1}
                value={newDesc}
                ref={el => { newDescRef.current = el; if (el) { el.style.height = 'auto'; el.style.height = `${Math.max(el.scrollHeight, 72)}px` } }}
                onInput={e => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = `${Math.max(el.scrollHeight, 72)}px` }}
                onChange={e => setNewDesc(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowAddChapter(false); setAddingSubChapterTo(null); setNewTitle(''); setNewDesc('') }}
                className="t-caption px-4 py-2 text-edit-muted hover:text-edit-ink transition-colors"
              >{t('common.cancel')}</button>
              <button
                {...imeSafeClick(handleAddChapter)}
                disabled={savingChapter || !newTitle.trim()}
                className="t-caption px-5 py-2 bg-edit-ink text-edit-paper rounded-[1px]
                           hover:bg-edit-ink/85 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >{savingChapter ? t('common.saving') : t('common.add')}</button>
            </div>
          </div>
        )}

        {/* 챕터 목록 */}
        <div className="space-y-4">
        {chapters
          .filter(c => !c.parent_id)
          .map((chapter, idx) => {
            const subChapters = chapters.filter(c => c.parent_id === chapter.id)

            return (
              <div
                key={chapter.id}
                ref={el => { chapterRefs.current[chapter.id] = el }}
                className="group/chapter bg-edit-paper border border-edit-line rounded-btn px-8 py-10"
              >
                {/* 최상위 챕터 헤더 — hairline 구조 */}
                <header className="mb-6">
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
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => { setChapterPreviewId(chapter.id); setChapterPreviewOpen(true) }}
                        aria-label="챕터 미리보기"
                        className="t-caption text-edit-muted hover:text-edit-ink transition-colors
                                   inline-flex items-center gap-1"
                      >
                        <Eye size={12} strokeWidth={1.5} />
                      </button>
                      <button
                        onClick={async () => { await flushPendingTextEdit(); setShowAddChapter(true); setAddingSubChapterTo(chapter.id); setNewTitle(''); setNewDesc('') }}
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
                        onClick={async () => { await flushPendingTextEdit(); setEditingChapter(chapter.id); setEditTitle(chapter.title); setEditDesc(chapter.description || '') }}
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

                  {/* description — 편집 중이 아닐 때만 표시 */}
                  {chapter.description && editingChapter !== chapter.id && (
                    <p className="font-serif text-small text-edit-muted max-w-xl [word-break:keep-all] mt-1.5 whitespace-pre-wrap">
                      {chapter.description}
                    </p>
                  )}

                  {/* 편집 폼 — 헤더 아래 인라인 */}
                  {editingChapter === chapter.id ? (
                    <div className="mt-5 pt-5 border-t border-edit-line">
                      <div className="pb-4">
                        <p className="t-eyebrow text-edit-muted mb-2">{t('project.labelTitle')}<span className="text-edit-danger ml-1">*</span></p>
                        <input
                          ref={editTitleRef}
                          className="w-full font-serif text-body bg-transparent border-0 border-b border-edit-line
                                     focus:border-edit-ink focus:outline-none py-2 transition-colors duration-150
                                     placeholder:text-edit-faint"
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <div className="py-4">
                        <p className="t-eyebrow text-edit-muted mb-2">{t('project.labelDescription')}</p>
                        <textarea
                          className="w-full font-serif text-body bg-transparent border-0 border-b border-edit-line
                                     focus:border-edit-ink focus:outline-none py-2 resize-none transition-colors duration-150
                                     placeholder:text-edit-faint"
                          rows={1}
                          value={editDesc}
                          ref={el => { editDescRef.current = el; if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px` } }}
                          onInput={e => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px` }}
                          onChange={e => setEditDesc(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setEditingChapter(null)}
                          className="t-caption px-4 py-2 text-edit-muted hover:text-edit-ink transition-colors"
                        >{t('common.cancel')}</button>
                        <button
                          {...imeSafeClick(() => handleUpdateChapter(chapter))}
                          disabled={savingChapter || !editTitle.trim()}
                          className="t-caption px-5 py-2 bg-edit-ink text-edit-paper rounded-[1px]
                                     hover:bg-edit-ink/85 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >{savingChapter ? t('common.saving') : t('common.save')}</button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 h-px bg-edit-line" />
                  )}
                </header>

                {/* 서브 챕터 추가 폼 */}
                {addingSubChapterTo === chapter.id && (
                  <div className="ml-6 mt-2 mb-6 pl-5 border-l border-edit-line">
                    <p className="t-eyebrow text-edit-faint mb-4">
                      ↳ {chapter.title} · {t('story.addSubChapter')}
                    </p>
                    <div className="pb-4">
                      <p className="t-eyebrow text-edit-muted mb-2">{t('project.labelTitle')}<span className="text-edit-danger ml-1">*</span></p>
                      <input
                        ref={newTitleRef}
                        className="w-full font-serif text-body bg-transparent border-0 border-b border-edit-line
                                   focus:border-edit-ink focus:outline-none py-2 transition-colors duration-150
                                   placeholder:text-edit-faint"
                        placeholder={t('story.chapterTitle')}
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="py-4">
                      <p className="t-eyebrow text-edit-muted mb-2">{t('project.labelDescription')}</p>
                      <textarea
                        className="w-full font-serif text-body bg-transparent border-0 border-b border-edit-line
                                   focus:border-edit-ink focus:outline-none py-2 resize-none transition-colors duration-150
                                   placeholder:text-edit-faint"
                        placeholder={t('story.chapterDescription')}
                        rows={1}
                        value={newDesc}
                        ref={el => { newDescRef.current = el; if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px` } }}
                        onInput={e => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px` }}
                        onChange={e => setNewDesc(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => { setShowAddChapter(false); setAddingSubChapterTo(null); setNewTitle(''); setNewDesc('') }}
                        className="t-caption px-4 py-2 text-edit-muted hover:text-edit-ink transition-colors"
                      >{t('common.cancel')}</button>
                      <button
                        {...imeSafeClick(handleAddChapter)}
                        className="t-caption px-5 py-2 bg-edit-ink text-edit-paper rounded-[1px]
                                   hover:bg-edit-ink/85 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >{t('common.add')}</button>
                    </div>
                  </div>
                )}

                {/* 챕터 블록 영역 */}
                <StoryChapter
                  chapterId={chapter.id}
                  blocks={blocksPerChapter[chapter.id] || []}
                  items={chapterPhotos[chapter.id] || []}
                  selectedItemIds={selectedItemIds}
                  sensors={sensors}
                  onOpenLightbox={onOpenLightbox}
                  setChapterPhotos={setChapterPhotos}
                  fetchChapterPhotos={fetchChapterPhotos}
                  onChapterChange={onChapterChange}
                  onItemToggle={onItemToggle}
                  onCrossBlockMove={handleCrossBlockMove}
                  showToast={showToast}
                  onRequestConfirm={(message, onConfirm) => setConfirmModal({
                    message,
                    onConfirm: () => { setConfirmModal(null); onConfirm() },
                  })}
                />

                {/* 서브챕터들 */}
                {subChapters.map((subChapter, subIdx) => (
                  <div key={subChapter.id}>
                    <div className="ml-6 border-t border-dashed border-edit-line mt-10 mb-10" />
                  <div
                    ref={el => { chapterRefs.current[subChapter.id] = el }}
                    className="ml-6 pl-6 border-l-2 border-edit-line group/chapter"
                  >
                    {/* 서브챕터 헤더 */}
                    <header className="mb-6">
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
                            <div className="flex items-center gap-3 shrink-0">
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
                                onClick={async () => { await flushPendingTextEdit(); setEditingChapter(subChapter.id); setEditTitle(subChapter.title); setEditDesc(subChapter.description || '') }}
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

                          {/* description — 편집 중이 아닐 때만 표시 */}
                          {subChapter.description && editingChapter !== subChapter.id && (
                            <p className="font-serif text-small text-edit-muted max-w-xl [word-break:keep-all] mt-1.5 whitespace-pre-wrap">
                              {subChapter.description}
                            </p>
                          )}

                          {/* 편집 폼 — 헤더 아래 인라인 */}
                          {editingChapter === subChapter.id ? (
                            <div className="mt-5 pt-5 border-t border-edit-line">
                              <div className="pb-4">
                                <p className="t-eyebrow text-edit-muted mb-2">{t('project.labelTitle')}<span className="text-edit-danger ml-1">*</span></p>
                                <input
                                  ref={editTitleRef}
                                  className="w-full font-serif text-body bg-transparent border-0 border-b border-edit-line
                                             focus:border-edit-ink focus:outline-none py-2 transition-colors duration-150
                                             placeholder:text-edit-faint"
                                  value={editTitle}
                                  onChange={e => setEditTitle(e.target.value)}
                                  autoFocus
                                />
                              </div>
                              <div className="py-4">
                                <p className="t-eyebrow text-edit-muted mb-2">{t('project.labelDescription')}</p>
                                <textarea
                                  ref={editDescRef}
                                  className="w-full font-serif text-body bg-transparent border-0 border-b border-edit-line
                                             focus:border-edit-ink focus:outline-none py-2 resize-none transition-colors duration-150
                                             placeholder:text-edit-faint"
                                  rows={2}
                                  value={editDesc}
                                  onChange={e => setEditDesc(e.target.value)}
                                />
                              </div>
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => setEditingChapter(null)}
                                  className="t-caption px-4 py-2 text-edit-muted hover:text-edit-ink transition-colors"
                                >{t('common.cancel')}</button>
                                <button
                                  {...imeSafeClick(() => handleUpdateChapter(subChapter))}
                                  disabled={savingChapter || !editTitle.trim()}
                                  className="t-caption px-5 py-2 bg-edit-ink text-edit-paper rounded-[1px]
                                             hover:bg-edit-ink/85 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >{savingChapter ? t('common.saving') : t('common.save')}</button>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-4 h-px bg-edit-line" />
                          )}
                    </header>

                    {/* 서브챕터 블록 영역 */}
                    <StoryChapter
                      chapterId={subChapter.id}
                      blocks={blocksPerChapter[subChapter.id] || []}
                      items={chapterPhotos[subChapter.id] || []}
                      selectedItemIds={selectedItemIds}
                      sensors={sensors}
                      onOpenLightbox={onOpenLightbox}
                      setChapterPhotos={setChapterPhotos}
                      fetchChapterPhotos={fetchChapterPhotos}
                      onChapterChange={onChapterChange}
                      onItemToggle={onItemToggle}
                      onCrossBlockMove={handleCrossBlockMove}
                      showToast={showToast}
                      onRequestConfirm={(message, onConfirm) => setConfirmModal({
                    message,
                    onConfirm: () => { setConfirmModal(null); onConfirm() },
                  })}
                        />
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

      {showLibrary && (
        <PhotoLibraryPanel
          photos={allPhotos}
          chapters={chapters}
          projectId={projectId}
          chapterPhotoIds={chapterPhotoIds}
          onClose={() => setShowLibrary(false)}
        />
      )}

      {selectedPhotoIndex !== null && currentChapterPhotos[selectedPhotoIndex] && (
        <StoryLightbox
          photos={currentChapterPhotos}
          selectedIndex={selectedPhotoIndex}
          showNotePanel={showNotePanel}
          projectId={projectId}
          onClose={() => setSelectedPhotoIndex(null)}
          onNavigate={setSelectedPhotoIndex}
          onToggleNotePanel={() => setShowNotePanel(v => !v)}
          onCloseNotePanel={() => setShowNotePanel(false)}
          getChapterDisplayTitle={getChapterDisplayTitle}
        />
      )}

      <StoryPreviewModal
        chapters={chapters}
        showPreview={showPreview}
        onClosePreview={() => setShowPreview(false)}
        chapterPreviewId={chapterPreviewId}
        chapterPreviewOpen={chapterPreviewOpen}
        previewDarkMode={previewDarkMode}
        setPreviewDarkMode={setPreviewDarkMode}
        getVisibleChapterItems={getVisibleChapterItems}
        closeChapterPreview={closeChapterPreview}
      />

      {/* 다중 선택 플로팅 바 */}
      {selectedItemIds.size > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-canvas-2 border border-ink-2 px-3 py-2 rounded-card shadow flex items-center gap-8 z-[100] animate-fade-in-up">
          <span className="font-bold text-menu text-ink-2">
            {t('story.multiplePhotoSelected', { count: selectedItemIds.size })}
          </span>
          <div className="flex gap-3 relative">
            {/* 다른 블록으로 이동 — 단일 챕터 선택 시만 활성화 */}
            <button
              onClick={() => selectedChapterData && onRequestBulkMove({
                itemIds: selectedChapterData.itemIds,
                chapterId: selectedChapterData.chapterId,
                sourceBlockIds: selectedChapterData.blockIds,
              })}
              disabled={!selectedChapterData}
              className="inline-flex items-center gap-1.5 px-2 py-1.5 font-bold text-menu btn-secondary-on-card border hover:bg-faint/40 border-muted disabled:opacity-30 disabled:cursor-not-allowed transition-[background,color,border] duration-150 ease-out"
            >
              <ArrowRightLeft size={13} strokeWidth={1.5} />{t('story.toOtherBlock')}
            </button>
            <button
              onClick={() => onConfirmModal({
                message: t('story.bulkDeleteConfirm', { count: selectedItemIds.size }),
                onConfirm: handleGlobalBulkDelete,
              })}
              className="inline-flex items-center gap-1.5 px-2 py-1.5 font-bold text-menu bg-red-500 text-white hover:bg-red-600 border border-red-500 transition-colors ease-out"
            >
              <Trash2 size={13} strokeWidth={1.5} />{t('common.delete')}
            </button>
            <button
              onClick={() => setSelectedItemIds(new Set())}
              className="px-2 py-1.5 text-menu btn-secondary-on-card border border-hair font-medium transition-[background,color,border] duration-150 ease-out"
            >
              {t('story.deselectAll')}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
export default memo(ProjectStory)