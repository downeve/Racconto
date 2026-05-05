import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import axios from 'axios'
import { arrayMove } from '@dnd-kit/sortable'
import { useTranslation } from 'react-i18next'
import { useMobileLayout } from '../../../context/MobileLayoutContext'
import MobileSegmentTabs from '../MobileSegmentTabs'
import MobileStoryEditor from './MobileStoryEditor'
import MobileStoryViewer from './MobileStoryViewer'
import MobileTextEditorModal from './MobileTextEditorModal'
import type { ChapterItem } from '../../StoryBlocks'

const API = import.meta.env.VITE_API_URL

interface Chapter {
  id: string
  project_id: string
  title: string
  description: string | null
  order_num: number
  parent_id: string | null
}

interface ChapterBlock {
  type: 'PHOTO' | 'TEXT' | 'SIDE'
  blockId: string
  items: ChapterItem[]
  order_num: number
}

interface Photo {
  id: string
  image_url: string
}

function groupIntoBlocks(items: ChapterItem[]): ChapterBlock[] {
  const blocks: ChapterBlock[] = []
  const blockMap = new Map<string, ChapterBlock>()

  items.forEach(item => {
    const bid = item.block_id || item.id
    const isSide = item.block_type === 'side-left' || item.block_type === 'side-right'

    if (item.item_type === 'TEXT' && !isSide) {
      blocks.push({ type: 'TEXT', blockId: item.id, items: [item], order_num: item.order_num })
    } else if (isSide) {
      if (blockMap.has(bid)) {
        const b = blockMap.get(bid)!
        b.items.push(item)
        b.order_num = Math.min(b.order_num, item.order_num)
      } else {
        const b: ChapterBlock = { type: 'SIDE', blockId: bid, items: [item], order_num: item.order_num }
        blockMap.set(bid, b)
        blocks.push(b)
      }
    } else {
      if (blockMap.has(bid)) {
        blockMap.get(bid)!.items.push(item)
      } else {
        const b: ChapterBlock = { type: 'PHOTO', blockId: bid, items: [item], order_num: item.order_num }
        blockMap.set(bid, b)
        blocks.push(b)
      }
    }
  })

  return blocks.map(block => {
    if (block.type !== 'SIDE') return block
    if (block.items.some(i => i.item_type === 'PHOTO')) return block
    const textItem = block.items.find(i => i.item_type === 'TEXT')
    if (!textItem) return block
    return { type: 'TEXT' as const, blockId: textItem.id, items: [textItem], order_num: block.order_num }
  })
}

interface MobileStoryTabProps {
  projectId: string
  allPhotos: Photo[]
}

type StoryMode = 'edit' | 'preview'

