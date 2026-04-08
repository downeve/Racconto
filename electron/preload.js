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
})