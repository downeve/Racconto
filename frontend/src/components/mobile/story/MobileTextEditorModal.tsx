import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import MarkdownRenderer from '../../MarkdownRenderer'

interface MobileTextEditorModalProps {
  initialContent: string
  onSave: (content: string) => void
  onCancel: () => void
  draft: string
  onDraftChange: (v: string) => void
  showPreview: boolean
  onTogglePreview: () => void
}

export default function MobileTextEditorModal({
  onSave, onCancel, draft, onDraftChange, showPreview, onTogglePreview
}: MobileTextEditorModalProps) {
  const { t } = useTranslation()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onDraftChange(e.target.value)
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = ta.scrollHeight + 'px'
  }

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 shrink-0">
        <button onClick={onCancel} className="min-h-[44px] min-w-[44px] text-sm text-stone-500">
          {t('common.cancel')}
        </button>
        <button onClick={onTogglePreview} className="text-xs text-stone-400 min-h-[44px] px-2">
          {showPreview ? t('story.editMode') : t('story.previewMode')}
        </button>
        <button onClick={() => onSave(draft)} className="min-h-[44px] min-w-[44px] text-sm font-semibold text-stone-900">
          {t('common.save')}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {showPreview ? (
          <MarkdownRenderer content={draft} darkMode={false} />
        ) : (
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={handleInput}
            className="w-full text-sm text-stone-700 bg-transparent outline-none resize-none min-h-[200px]"
            placeholder={t('story.editTextBlock') || '내용을 입력하세요...'}
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          />
        )}
      </div>
    </div>
  )
}
