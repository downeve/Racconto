const { app, BrowserWindow, ipcMain, dialog, net } = require('electron')
const path = require('path')
const chokidar = require('chokidar')
const fs = require('fs')
const { addToQueue, getPendingItems, markSuccess, markFailed, resetFailedToPending, initQueue } = require('./queue')
const { linkFolder, unlinkFolder, getProjectForFolder, getAllMappings } = require('./folderMap')
const exifr = require('exifr')

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
  if (isOnline) {
    // 로그인 시 매핑된 폴더 감시 시작
    const mappings = getAllMappings()
    Object.keys(mappings).forEach(folderPath => {
      startWatcherForPath(folderPath)
      const projectId = mappings[folderPath].projectId
      syncLocalMissing(folderPath, projectId)
    })
    processQueue()
  }
})

// ── 로그아웃 ────────────────────────────────────────────
ipcMain.handle('auth:logout', async () => {
  authToken = null
  // 모든 감시 중지
  for (const p of Object.keys(watchers)) {
    await stopWatcherForPath(p)
  }
  console.log('로그아웃 → 모든 감시 중지')
  return { success: true }
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
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  // 토큰 만료 시 프론트에 알림
  if (res.status === 401) {
    authToken = null
    mainWindow?.webContents.send('auth:expired')
    console.log('토큰 만료 감지 → 로그아웃')
  }
  return res
}

async function uploadFile(item) {
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
  const { Blob } = require('buffer')
  const fileBuffer = fs.readFileSync(item.filePath)
  const blob = new Blob([fileBuffer])
  const form = new globalThis.FormData()
  form.append('file', blob, path.basename(item.filePath))

  const cfRes = await fetch(uploadURL, { method: 'POST', body: form })
  const cfData = await cfRes.json()
  if (!cfData.success) throw new Error('CF 업로드 실패')

  const imageUrl = cfData.result.variants[0]

// 3. FastAPI에 메타데이터 저장
  let exifData = {}
  try {
    const parsed = await exifr.parse(item.filePath, {
      pick: ['DateTimeOriginal', 'Make', 'Model', 'LensModel',
             'ISO', 'ExposureTime', 'FNumber', 'FocalLength',
             'GPSLatitude', 'GPSLongitude']
    })
    if (parsed) {
      if (parsed.DateTimeOriginal) exifData.taken_at = parsed.DateTimeOriginal.toISOString()
      if (parsed.Make || parsed.Model) exifData.camera = `${parsed.Make || ''} ${parsed.Model || ''}`.trim()
      if (parsed.LensModel)    exifData.lens = parsed.LensModel
      if (parsed.ISO)          exifData.iso = `ISO ${parsed.ISO}`
      if (parsed.ExposureTime) exifData.shutter_speed = parsed.ExposureTime < 1
        ? `1/${Math.round(1 / parsed.ExposureTime)}s`
        : `${parsed.ExposureTime.toFixed(1)}s`
      if (parsed.FNumber)      exifData.aperture = `f/${parsed.FNumber.toFixed(1)}`
      if (parsed.FocalLength)  exifData.focal_length = `${Math.round(parsed.FocalLength)}mm`
      if (parsed.GPSLatitude)  exifData.gps_lat = String(parsed.GPSLatitude)
      if (parsed.GPSLongitude) exifData.gps_lng = String(parsed.GPSLongitude)
    }
  } catch (e) {
    console.log('EXIF 추출 실패 (무시):', path.basename(item.filePath), e.message)
  }

  const metaRes = await fetchWithAuth(`${API_BASE}/photos/`, {
    method: 'POST',
    body: JSON.stringify({
      project_id: item.projectId,
      image_url: imageUrl,
      folder: path.dirname(item.filePath),
      original_filename: path.basename(item.filePath),
      source: 'electron', 
      ...exifData,
    }),
  })
  if (!metaRes.ok) throw new Error('메타데이터 저장 실패')

  return await metaRes.json()
}

let isProcessing = false

async function syncLocalMissing(folderPath, projectId) {
  if (!authToken) return
  try {
    const res = await fetchWithAuth(
      `${API_BASE}/photos/?project_id=${encodeURIComponent(projectId)}`
    )
    // 프로젝트가 없으면 매핑 해제
    if (res.status === 404) {
      console.log('프로젝트 없음, 매핑 해제:', projectId)
      unlinkFolder(folderPath)
      stopWatcherForPath(folderPath)
      mainWindow?.webContents.send('folderMap:unlinked', folderPath)
      return
    }
    if (!res.ok) return
    // ... 이하 동일
    const photos = await res.json()

    // 로컬 실제 파일 목록
    const localFiles = new Set(
      fs.readdirSync(folderPath)
        .filter(f => IMAGE_EXTENSIONS.includes(path.extname(f).toLowerCase()))
    )

    // 변경이 필요한 항목만 추려서 배치로 전송
    const updates = []
    for (const photo of photos) {
      if (!photo.original_filename) continue
      if (photo.source !== 'electron') continue
      const isLocal = localFiles.has(photo.original_filename)
      if (!isLocal && !photo.local_missing) {
        updates.push({ filename: photo.original_filename, local_missing: true })
        console.log('local_missing 감지:', photo.original_filename)
      } else if (isLocal && photo.local_missing) {
        updates.push({ filename: photo.original_filename, local_missing: false })
        console.log('local_missing 복구:', photo.original_filename)
      }
    }

    if (updates.length === 0) return

    await fetchWithAuth(
      `${API_BASE}/photos/bulk-local-missing?project_id=${encodeURIComponent(projectId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ updates }),
      }
    )
    console.log(`local_missing 동기화 완료: ${updates.length}개`)
  } catch (e) {
    console.error('syncLocalMissing 실패:', e.message)
  }
}

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

  // 배치 중복 체크
  const byProject = {}
  for (const item of pending) {
    if (!byProject[item.projectId]) byProject[item.projectId] = []
    byProject[item.projectId].push(item)
  }

  const existingFiles = new Set()
  for (const [projectId, items] of Object.entries(byProject)) {
    try {
      const res = await fetchWithAuth(`${API_BASE}/photos/bulk-exists`, {
        method: 'POST',
        body: JSON.stringify({
          project_id: projectId,
          filenames: items.map(i => path.basename(i.filePath)),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        data.existing.forEach(f => existingFiles.add(`${projectId}::${f}`))
      }
    } catch (e) {
      console.error('배치 중복 체크 실패:', e.message)
    }
  }

  // 실제 업로드할 항목만 추려서 전체 수 계산
  const uploadItems = pending.filter(item => {
    const key = `${item.projectId}::${path.basename(item.filePath)}`
    return !existingFiles.has(key)
  })

  // 중복 항목 즉시 스킵 처리
  for (const item of pending) {
    const key = `${item.projectId}::${path.basename(item.filePath)}`
    if (existingFiles.has(key)) {
      console.log('DB 중복 확인, 업로드 스킵:', path.basename(item.filePath))
      markSuccess(item.id)
    }
  }

  const CONCURRENCY = 5
  const total = uploadItems.length
  let successCount = 0
  let failedCount = 0

  if (total > 0) {
    mainWindow?.webContents.send('upload:progress', { done: 0, total, failed: 0 })

    for (let i = 0; i < uploadItems.length; i += CONCURRENCY) {
      const chunk = uploadItems.slice(i, i + CONCURRENCY)
      await Promise.allSettled(
        chunk.map(async (item) => {
          try {
            await uploadFile(item)
            markSuccess(item.id)
            successCount++
            console.log('업로드 성공:', item.filePath)
          } catch (err) {
            markFailed(item.id)
            failedCount++
            console.error('업로드 실패:', item.filePath, err.message)
          }
          mainWindow?.webContents.send('upload:progress', {
            done: successCount + failedCount,
            total,
            failed: failedCount,
          })
        })
      )
    }

    mainWindow?.webContents.send('upload:done', {
      total,
      success: successCount,
      failed: failedCount,
    })
  }

  isProcessing = false
}

// ── 파일 감시 ────────────────────────────────────────
function startWatcherForPath(folderPath) {
  if (watchers[folderPath]) return // 이미 감시 중

  console.log('감시 시작:', folderPath)
  const w = chokidar.watch(folderPath, {
    ignored: (filePath) => path.basename(filePath).startsWith('.'),
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

    addToQueue({ filePath, projectId: mapping.projectId })
    if (isOnline) {
      // 300ms 대기 후 실행 — 연속 파일 감지 시 큐에 모아서 한 번에 처리
      setTimeout(() => processQueue(), 300)
    }
  })


  w.on('unlink', async (filePath) => {
    const ext = path.extname(filePath).toLowerCase()
    if (!IMAGE_EXTENSIONS.includes(ext)) return

    console.log('파일 삭제 감지:', filePath)
    mainWindow?.webContents.send('watcher:deletedFile', filePath)

    if (!authToken) return

    try {
      const filename = path.basename(filePath)
      const mapping = getProjectForFolder(path.dirname(filePath))
      if (!mapping) return

      // DB에서 해당 파일 찾기
      const searchRes = await fetch(
        `${API_BASE}/photos/exists?project_id=${encodeURIComponent(mapping.projectId)}&filename=${encodeURIComponent(filename)}`,
        { headers: { 'Authorization': `Bearer ${authToken}` } }
      )
      const searchData = await searchRes.json()
      if (!searchData.exists) return

      // local_missing = true 업데이트
      await fetch(
        `${API_BASE}/photos/by-filename/local-missing?project_id=${encodeURIComponent(mapping.projectId)}&filename=${encodeURIComponent(filename)}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ local_missing: true }),
        }
      )
      console.log('local_missing 업데이트:', filename)
    } catch (err) {
      console.error('local_missing 업데이트 실패:', err.message)
    }
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
    trafficLightPosition: { x: 16, y: 18 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    //mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(process.resourcesPath, 'frontend', 'dist', 'index.html'))
    // 로드 완료 후 해시 라우트로 이동
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow.webContents.executeJavaScript("window.location.hash = '#/'")
    })
  }
}

// ── 앱 시작 ──────────────────────────────────────────
app.whenReady().then(() => {
  initQueue()
  createWindow()

  // 토큰이 있을 때만 감시 시작 — auth:setToken에서 처리
  // 기존 매핑 폴더 감시는 로그인 후에만 시작

  // 네트워크 상태 감지 (5초 폴링)
  setInterval(() => {
    const online = net.isOnline()
    if (!isOnline && online) {
      console.log('네트워크 재연결 감지 → 큐 처리 시작')
      if (authToken) processQueue()
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