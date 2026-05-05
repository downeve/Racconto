import { Plus } from 'lucide-react'
import { useMobileLayout } from '../../context/MobileLayoutContext'

export default function MobileFAB() {
  const { fabAction } = useMobileLayout()

  if (!fabAction) return null

  return (
    <button
      onClick={fabAction}
      className="fixed right-5 z-40 w-14 h-14 rounded-full bg-stone-900 text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform"
      style={{ bottom: `calc(72px + env(safe-area-inset-bottom))` }}
    >
      <Plus size={24} strokeWidth={1.5} />
    </button>
  )
}
