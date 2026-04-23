import { useTranslation } from 'react-i18next'

interface ConfirmProps {
  type?: 'confirm'
  message: string
  onConfirm: () => void
  onCancel: () => void
  dangerous?: boolean
}

interface MoveBlockProps {
  type: 'moveBlock'
  blocks: { blockId: string; firstImageUrl: string | null; count: number }[]
  onSelect: (blockId: string) => void
  onCancel: () => void
}

type Props = ConfirmProps | MoveBlockProps

export default function ConfirmModal(props: Props) {
  const { t } = useTranslation()

  if (props.type === 'moveBlock') {
    const { blocks, onSelect, onCancel } = props
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200] p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-stone-800">{t('story.toOtherBlockTitle')}</p>
            <button onClick={onCancel} className="text-stone-400 hover:text-stone-700 text-lg leading-none">✕</button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {blocks.map(block => (
              <button
                key={block.blockId}
                onClick={() => onSelect(block.blockId)}
                className="flex flex-col items-center gap-1 p-1 rounded-lg hover:bg-stone-50 border border-transparent hover:border-stone-200 transition-colors"
              >
                <div className="w-full aspect-[3/2] rounded overflow-hidden bg-gray-100">
                  {block.firstImageUrl
                    ? <img src={block.firstImageUrl} className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-gray-200" />
                  }
                </div>
                {/*<span className="text-[10px] text-gray-400">{block.count}장</span>*/}
              </button>
            ))}
            {/* 새 블록 슬롯 */}
            <button
              onClick={() => onSelect('new')}
              className="flex flex-col items-center gap-1 p-1 rounded-lg hover:bg-stone-50 border border-transparent hover:border-stone-200 transition-colors"
            >
              <div className="w-full aspect-[3/2] rounded border-2 border-dashed border-gray-300 bg-white flex items-center justify-center">
                <span className="text-gray-400 text-2xl leading-none">+</span>
              </div>
              {/*<span className="text-[10px] text-gray-400">{t('story.newBlock')}</span>*/}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 기존 confirm 모달 — 코드 그대로 유지
  const { message, onConfirm, onCancel, dangerous = false } = props
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
        <p className="text-sm text-stone-800 leading-relaxed mb-6 whitespace-pre-wrap">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-stone-600 border border-stone-300 rounded hover:bg-stone-50"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm text-white rounded ${dangerous ? 'bg-red-600 hover:bg-red-700' : 'bg-stone-800 hover:bg-stone-700'}`}
          >
            {t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}