const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('racconto', {
  version: '0.1.0',
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  startWatcher: (folderPath) => ipcRenderer.invoke('watcher:start', folderPath),
  stopWatcher: () => ipcRenderer.invoke('watcher:stop'),
  onNewFile: (callback) => ipcRenderer.on('watcher:newFile', (event, filePath) => callback(filePath)),
  onDeletedFile: (callback) => ipcRenderer.on('watcher:deletedFile', (event, filePath) => callback(filePath)),
  onUploadSuccess: (callback) => ipcRenderer.on('upload:success', (event, data) => callback(data)),
  onUploadFailed: (callback) => ipcRenderer.on('upload:failed', (event, data) => callback(data)),
  setAuthToken: (token) => ipcRenderer.invoke('auth:setToken', token),
  linkFolder: (folderPath, projectId, projectName) => ipcRenderer.invoke('folderMap:link', { folderPath, projectId, projectName }),
  unlinkFolder: (folderPath) => ipcRenderer.invoke('folderMap:unlink', folderPath),
  getAllMappings: () => ipcRenderer.invoke('folderMap:getAll'),
  onUnmapped: (callback) => ipcRenderer.on('watcher:unmapped', (event, filePath) => callback(filePath)),
  onUploadProgress: (callback) => ipcRenderer.on('upload:progress', (event, data) => callback(data)),
  onUploadDone: (callback) => ipcRenderer.on('upload:done', (event, data) => callback(data)),
  onAuthExpired: (callback) => ipcRenderer.on('auth:expired', () => callback()),
})