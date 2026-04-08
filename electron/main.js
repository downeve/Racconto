const { app, BrowserWindow, ipcMain, dialog, net } = require('electron')
const path = require('path')
const chokidar = require('chokidar')
const fs = require('fs')
const { addToQueue, getPendingItems, markSuccess, markFailed, resetFailedToPending } = require('./queue')
const { linkFolder, unlinkFolder, getProjectForFolder, getAllMappings } = require('./folderMap')

const isDev = !app.isPackaged

let mainWindow = null
let isOnline = true
let watchers = {} // 폴더별 watcher 관리 (단일 → 복수로 변경)
let authToken = null

const API_BASE = isDev ? 'http://localhost:8000' : 'https://racconto.app/api'
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.tif', '.tiff', '.webp']

// ── 인증 ────────────────────────────────────────────
ipcMain.handle('auth:setToken', (event, token) => {
  authToken = token
  // 토큰 받으면 큐 처리 시도
  if (isOnline) processQueue()
})

// ── 폴더 매핑 ────────────────────────────────────────
ipcMain.handle('folderMap:link', (event, { folderPath, projectId, projectName }) => {
  linkFolder(folderPath, projectId, projectName)
  return { success: true }
})

ipcMain.handle('folderMap:unlink', (event, folderPath) => {
  unlinkFolder(folderPath)
  stopWatcherForPath(folderPath)
  return { success: true }
})

ipcMain.handle('folderMap:getAll', () => {
  return getAllMappings()
})

// ── 업로드 ────────────────────────────────────────────
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
  // DB 중복 체크 (앱 시작 시 토큰 없어서 스킵된 경우 여기서 최종 확인)
  const filename = path.basename(item.filePath)
  const checkRes = await fetchWithAuth(
    `${API_BASE}/photos/exists?project_id=${encodeURIComponent(item.projectId)}&filename=${encodeURIComponent(filename)}`
  )
  if (checkRes.ok) {
    const checkData = await checkRes.json()
    if (checkData.exists) {
      console.log('DB 중복 확인, 업로드 스킵:', filename)
      return null // null 반환으로 스킵 표시
    }
  }

  // 1. FastAPI에서 CF 업로드 URL 발급
  const urlRes = await fetchWithAuth(`${API_BASE}/photos/cf-upload-url`)
  
  // 상세 에러 로깅
  if (!urlRes.ok) {
    const errText = await urlRes.text()
    console.error('업로드 URL 발급 실패 상세:', urlRes.status, errText)
    throw new Error(`업로드 URL 발급 실패: ${urlRes.status} ${errText}`)
  }

  const { uploadURL } = await urlRes.json()

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
      original_filename: path.basename(item.filePath),
    }),
  })
  if (!metaRes.ok) throw new Error('메타데이터 저장 실패')

  return await metaRes.json()
}

let isProcessing = false

async function processQueue() {
  if (!isOnline || !authToken) {
    console.log('큐 처리 스킵:', !isOnline ? '오프라인' : '토큰 없음')
    return
  }
  if (isProcessing) {
    console.log('큐 처리 중복 실행 방지')
    return
  }
  isProcessing = true
  resetFailedToPending()
  const pending = getPendingItems()
  if (pending.length === 0) {
    isProcessing = false
    return
  }

  console.log(`큐 처리 시작: ${pending.length}개`)
  for (const item of pending) {
    try {
      const photo = await uploadFile(item)
      if (photo === null) {
        markSuccess(item.id) // 스킵도 성공으로 처리해서 큐에서 제거
        continue
      }
      markSuccess(item.id)
      mainWindow?.webContents.send('upload:success', { item, photo })
      console.log('업로드 성공:', item.filePath)
    } catch (err) {
      markFailed(item.id)
      mainWindow?.webContents.send('upload:failed', { item, error: err.message })
      console.error('업로드 실패:', item.filePath, err.message)
    }
  }
  isProcessing = false

  // 처리 중 새로 추가된 항목이 있으면 다시 실행
  const remaining = getPendingItems()
  if (remaining.length > 0) processQueue()
}

// ── 파일 감시 ────────────────────────────────────────
function startWatcherForPath(folderPath) {
  if (watchers[folderPath]) return // 이미 감시 중

  console.log('감시 시작:', folderPath)
  const w = chokidar.watch(folderPath, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: false,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 500,
    },
  })

  w.on('add', async (filePath) => {
    const ext = path.extname(filePath).toLowerCase()
    if (!IMAGE_EXTENSIONS.includes(ext)) return

    console.log('새 이미지 감지:', filePath)
    mainWindow?.webContents.send('watcher:newFile', filePath)

    const mapping = getProjectForFolder(path.dirname(filePath))
    if (!mapping) {
      console.log('매핑된 프로젝트 없음:', filePath)
      mainWindow?.webContents.send('watcher:unmapped', filePath)
      return
    }

    // DB 중복 체크
    if (authToken) {
      try {
        const { default: fetch } = await import('node-fetch')
        const filename = path.basename(filePath)
        const res = await fetch(
          `${API_BASE}/photos/exists?project_id=${encodeURIComponent(mapping.projectId)}&filename=${encodeURIComponent(filename)}`,
          { headers: { 'Authorization': `Bearer ${authToken}` } }
        )
        const data = await res.json()
        if (data.exists) {
          console.log('이미 업로드된 파일 스킵:', filename)
          return
        }
      } catch (err) {
        console.error('중복 체크 실패, 일단 큐에 추가:', err.message)
      }
    }

    addToQueue({ filePath, projectId: mapping.projectId })
    if (isOnline) processQueue()
  })

  w.on('unlink', (filePath) => {
    const ext = path.extname(filePath).toLowerCase()
    if (!IMAGE_EXTENSIONS.includes(ext)) return

    console.log('파일 삭제 감지:', filePath)
    mainWindow?.webContents.send('watcher:deletedFile', filePath)
  })

  watchers[folderPath] = w
}

async function stopWatcherForPath(folderPath) {
  if (watchers[folderPath]) {
    await watchers[folderPath].close()
    delete watchers[folderPath]
    console.log('감시 중지:', folderPath)
  }
}

// ── IPC: 감시 시작/중지 ──────────────────────────────
ipcMain.handle('watcher:start', (event, folderPath) => {
  startWatcherForPath(folderPath)
  return { success: true, path: folderPath }
})

ipcMain.handle('watcher:stop', async (event, folderPath) => {
  if (folderPath) {
    await stopWatcherForPath(folderPath)
  } else {
    // 전체 중지
    for (const p of Object.keys(watchers)) {
      await stopWatcherForPath(p)
    }
  }
  return { success: true }
})

// ── 폴더 선택 다이얼로그 ─────────────────────────────
ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  })
  if (result.canceled) return null
  return result.filePaths[0]
})

// ── 윈도우 생성 ──────────────────────────────────────
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
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'))
  }
}

// ── 앱 시작 ──────────────────────────────────────────
app.whenReady().then(() => {
  createWindow()

  // 기존 매핑된 폴더 자동 감시 시작
  const mappings = getAllMappings()
  Object.keys(mappings).forEach(folderPath => {
    startWatcherForPath(folderPath)
  })

  // 네트워크 상태 감지 (5초 폴링)
  setInterval(() => {
    const online = net.isOnline()
    if (!isOnline && online) {
      console.log('네트워크 재연결 감지 → 큐 처리 시작')
      processQueue()
    }
    isOnline = online
  }, 5000)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})