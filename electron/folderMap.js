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
function linkFolder(folderPath, projectId, projectName, userId) {
  const map = loadMap()
  map[folderPath] = { projectId, projectName, userId, linkedAt: new Date().toISOString() }
  saveMap(map)
}

// 폴더 → 프로젝트 연결 해제
function unlinkFolder(folderPath) {
  const map = loadMap()
  delete map[folderPath]
  saveMap(map)
}

// 폴더에 연결된 프로젝트 조회 (현재 유저 소유 매핑만)
function getProjectForFolder(folderPath, userId) {
  const map = loadMap()
  if (map[folderPath]) {
    // userId가 일치하거나 레거시 데이터(userId 없음)는 허용
    if (!userId || !map[folderPath].userId || map[folderPath].userId === userId) {
      return map[folderPath]
    }
    return null
  }
  const parent = path.dirname(folderPath)
  if (parent !== folderPath) return getProjectForFolder(parent, userId)
  return null
}

// 특정 유저의 매핑만 반환
function getMappingsForUser(userId) {
  const map = loadMap()
  const result = {}
  for (const [folderPath, mapping] of Object.entries(map)) {
    // userId가 일치하거나 레거시 데이터(userId 없음)는 포함
    if (!mapping.userId || mapping.userId === userId) {
      result[folderPath] = mapping
    }
  }
  return result
}

// 전체 매핑 목록
function getAllMappings() {
  return loadMap()
}

module.exports = {
  linkFolder,
  unlinkFolder,
  getProjectForFolder,
  getMappingsForUser,
  getAllMappings,
}
