import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'

interface MobileTopBarProps {
  title: string
  showBack?: boolean
  rightAction?: ReactNode
}

export default function MobileTopBar({ title, showBack, rightAction }: MobileTopBarProps) {
  const navigate = useNavigate()

  return (
    <div
      className="flex items-center justify-between px-4 bg-[#F7F4F0] border-b border-stone-200 shrink-0"
      style={{ paddingTop: `calc(env(safe-area-inset-top) + 0.75rem)`, paddingBottom: '0.75rem', height: `calc(56px + env(safe-area-inset-top))` }}
    >
      <div className="flex items-center gap-2 min-w-[44px]">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center min-w-[44px] min-h-[44px] -ml-2"
          >
            <ChevronLeft size={22} strokeWidth={1.5} className="text-stone-700" />
          </button>
        )}
      </div>
      <span className="text-base font-semibold text-stone-900 truncate">{title}</span>
      <div className="flex items-center justify-end min-w-[44px]">
        {rightAction}
      </div>
    </div>
  )
}
