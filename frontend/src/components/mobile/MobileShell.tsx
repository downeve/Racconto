import type { ReactNode } from 'react'
import MobileTopBar from './MobileTopBar'
import MobileBottomNav from './MobileBottomNav'
import MobileBottomSheet from './MobileBottomSheet'
import MobileFAB from './MobileFAB'

interface MobileShellProps {
  title: string
  showBack?: boolean
  rightAction?: ReactNode
  children: ReactNode
}

export default function MobileShell({ title, showBack, rightAction, children }: MobileShellProps) {
  return (
    <div className="flex flex-col bg-[#F7F4F0]" style={{ height: '100dvh', overflow: 'hidden' }}>
      <MobileTopBar title={title} showBack={showBack} rightAction={rightAction} />
      <main className="flex-1 overflow-y-auto" style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
        {children}
      </main>
      <MobileBottomNav />
      <MobileBottomSheet />
      <MobileFAB />
    </div>
  )
}
