import { createContext, useContext, useState, type ReactNode } from 'react'

interface MobileLayoutContextValue {
  bottomSheetContent: ReactNode | null
  setBottomSheetContent: (node: ReactNode | null) => void
  fabAction: (() => void) | null
  setFabAction: (fn: (() => void) | null) => void
}

const MobileLayoutContext = createContext<MobileLayoutContextValue | null>(null)

export function MobileLayoutProvider({ children }: { children: ReactNode }) {
  const [bottomSheetContent, setBottomSheetContent] = useState<ReactNode | null>(null)
  const [fabAction, setFabAction] = useState<(() => void) | null>(null)

  return (
    <MobileLayoutContext.Provider value={{ bottomSheetContent, setBottomSheetContent, fabAction, setFabAction }}>
      {children}
    </MobileLayoutContext.Provider>
  )
}

export function useMobileLayout() {
  const ctx = useContext(MobileLayoutContext)
  if (!ctx) throw new Error('useMobileLayout must be used within MobileLayoutProvider')
  return ctx
}
