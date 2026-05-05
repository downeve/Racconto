import { useState } from 'react'
import { X, MoreVertical, ChevronUp, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import MobileMoveBlockSheet from './MobileMoveBlockSheet'
import type { ChapterItem } from '../../StoryBlocks'

interface OtherBlock {
  blockId: string
  firstImageUrl: string | null
  count: number
}

interface MobilePhotoBlockEditorProps {
  block: { blockId: string; items: ChapterItem[]; blockLayout: 'grid' | 'wide' | 'single' }
  allBlocks: OtherBlock[]
  onClose: () => void
  onLayoutChange: (layout: 'grid' | 'wide' | 'single') => void
  onRemoveItem: (itemId: string) => void
  onMoveItem: (itemId: string, targetBlockId: string | 'new') => void
  onReorderItems: (newOrder: string[]) => void
}

export default function MobilePhotoBlockEditor({
  block, allBlocks, onClose, onLayoutChange, onRemoveItem, onMoveItem, onReorderItems
}: MobilePhotoBlockEditorProps) {
  const { t } = useTranslation()
  const [moveTarget, setMoveTarget] = useState<string | null>(null) // itemId for move sheet
  const [actionMenuId, setActionMenuId] = useState<string | null>(null)

  const photoItems = block.items.filter(i => i.item_type === 'PHOTO').sort((a, b) => a.order_in_block - b.order_in_block)

  const moveUp = (idx: number) => {
    if (idx === 0) return
    const newOrder = [...photoItems.map(i => i.id)]
    ;[newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]]
    onReorderItems(newOrder)
  }

  const moveDown = (idx: number) => {
    if (idx === photoItems.length - 1) return
    const newOrder = [...photoItems.map(i => i.id)]
    ;[newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]]
    onReorderItems(newOrder)
  }

  const otherBlocksForMove = allBlocks.filter(b => b.blockId !== block.blockId)

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 shrink-0">
        <button onClick={onClose} className="min-h-[44px] min-w-[44px] flex items-center justify-center">
          <X size={20} strokeWidth={1.5} className="text-stone-500" />
        </button>
        <span className="font-semibold text-sm text-stone-900">{t('story.title')}</span>
        <div className="w-[44px]" />
      </div>

      {/* 레이아웃 세그먼트 */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-stone-100 shrink-0">
        <span className="text-xs text-stone-400 mr-2">{t('portfolio.column')}</span>
        {(['grid', 'wide', 'single'] as const).map(l => (
          <button
            key={l}
            onClick={() => onLayoutChange(l)}
            className={`flex-1 min-h-[44px] text-xs rounded transition-colors ${
              block.blockLayout === l ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-500'
            }`}
          >
            {t(`portfolio.column${l.charAt(0).toUpperCase()}${l.slice(1)}`) || l}
          </button>
        ))}
      </div>

      {/* 사진 목록 */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {photoItems.map((item, idx) => (
          <div key={item.id} className="flex items-center gap-3 bg-stone-50 rounded-xl p-2">
            <img
              src={item.image_url || ''}
              className="w-16 h-16 rounded-lg object-cover shrink-0"
              alt={item.caption || ''}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-stone-500 truncate">{item.caption || ''}</p>
            </div>
            {/* 위/아래 버튼 */}
            <div className="flex flex-col gap-0.5 shrink-0">
              <button
                onClick={() => moveUp(idx)}
                disabled={idx === 0}
                className="min-w-[44px] min-h-[22px] flex items-center justify-center text-stone-400 disabled:opacity-20"
              >
                <ChevronUp size={14} strokeWidth={1.5} />
              </button>
              <button
                onClick={() => moveDown(idx)}
                disabled={idx === photoItems.length - 1}
                className="min-w-[44px] min-h-[22px] flex items-center justify-center text-stone-400 disabled:opacity-20"
              >
                <ChevronDown size={14} strokeWidth={1.5} />
              </button>
            </div>
            {/* 액션 메뉴 */}
            <div className="relative shrink-0">
              <button
                onClick={() => setActionMenuId(actionMenuId === item.id ? null : item.id)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <MoreVertical size={16} strokeWidth={1.5} className="text-stone-400" />
              </button>
              {actionMenuId === item.id && (
                <div className="absolute right-0 bottom-full mb-1 bg-white border border-stone-200 rounded-xl shadow-lg z-10 min-w-[160px]">
                  <button
                    onClick={() => { setActionMenuId(null); setMoveTarget(item.id) }}
                    className="w-full text-left px-4 py-3 min-h-[44px] text-sm text-stone-700"
                  >
                    {t('story.toOtherBlock')}
                  </button>
                  <button
                    onClick={() => { setActionMenuId(null); onRemoveItem(item.id) }}
                    className="w-full text-left px-4 py-3 min-h-[44px] text-sm text-red-500"
                  >
                    {t('story.deleteBlock') || '블록에서 제거'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* MobileMoveBlockSheet */}
      {moveTarget && (
        <div className="fixed inset-0 z-60 flex flex-col justify-end" style={{ zIndex: 60 }}>
          <div className="absolute inset-0 bg-black/40" onClick={() => setMoveTarget(null)} />
          <div className="relative bg-white rounded-t-2xl max-h-[60dvh] overflow-y-auto" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-stone-300" />
            </div>
            <p className="px-4 pb-2 text-sm font-semibold text-stone-700">{t('story.toOtherBlockTitle')}</p>
            <MobileMoveBlockSheet
              otherBlocks={otherBlocksForMove}
              onSelect={(targetBlockId) => {
                const itemId = moveTarget
                setMoveTarget(null)
                onMoveItem(itemId, targetBlockId)
              }}
              onClose={() => setMoveTarget(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
