/// <reference types="vite/client" />

interface Window {
  racconto: {
    version: string
    openFolder: () => Promise<string | null>
    startWatcher: (folderPath: string) => Promise<{ success: boolean; path: string }>
    stopWatcher: () => Promise<{ success: boolean }>
    onNewFile: (callback: (filePath: string) => void) => void
    onDeletedFile: (callback: (filePath: string) => void) => void
  }
}