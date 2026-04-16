import { createContext, useContext, useState, type ReactNode } from 'react'

interface ElectronSidebarContextType {
  sidebarContent: ReactNode
  setSidebarContent: (content: ReactNode) => void
  refreshTrigger: number
  triggerRefresh: () => void
  uploadInProgress: boolean
  setUploadInProgress: (v: boolean) => void
}

const ElectronSidebarContext = createContext<ElectronSidebarContextType>({
  sidebarContent: null,
  setSidebarContent: () => {},
  refreshTrigger: 0,
  triggerRefresh: () => {},
  uploadInProgress: false,
  setUploadInProgress: () => {},
})

export function ElectronSidebarProvider({ children }: { children: ReactNode }) {
  const [sidebarContent, setSidebarContent] = useState<ReactNode>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [uploadInProgress, setUploadInProgress] = useState(false)

  // 호출될 때마다 숫자를 키워 변화를 알림
  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1)

  return (
    <ElectronSidebarContext.Provider
      value={{ sidebarContent, setSidebarContent, refreshTrigger, triggerRefresh, uploadInProgress, setUploadInProgress }}
    >
      {children}
    </ElectronSidebarContext.Provider>
  )
}

export const useElectronSidebar = () => useContext(ElectronSidebarContext)