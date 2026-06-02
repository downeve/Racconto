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
        <div className="bg-card rounded-card shadow w-full max-w-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-ink">{t('story.toOtherBlockTitle')}</p>
            <button onClick={onCancel} className="text-muted hover:text-ink text-lg leading-none rounded-btn">✕</button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {blocks.map(block => (
              <button
                key={block.blockId}
                onClick={() => onSelect(block.blockId)}
                className="flex flex-col items-center gap-1 p-1 rounded-btn hover:bg-canvas-4 border border-transparent hover:border-secondary-border transition-[background,color,border] duration-150 ease-out"
              >
                <div className="w-full aspect-[3/2] rounded-btn overflow-hidden bg-canvas-3">
                  {block.firstImageUrl
                    ? <img src={block.firstImageUrl} className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-canvas-4" />
                  }
                </div>
              </button>
            ))}
            {/* 새 블록 슬롯 */}
            <button
              onClick={() => onSelect('new')}
              className="flex flex-col items-center gap-1 p-1 rounded-btn hover:bg-canvas-4 border border-transparent hover:border-secondary-border transition-[background,color,border] duration-150 ease-out"
            >
              <div className="w-full aspect-[3/2] rounded border-2 border-dashed border-faint bg-card flex items-center justify-center">
                <span className="text-muted text-2xl leading-none">+</span>
              </div>
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
      <div className="bg-card rounded-card shadow w-full max-w-sm p-6">
        <p className="text-sm text-ink leading-relaxed mb-6 whitespace-pre-wrap">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-muted border border-hair rounded-btn hover:bg-canvas-4"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm rounded-btn ${dangerous ? 'bg-danger text-white hover:bg-danger/85' : 'bg-ink text-canvas hover:bg-ink-2'}`}
          >
            {t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}