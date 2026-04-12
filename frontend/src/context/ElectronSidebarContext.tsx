import { createContext, useContext, useState, type ReactNode } from 'react'

interface ElectronSidebarContextType {
  sidebarContent: ReactNode
  setSidebarContent: (content: ReactNode) => void
}

const ElectronSidebarContext = createContext<ElectronSidebarContextType>({
  sidebarContent: null,
  setSidebarContent: () => {},
})

export function ElectronSidebarProvider({ children }: { children: ReactNode }) {
  const [sidebarContent, setSidebarContent] = useState<ReactNode>(null)
  return (
    <ElectronSidebarContext.Provider value={{ sidebarContent, setSidebarContent }}>
      {children}
    </ElectronSidebarContext.Provider>
  )
}

export const useElectronSidebar = () => useContext(ElectronSidebarContext)