export default function MobileStoryTab({ projectId, allPhotos }: MobileStoryTabProps) {
  const { t } = useTranslation()
  const { setFabAction } = useMobileLayout()

  const [mode, setMode] = useState<StoryMode>('edit')
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [chapterPhotos, setChapterPhotos] = useState<Record<string, ChapterItem[]>>({})
  const [addingTextChapterId, setAddingTextChapterId] = useState<string | null>(null)
  const [newTextDraft, setNewTextDraft] = useState('')
  const [showNewTextPreview, setShowNewTextPreview] = useState(false)
  const fetchSeqRef = useRef<Record<string, number>>({})

  // 첫 번째 챕터 선택 (단순화: 모바일은 첫 챕터만 표시)
  // 실제로는 모든 챕터를 표시
  const allPhotoIds = useMemo(() => new Set(allPhotos.map(p => p.id)), [allPhotos])

  const blocksPerChapter = useMemo(() => {
    const map: Record<string, ChapterBlock[]> = {}
    Object.keys(chapterPhotos).forEach(chapterId => {
      const visible = (chapterPhotos[chapterId] || [])
        .filter(item => item.item_type === 'TEXT' || (item.photo_id != null && allPhotoIds.has(item.photo_id)))
        .sort((a, b) => {
          if (a.order_num !== b.order_num) return a.order_num - b.order_num
          return a.order_in_block - b.order_in_block
        })
      map[chapterId] = groupIntoBlocks(visible)
    })
    return map
  }, [chapterPhotos, allPhotoIds])

  const fetchChapterPhotos = useCallback(async (chapterId: string) => {
    fetchSeqRef.current[chapterId] = (fetchSeqRef.current[chapterId] ?? 0) + 1
    const seq = fetchSeqRef.current[chapterId]
    const res = await axios.get(`${API}/chapters/${chapterId}/items`)
    setChapterPhotos(prev => {
      if (fetchSeqRef.current[chapterId] !== seq) return prev
      return { ...prev, [chapterId]: res.data }
    })
  }, [])

  const fetchChapters = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/chapters/all-items?project_id=${projectId}`)
      setChapters(res.data.chapters)
      setChapterPhotos(res.data.items_by_chapter)
    } catch (err) {
      console.error(err)
    }
  }, [projectId])

  useEffect(() => {
    fetchChapters()
  }, [fetchChapters])

  // FAB: 편집 모드에서 첫 번째 챕터에 텍스트 블록 추가
  useEffect(() => {
    if (mode === 'edit') {
      const topChapter = chapters.find(c => !c.parent_id)
      setFabAction(topChapter ? () => () => {
        setAddingTextChapterId(topChapter.id)
        setNewTextDraft('')
        setShowNewTextPreview(false)
      } : null)
    } else {
      setFabAction(null)
    }
    return () => setFabAction(null)
  }, [mode, chapters, setFabAction])

  const handleMoveBlockUp = useCallback((chapterId: string, blockId: string) => {
    const blocks = blocksPerChapter[chapterId] || []
    const idx = blocks.findIndex(b => b.blockId === blockId)
    if (idx <= 0) return
    const newBlocks = arrayMove(blocks, idx, idx - 1)
    syncBlockOrder(chapterId, newBlocks)
  }, [blocksPerChapter])

  const handleMoveBlockDown = useCallback((chapterId: string, blockId: string) => {
    const blocks = blocksPerChapter[chapterId] || []
    const idx = blocks.findIndex(b => b.blockId === blockId)
    if (idx === -1 || idx >= blocks.length - 1) return
    const newBlocks = arrayMove(blocks, idx, idx + 1)
    syncBlockOrder(chapterId, newBlocks)
  }, [blocksPerChapter])

  const syncBlockOrder = (chapterId: string, newBlocks: ChapterBlock[]) => {
    const itemsToSync: { id: string; block_id: string; order_in_block: number; order_num: number }[] = []
    newBlocks.forEach((block, blockIndex) => {
      const blockOrderNum = blockIndex * 10
      block.items.forEach((item, itemIndex) => {
        itemsToSync.push({ id: item.id, block_id: block.blockId, order_in_block: itemIndex, order_num: blockOrderNum })
      })
    })
    setChapterPhotos(prev => {
      const items = prev[chapterId] || []
      const newItems = items.map(item => {
        const sync = itemsToSync.find(i => i.id === item.id)
        return sync ? { ...item, order_num: sync.order_num, order_in_block: sync.order_in_block, block_id: sync.block_id } : item
      }).sort((a, b) => a.order_num !== b.order_num ? a.order_num - b.order_num : a.order_in_block - b.order_in_block)
      return { ...prev, [chapterId]: newItems }
    })
    axios.put(`${API}/chapters/${chapterId}/items/bulk-sync`, { items: itemsToSync }).catch(err => console.error(err))
  }

  const handleDeleteBlock = useCallback(async (chapterId: string, blockId: string, blockType: 'PHOTO' | 'TEXT' | 'SIDE') => {
    const items = (chapterPhotos[chapterId] || []).filter(i => i.block_id === blockId || (blockType === 'TEXT' && i.id === blockId))
    await Promise.all(items.map(item => axios.delete(`${API}/chapters/${chapterId}/items/${item.id}`)))
    fetchChapterPhotos(chapterId)
  }, [chapterPhotos, fetchChapterPhotos])

  const handleSaveText = useCallback(async (itemId: string | 'new', content: string, chapterId: string) => {
    if (!content.trim()) return
    try {
      if (itemId === 'new') {
        await axios.post(`${API}/chapters/${chapterId}/texts`, { text_content: content })
      } else {
        await axios.put(`${API}/chapters/${chapterId}/texts/${itemId}`, { text_content: content })
      }
      fetchChapterPhotos(chapterId)
      setAddingTextChapterId(null)
    } catch (err) {
      console.error(err)
    }
  }, [fetchChapterPhotos])

  const handleLayoutChange = useCallback(async (chapterId: string, blockId: string, layout: 'grid' | 'wide' | 'single') => {
    setChapterPhotos(prev => ({
      ...prev,
      [chapterId]: (prev[chapterId] || []).map(item =>
        item.block_id === blockId ? { ...item, block_layout: layout } : item
      )
    }))
    await axios.put(`${API}/chapters/${chapterId}/blocks/${blockId}/layout`, { block_layout: layout })
  }, [])

  const handleRemoveItem = useCallback(async (chapterId: string, itemId: string) => {
    await axios.delete(`${API}/chapters/${chapterId}/items/${itemId}`)
    fetchChapterPhotos(chapterId)
  }, [fetchChapterPhotos])

  const handleMoveItem = useCallback(async (chapterId: string, itemId: string, targetBlockId: string | 'new') => {
    const realTargetId = targetBlockId === 'new' ? crypto.randomUUID() : targetBlockId
    try {
      await axios.put(`${API}/chapters/${chapterId}/items/move-to-block`, { item_id: itemId, target_block_id: realTargetId })
      fetchChapterPhotos(chapterId)
    } catch (err) {
      console.error(err)
    }
  }, [fetchChapterPhotos])

  const handleReorderItems = useCallback(async (chapterId: string, blockId: string, newOrder: string[]) => {
    await axios.put(`${API}/chapters/${chapterId}/blocks/${blockId}/reorder`, { block_id: blockId, item_ids: newOrder })
    fetchChapterPhotos(chapterId)
  }, [fetchChapterPhotos])

  const TABS = [
    { key: 'edit' as StoryMode, label: t('story.editMode') },
    { key: 'preview' as StoryMode, label: t('story.previewMode') },
  ]

  const topChapters = chapters.filter(c => !c.parent_id).sort((a, b) => a.order_num - b.order_num)

  return (
    <div className="flex flex-col">
      <MobileSegmentTabs tabs={TABS} activeTab={mode} onChange={k => setMode(k as StoryMode)} />

      {mode === 'edit' && (
        <>
          {topChapters.map(chapter => {
            const subChapters = chapters.filter(c => c.parent_id === chapter.id).sort((a, b) => a.order_num - b.order_num)
            const chapterBlocks = blocksPerChapter[chapter.id] || []

            return (
              <div key={chapter.id}>
                <div className="px-4 pt-4 pb-1">
                  <h2 className="text-base font-semibold text-stone-800">{chapter.title}</h2>
                </div>
                <MobileStoryEditor
                  blocks={chapterBlocks}
                  chapterId={chapter.id}
                  onMoveBlockUp={(blockId) => handleMoveBlockUp(chapter.id, blockId)}
                  onMoveBlockDown={(blockId) => handleMoveBlockDown(chapter.id, blockId)}
                  onAddTextBlock={() => { setAddingTextChapterId(chapter.id); setNewTextDraft('') }}
                  onDeleteBlock={(blockId, blockType) => handleDeleteBlock(chapter.id, blockId, blockType)}
                  onSaveText={(itemId, content) => handleSaveText(itemId, content, chapter.id)}
                  onLayoutChange={(blockId, layout) => handleLayoutChange(chapter.id, blockId, layout)}
                  onRemoveItem={(itemId) => handleRemoveItem(chapter.id, itemId)}
                  onMoveItem={(itemId, targetBlockId) => handleMoveItem(chapter.id, itemId, targetBlockId)}
                  onReorderItems={(blockId, newOrder) => handleReorderItems(chapter.id, blockId, newOrder)}
                />

                {subChapters.map(sub => {
                  const subBlocks = blocksPerChapter[sub.id] || []
                  return (
                    <div key={sub.id}>
                      <div className="px-4 pb-1">
                        <h3 className="text-sm font-medium text-stone-600">{sub.title}</h3>
                      </div>
                      <MobileStoryEditor
                        blocks={subBlocks}
                        chapterId={sub.id}
                        onMoveBlockUp={(blockId) => handleMoveBlockUp(sub.id, blockId)}
                        onMoveBlockDown={(blockId) => handleMoveBlockDown(sub.id, blockId)}
                        onAddTextBlock={() => { setAddingTextChapterId(sub.id); setNewTextDraft('') }}
                        onDeleteBlock={(blockId, blockType) => handleDeleteBlock(sub.id, blockId, blockType)}
                        onSaveText={(itemId, content) => handleSaveText(itemId, content, sub.id)}
                        onLayoutChange={(blockId, layout) => handleLayoutChange(sub.id, blockId, layout)}
                        onRemoveItem={(itemId) => handleRemoveItem(sub.id, itemId)}
                        onMoveItem={(itemId, targetBlockId) => handleMoveItem(sub.id, itemId, targetBlockId)}
                        onReorderItems={(blockId, newOrder) => handleReorderItems(sub.id, blockId, newOrder)}
                      />
                    </div>
                  )
                })}
              </div>
            )
          })}

          {topChapters.length === 0 && (
            <div className="flex items-center justify-center py-16 text-stone-400 text-sm">
              {t('story.noPhotosInChapter')}
            </div>
          )}
        </>
      )}

      {mode === 'preview' && (
        <MobileStoryViewer
          chapters={chapters}
          blocksPerChapter={blocksPerChapter}
        />
      )}

      {/* 새 텍스트 블록 편집 모달 */}
      {addingTextChapterId && (
        <MobileTextEditorModal
          initialContent=""
          draft={newTextDraft}
          onDraftChange={setNewTextDraft}
          showPreview={showNewTextPreview}
          onTogglePreview={() => setShowNewTextPreview(v => !v)}
          onSave={(content) => handleSaveText('new', content, addingTextChapterId)}
          onCancel={() => setAddingTextChapterId(null)}
        />
      )}
    </div>
  )
}
