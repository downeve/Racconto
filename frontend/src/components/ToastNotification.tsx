interface Props {
  message: string
  type: 'success' | 'error' | 'warning'
  onClose: () => void
}

// success 는 테마 반응 표면(bg-ink)이라 글자도 반응 토큰(text-canvas)으로 짝지어야
// 다크에서 흰 글자+밝은 배경으로 사라지지 않음(STEP 5-B). error/warning 은 고정색이라 text-white 유지.
const style = {
  success: 'bg-ink text-canvas',
  error: 'bg-danger text-white',
  warning: 'bg-warn text-white',
}

export default function ToastNotification({ message, type, onClose }: Props) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 w-72 rounded-card shadow px-4 py-3 flex items-center justify-between gap-3 ${style[type]}`}>
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="opacity-60 hover:opacity-100 text-lg leading-none shrink-0 rounded-btn">×</button>
    </div>
  )
}
