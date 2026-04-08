const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const chokidar = require('chokidar')

const isDev = !app.isPackaged

let mainWindow = null
let watcher = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173/folder-watcher')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'))
  }
}

// 폴더 선택 다이얼로그
ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  })
  if (result.canceled) return null
  return result.filePaths[0]
})

// 폴더 감시 시작
ipcMain.handle('watcher:start', async (event, folderPath) => {
  if (watcher) {
    await watcher.close()
    watcher = null
  }

  watcher = chokidar.watch(folderPath, {
    ignored: /(^|[\/\\])\../,  // 숨김 파일 무시
    persistent: true,
    ignoreInitial: false,      // 앱 시작 시 기존 파일도 감지
    awaitWriteFinish: {
      stabilityThreshold: 2000, // 파일 쓰기 완료 후 2초 대기
      pollInterval: 500,
    },
  })

  const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.tif', '.tiff', '.webp']

  watcher.on('add', (filePath) => {
    const ext = path.extname(filePath).toLowerCase()
    if (!IMAGE_EXTENSIONS.includes(ext)) return

    console.log('새 이미지 감지:', filePath)
    mainWindow.webContents.send('watcher:newFile', filePath)
  })

  watcher.on('unlink', (filePath) => {
    const ext = path.extname(filePath).toLowerCase()
    if (!IMAGE_EXTENSIONS.includes(ext)) return

    console.log('파일 삭제 감지:', filePath)
    mainWindow.webContents.send('watcher:deletedFile', filePath)
  })

  return { success: true, path: folderPath }
})

// 폴더 감시 중지
ipcMain.handle('watcher:stop', async () => {
  if (watcher) {
    await watcher.close()
    watcher = null
  }
  return { success: true }
})

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})