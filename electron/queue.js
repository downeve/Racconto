const fs = require('fs')
const path = require('path')
const { app } = require('electron')

// 큐 파일 위치: 앱 데이터 폴더에 저장
const QUEUE_PATH = path.join(app.getPath('userData'), 'upload_queue.json')

function loadQueue() {
  try {
    if (!fs.existsSync(QUEUE_PATH)) return []
    return JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf-8'))
  } catch {
    return []
  }
}

function saveQueue(queue) {
  fs.writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2))
}

function addToQueue(item) {
  const queue = loadQueue()
  queue.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    filePath: item.filePath,
    projectId: item.projectId,
    status: 'pending',
    createdAt: new Date().toISOString(),
    retryCount: 0,
  })
  saveQueue(queue)
}

function getPendingItems() {
  return loadQueue().filter(item => item.status === 'pending')
}

function markSuccess(id) {
  const queue = loadQueue()
  const updated = queue.filter(item => item.id !== id) // 완료된 건 큐에서 제거
  saveQueue(updated)
}

function markFailed(id) {
  const queue = loadQueue()
  const updated = queue.map(item =>
    item.id === id
      ? { ...item, status: 'failed', retryCount: item.retryCount + 1 }
      : item
  )
  saveQueue(updated)
}

function resetFailedToPending() {
  const queue = loadQueue()
  const updated = queue.map(item =>
    item.status === 'failed' && item.retryCount < 3
      ? { ...item, status: 'pending' }
      : item
  )
  saveQueue(updated)
}

module.exports = {
  addToQueue,
  getPendingItems,
  markSuccess,
  markFailed,
  resetFailedToPending,
}