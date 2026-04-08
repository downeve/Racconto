/// <reference types="vite/client" />

interface Window {
  racconto: {
    version: string
    openFolder: () => Promise<string | null>
    startWatcher: (folderPath: string) => Promise<{ success: boolean; path: string }>
    stopWatcher: () => Promise<{ success: boolean }>
    onNewFile: (callback: (filePath: string) => void) => void
    onDeletedFile: (callback: (filePath: string) => void) => void
    onUploadSuccess: (callback: (data: { item: any; photo: any }) => void) => void
    onUploadFailed: (callback: (data: { item: any; error: string }) => void) => void
    setAuthToken: (token: string) => Promise<void>
  }
}