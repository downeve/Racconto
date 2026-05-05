import { useEffect, type ReactNode } from 'react'

export function TabletTouchProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add('tablet-mode')
    return () => document.documentElement.classList.remove('tablet-mode')
  }, [])
  return <>{children}</>
}
