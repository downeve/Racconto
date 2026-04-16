import { useTranslation } from 'react-i18next'

interface Props {
  message: string
  onConfirm: () => void
  onCancel: () => void
  dangerous?: boolean
}

export default function ConfirmModal({ message, onConfirm, onCancel, dangerous = false }: Props) {
  const { t } = useTranslation()
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
