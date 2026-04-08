const { app, BrowserWindow, ipcMain, dialog, net } = require('electron')
const path = require('path')
const chokidar = require('chokidar')
const fs = require('fs')
const https = require('https')
const { addToQueue, getPendingItems, markSuccess, markFailed, resetFailedToPending } = require('./queue')

const isDev = !app.isPackaged

let mainWindow = null

let isOnline = true
const API_BASE = 'https://racconto.app/api'

let watcher = null

// JWT 토큰은 렌더러에서 받아서 메인에 저장
let authToken = null
ipcMain.handle('auth:setToken', (event, token) => {
  authToken = token
})

async function fetchWithAuth(url, options = {}) {
  const { default: fetch } = await import('node-fetch')
  return fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
}

async function uploadFile(item) {
  // 1. FastAPI에서 CF 업로드 URL 발급
  const urlRes = await fetchWithAuth(`${API_BASE}/photos/upload-url`, {
    method: 'POST',
  })
  if (!urlRes.ok) throw new Error('업로드 URL 발급 실패')
  const { uploadURL, id: cfImageId } = await urlRes.json()

  // 2. CF에 직접 업로드
  const { default: fetch } = await import('node-fetch')
  const { default: FormData } = await import('form-data')
  const form = new FormData()
  form.append('file', fs.createReadStream(item.filePath), path.basename(item.filePath))

  const cfRes = await fetch(uploadURL, { method: 'POST', body: form })
  const cfData = await cfRes.json()
  if (!cfData.success) throw new Error('CF 업로드 실패')

  const imageUrl = cfData.result.variants[0]

  // 3. FastAPI에 메타데이터 저장
  const metaRes = await fetchWithAuth(`${API_BASE}/photos/`, {
    method: 'POST',
    body: JSON.stringify({
      project_id: item.projectId,
      image_url: imageUrl,
      folder: path.dirname(item.filePath),
    }),
  })
  if (!metaRes.ok) throw new Error('메타데이터 저장 실패')

  return await metaRes.json()
}

async function processQueue() {
  if (!isOnline || !authToken) return
  resetFailedToPending()
  const pending = getPendingItems()
  if (pending.length === 0) return

  console.log(`큐 처리 시작: ${pending.length}개`)
  for (const item of pending) {
    try {
      const photo = await uploadFile(item)
      markSuccess(item.id)
      mainWindow?.webContents.send('upload:success', { item, photo })
      console.log('업로드 성공:', item.filePath)
    } catch (err) {
      markFailed(item.id)
      mainWindow?.webContents.send('upload:failed', { item, error: err.message })
      console.error('업로드 실패:', item.filePath, err.message)
    }
  }
}

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

    // 큐에 추가 (projectId는 나중에 연동, 일단 null)
    addToQueue({ filePath, projectId: null })

    // 온라인이면 바로 업로드 시도
    if (isOnline) processQueue()
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
  // 네트워크 상태 감지
  setInterval(() => {
    const online = net.isOnline()
    if (!isOnline && online) {
      console.log('네트워크 재연결 감지 → 큐 처리 시작')
      processQueue()
    }
    isOnline = online
  }, 5000) // 5초마다 체크
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})