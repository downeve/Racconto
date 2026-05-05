import { Plus } from 'lucide-react'

interface OtherBlock {
  blockId: string
  firstImageUrl: string | null
  count: number
}

interface MobileMoveBlockSheetProps {
  otherBlocks: OtherBlock[]
  onSelect: (blockId: string | 'new') => void
  onClose: () => void
}

export default function MobileMoveBlockSheet({ otherBlocks, onSelect, onClose }: MobileMoveBlockSheetProps) {
  return (
    <div className="p-4">
      <div className="grid grid-cols-3 gap-2">
        {otherBlocks.map(block => (
          <button
            key={block.blockId}
            onClick={() => { onSelect(block.blockId); onClose() }}
            className="relative aspect-[3/2] rounded-lg overflow-hidden bg-stone-100"
          >
            {block.firstImageUrl ? (
              <img src={block.firstImageUrl} className="w-full h-full object-cover" alt="" />
            ) : (
              <div className="w-full h-full bg-stone-200" />
            )}
            {block.count > 1 && (
              <div className="absolute bottom-1 right-1 bg-black/50 text-white text-[10px] px-1 rounded">
                {block.count}
              </div>
            )}
          </button>
        ))}
        {/* 새 블록 슬롯 */}
        <button
          onClick={() => { onSelect('new'); onClose() }}
          className="aspect-[3/2] rounded-lg border-2 border-dashed border-stone-300 flex items-center justify-center"
        >
          <Plus size={20} strokeWidth={1.5} className="text-stone-400" />
        </button>
      </div>
      <button
        onClick={onClose}
        className="w-full mt-4 py-3 min-h-[44px] text-sm text-stone-400 border-t border-stone-100"
      >
        취소
      </button>
    </div>
  )
}
