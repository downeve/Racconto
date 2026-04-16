interface Props {
  message: string
  type: 'success' | 'error' | 'warning'
  onClose: () => void
}

const bg = {
  success: 'bg-stone-800',
  error: 'bg-red-700',
  warning: 'bg-amber-700',
}

export default function ToastNotification({ message, type, onClose }: Props) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 w-72 text-white rounded-lg shadow-lg px-4 py-3 flex items-center justify-between gap-3 ${bg[type]}`}>
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="opacity-60 hover:opacity-100 text-lg leading-none shrink-0">×</button>
    </div>
  )
}
