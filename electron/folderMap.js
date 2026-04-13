const fs = require('fs')
const path = require('path')
const { app } = require('electron')

const MAP_PATH = path.join(app.getPath('userData'), 'folder_map.json')

function loadMap() {
  try {
    if (!fs.existsSync(MAP_PATH)) return {}
    return JSON.parse(fs.readFileSync(MAP_PATH, 'utf-8'))
  } catch {
    return {}
  }
}

function saveMap(map) {
  fs.promises.writeFile(MAP_PATH, JSON.stringify(map, null, 2))
    .catch(err => console.error('폴더 맵 저장 실패:', err))
}

// 폴더 → 프로젝트 연결
function linkFolder(folderPath, projectId, projectName) {
  const map = loadMap()
  map[folderPath] = { projectId, projectName, linkedAt: new Date().toISOString() }
  saveMap(map)
}

// 폴더 → 프로젝트 연결 해제
function unlinkFolder(folderPath) {
  const map = loadMap()
  delete map[folderPath]
  saveMap(map)
}

// 폴더에 연결된 프로젝트 조회
function getProjectForFolder(folderPath) {
  const map = loadMap()
  // 정확한 폴더 매칭 먼저, 없으면 상위 폴더 탐색
  if (map[folderPath]) return map[folderPath]
  const parent = path.dirname(folderPath)
  if (parent !== folderPath) return getProjectForFolder(parent)
  return null
}

// 전체 매핑 목록
function getAllMappings() {
  return loadMap()
}

module.exports = {
  linkFolder,
  unlinkFolder,
  getProjectForFolder,
  getAllMappings,
}