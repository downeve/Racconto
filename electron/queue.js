const fs = require('fs')
const path = require('path')
const { app } = require('electron')

const QUEUE_PATH = path.join(app.getPath('userData'), 'upload_queue.json')

// 메모리 캐시
let memoryQueue = null

// 앱 시작 시 1회 동기 로드 (초기화 시점이라 허용)
function initQueue() {
  try {
    if (!fs.existsSync(QUEUE_PATH)) {
      memoryQueue = []
      return
    }
    memoryQueue = JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf-8'))
  } catch {
    memoryQueue = []
  }
}

// 디스크 저장은 비동기로 (UI 블로킹 방지)
function persistQueue() {
  fs.promises.writeFile(QUEUE_PATH, JSON.stringify(memoryQueue, null, 2))
    .catch(err => console.error('큐 저장 실패:', err))
}

function addToQueue(item) {
  if (!memoryQueue) initQueue()
  const exists = memoryQueue.some(q => q.filePath === item.filePath)
  if (exists) return
  memoryQueue.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    filePath: item.filePath,
    projectId: item.projectId,
    status: 'pending',
    createdAt: new Date().toISOString(),
    retryCount: 0,
  })
  persistQueue()
}

function getPendingItems() {
  if (!memoryQueue) initQueue()
  return memoryQueue.filter(item => item.status === 'pending')
}

function markSuccess(id) {
  if (!memoryQueue) initQueue()
  memoryQueue = memoryQueue.filter(item => item.id !== id)
  persistQueue()
}

function markFailed(id) {
  if (!memoryQueue) initQueue()
  memoryQueue = memoryQueue.map(item =>
    item.id === id
      ? { ...item, status: 'failed', retryCount: item.retryCount + 1 }
      : item
  )
  persistQueue()
}

function resetFailedToPending() {
  if (!memoryQueue) initQueue()
  memoryQueue = memoryQueue.map(item =>
    item.status === 'failed' && item.retryCount < 3
      ? { ...item, status: 'pending' }
      : item
  )
  persistQueue()
}

module.exports = {
  initQueue,
  addToQueue,
  getPendingItems,
  markSuccess,
  markFailed,
  resetFailedToPending,
}