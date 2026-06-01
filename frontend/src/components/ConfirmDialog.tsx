import { type ReactNode, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'danger'
  loading?: boolean
}

export function ConfirmDialog({
  open, onClose, onConfirm,
  title, description,
  confirmLabel, cancelLabel,
  variant = 'default',
  loading,
}: Props) {
  const { t } = useTranslation()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="bg-edit-canvas border border-edit-line rounded-btn
                    shadow-[0_8px_32px_rgba(0,0,0,0.12)]
                    max-w-sm w-full mx-4 p-6"
        onClick={e => e.stopPropagation()}
      >
        <p className="t-eyebrow text-edit-muted mb-2">
          {variant === 'danger' ? t('common.warning') : t('common.confirm')}
        </p>
        <h3 className="font-serif text-h3 text-edit-ink font-normal tracking-tight mb-3">
          {title}
        </h3>
        {description && (
          <div className="text-body text-edit-muted leading-relaxed mb-6">
            {description}
          </div>
        )}
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="t-caption px-4 py-2 text-edit-muted hover:text-edit-ink
                       transition-colors disabled:opacity-50"
          >
            {cancelLabel || t('common.cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`t-caption tracking-[0.04em] px-5 py-2 rounded-[1px]
                        transition-colors disabled:opacity-50
                        ${variant === 'danger'
                          ? 'bg-edit-danger text-edit-paper hover:bg-edit-danger/85'
                          : 'bg-edit-ink text-edit-paper hover:bg-edit-ink/85'}`}
          >
            {loading ? t('common.processing') : (confirmLabel || t('common.confirm'))}
          </button>
        </div>
      </div>
    </div>
  )
}
