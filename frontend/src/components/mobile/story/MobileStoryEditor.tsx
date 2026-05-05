import { useState } from 'react'
import { MoreVertical, GripVertical, ChevronUp, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import MobilePhotoBlockEditor from './MobilePhotoBlockEditor'
import MobileTextEditorModal from './MobileTextEditorModal'
import type { ChapterItem } from '../../StoryBlocks'

interface ChapterBlock {
  type: 'PHOTO' | 'TEXT' | 'SIDE'
  blockId: string
  items: ChapterItem[]
  order_num: number
}

interface OtherBlock {
  blockId: string
  firstImageUrl: string | null
  count: number
}

interface MobileStoryEditorProps {
  blocks: ChapterBlock[]
  chapterId: string
  onMoveBlockUp: (blockId: string) => void
  onMoveBlockDown: (blockId: string) => void
  onAddTextBlock: () => void
  onDeleteBlock: (blockId: string, blockType: 'PHOTO' | 'TEXT' | 'SIDE') => void
  onSaveText: (itemId: string | 'new', content: string, chapterId: string) => void
  onLayoutChange: (blockId: string, layout: 'grid' | 'wide' | 'single') => void
  onRemoveItem: (itemId: string) => void
  onMoveItem: (itemId: string, targetBlockId: string | 'new') => void
  onReorderItems: (blockId: string, newOrder: string[]) => void
  fabActionRef?: React.MutableRefObject<(() => void) | null>
}

export default function MobileStoryEditor({
  blocks, chapterId,
  onMoveBlockUp, onMoveBlockDown,
  onDeleteBlock, onSaveText, onLayoutChange, onRemoveItem, onMoveItem, onReorderItems,
}: MobileStoryEditorProps) {
  const { t } = useTranslation()
  const [menuBlockId, setMenuBlockId] = useState<string | null>(null)
  const [editingBlock, setEditingBlock] = useState<ChapterBlock | null>(null)
  const [editingTextItem, setEditingTextItem] = useState<ChapterItem | null>(null)
  const [textDraft, setTextDraft] = useState('')
  const [showTextPreview, setShowTextPreview] = useState(false)

  const otherBlocks: OtherBlock[] = blocks
    .filter(b => b.type === 'PHOTO')
    .map(b => ({
      blockId: b.blockId,
      firstImageUrl: b.items.find(i => i.item_type === 'PHOTO')?.image_url || null,
      count: b.items.filter(i => i.item_type === 'PHOTO').length,
    }))

  const openTextEditor = (item: ChapterItem) => {
    setEditingTextItem(item)
    setTextDraft(item.text_content || '')
    setShowTextPreview(false)
  }

  const renderBlock = (block: ChapterBlock, idx: number) => {
    const isFirst = idx === 0
    const isLast = idx === blocks.length - 1
    const photoItems = block.items.filter(i => i.item_type === 'PHOTO').sort((a, b) => a.order_in_block - b.order_in_block)
    const textItem = block.items.find(i => i.item_type === 'TEXT')
    return (
      <div key={block.blockId} className="bg-white rounded-xl border border-stone-100 mb-3 overflow-hidden">
        {/* 헤더 행 */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-stone-50">
          <GripVertical size={16} strokeWidth={1.5} className="text-stone-300 shrink-0" />
          <span className="flex-1 text-xs font-medium text-stone-500">
            {block.type === 'TEXT' ? 'TEXT' : block.type === 'SIDE' ? 'SIDE' : 'PHOTO'}
          </span>
          {/* 위/아래 버튼 */}
          <button onClick={() => onMoveBlockUp(block.blockId)} disabled={isFirst} className="min-w-[44px] min-h-[44px] flex items-center justify-center text-stone-300 disabled:opacity-20">
            <ChevronUp size={14} strokeWidth={1.5} />
          </button>
          <button onClick={() => onMoveBlockDown(block.blockId)} disabled={isLast} className="min-w-[44px] min-h-[44px] flex items-center justify-center text-stone-300 disabled:opacity-20">
            <ChevronDown size={14} strokeWidth={1.5} />
          </button>
          {/* 메뉴 */}
          <div className="relative">
            <button
              onClick={() => setMenuBlockId(menuBlockId === block.blockId ? null : block.blockId)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <MoreVertical size={16} strokeWidth={1.5} className="text-stone-400" />
            </button>
            {menuBlockId === block.blockId && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-stone-200 rounded-xl shadow-lg z-10 min-w-[140px]">
                <button
                  onClick={() => { setMenuBlockId(null); onDeleteBlock(block.blockId, block.type) }}
                  className="w-full text-left px-4 py-3 min-h-[44px] text-sm text-red-500"
                >
                  {t('story.deleteBlock') || '블록 삭제'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 본문 — 탭하면 전체화면 편집 */}
        {block.type === 'TEXT' ? (
          <button
            onClick={() => textItem && openTextEditor(textItem)}
            className="w-full text-left p-3"
          >
            {textItem?.text_content ? (
              <p className="text-sm text-stone-600 line-clamp-2 text-left">{textItem.text_content}</p>
            ) : (
              <p className="text-sm text-stone-300 italic">{t('story.editTextBlock') || '텍스트를 입력하세요...'}</p>
            )}
          </button>
        ) : (
          <button
            onClick={() => setEditingBlock(block)}
            className="w-full p-3"
          >
            {/* 사진 3장 미리보기 그리드 */}
            {photoItems.length > 0 ? (
              <div className="grid grid-cols-3 gap-1">
                {photoItems.slice(0, 3).map((photo, i) => {
                  const remainCount = photoItems.length - 2
                  return (
                    <div key={photo.id} className="aspect-[3/2] relative overflow-hidden rounded">
                      <img src={photo.image_url || ''} className="w-full h-full object-cover" alt="" />
                      {i === 2 && remainCount > 1 && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-white text-sm font-semibold">+{remainCount}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="h-16 flex items-center justify-center text-stone-300 text-xs">
                {t('story.noPhotosInChapter')}
              </div>
            )}
          </button>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col p-4">
        {blocks.map((block, idx) => renderBlock(block, idx))}
        {blocks.length === 0 && (
          <div className="text-center text-stone-400 text-sm py-8">
            {t('story.noPhotosInChapter')}
          </div>
        )}
      </div>

      {/* PHOTO 블록 전체화면 편집 */}
      {editingBlock && editingBlock.type !== 'TEXT' && (
        <MobilePhotoBlockEditor
          block={{
            blockId: editingBlock.blockId,
            items: editingBlock.items,
            blockLayout: (editingBlock.items[0]?.block_layout || 'grid') as 'grid' | 'wide' | 'single',
          }}
          allBlocks={otherBlocks}
          onClose={() => setEditingBlock(null)}
          onLayoutChange={(layout) => onLayoutChange(editingBlock.blockId, layout)}
          onRemoveItem={(itemId) => { onRemoveItem(itemId) }}
          onMoveItem={(itemId, targetBlockId) => { onMoveItem(itemId, targetBlockId) }}
          onReorderItems={(newOrder) => onReorderItems(editingBlock.blockId, newOrder)}
        />
      )}

      {/* TEXT 블록 전체화면 편집 */}
      {editingTextItem && (
        <MobileTextEditorModal
          initialContent={editingTextItem.text_content || ''}
          draft={textDraft}
          onDraftChange={setTextDraft}
          showPreview={showTextPreview}
          onTogglePreview={() => setShowTextPreview(v => !v)}
          onSave={(content) => {
            onSaveText(editingTextItem.id, content, chapterId)
            setEditingTextItem(null)
          }}
          onCancel={() => setEditingTextItem(null)}
        />
      )}
    </>
  )
}
