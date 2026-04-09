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
    onUploadProgress: (callback: (data: { done: number; total: number; failed: number }) => void) => void
    onUploadDone: (callback: (data: { total: number; success: number; failed: number }) => void) => void
    onAuthExpired: (callback: () => void) => void
    setAuthToken: (token: string) => Promise<void>
    linkFolder: (folderPath: string, projectId: string, projectName: string) => Promise<{ success: boolean }>
    unlinkFolder: (folderPath: string) => Promise<{ success: boolean }>
    getAllMappings: () => Promise<Record<string, { projectId: string; projectName: string; linkedAt: string }>>
    onUnmapped: (callback: (filePath: string) => void) => void
  }
}