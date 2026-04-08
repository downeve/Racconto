const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('racconto', {
  version: '0.1.0',
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
})