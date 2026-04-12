import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { FolderOpenIcon, XMarkIcon, LinkIcon } from '@heroicons/react/24/outline'

const API = import.meta.env.VITE_API_URL

interface Mapping {
  projectId: string
  projectName: string
  linkedAt: string
}

interface Project {
  id: string
  title: string
}

export default function FolderProjectMapper() {
  const [mappings, setMappings] = useState<Record<string, Mapping>>({})
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const { t } = useTranslation()

  const isElectron = !!window.racconto

  useEffect(() => {
    if (!isElectron) return
    loadMappings()
    loadProjects()
  }, [])

  const loadMappings = async () => {
    const result = await window.racconto!.getAllMappings()
    setMappings(result)
  }

  const loadProjects = async () => {
    const token = localStorage.getItem('token')
    const res = await axios.get(`${API}/projects/`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    setProjects(res.data)
  }

  const handleSelectFolder = async () => {
    const folder = await window.racconto!.openFolder()
    if (folder) setSelectedFolder(folder)
  }

  const handleLink = async () => {
    if (!selectedFolder || !selectedProjectId) return
    const project = projects.find(p => p.id === selectedProjectId)
    if (!project) return
    await window.racconto!.linkFolder(selectedFolder, project.id, project.title)
    
    // 폴더 연결 후 감시 자동 시작
    await window.racconto!.startWatcher(selectedFolder)
    
    setSelectedFolder(null)
    setSelectedProjectId('')
    loadMappings()
  }

  const handleUnlink = async (folderPath: string) => {
    await window.racconto!.unlinkFolder(folderPath)
    loadMappings()
  }

  if (!isElectron) return null // 웹에서는 표시 안 함

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="font-semibold mb-1 flex items-center gap-2">
        <FolderOpenIcon className="w-5 h-5 text-gray-500" />
        {t('electron.localFolderConnect')}
      </h3>
      <p className="text-xs text-gray-400 mb-4 ml-7">
        {t('electron.localFolderConnectInfo')}
      </p>

      {/* 연결된 폴더 목록 */}
      {Object.keys(mappings).length > 0 && (
        <div className="mb-4 space-y-2">
          {Object.entries(mappings).map(([folderPath, mapping]) => (
            <div key={folderPath}
              className="flex items-center justify-between bg-gray-50 rounded px-3 py-2 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <LinkIcon className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-gray-700 truncate">{mapping.projectName}</p>
                  <p className="text-xs text-gray-400 truncate">{folderPath}</p>
                </div>
              </div>
              <button onClick={() => handleUnlink(folderPath)}
                className="ml-2 text-gray-400 hover:text-red-500 shrink-0">
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 새 폴더 연결 */}
      <div className="flex items-center gap-2">
        <button onClick={handleSelectFolder}
          className="px-3 py-2 text-sm border rounded hover:bg-gray-50 shrink-0">
          {selectedFolder ? '📁 ' + selectedFolder.split('/').pop() : t('electron.selectFolder')}
        </button>
        <select
          value={selectedProjectId}
          onChange={e => setSelectedProjectId(e.target.value)}
          className="border rounded px-3 py-2 text-sm outline-none focus:border-black flex-1">
          <option value="">{t('electron.selectProject')}</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
        <button
          onClick={handleLink}
          disabled={!selectedFolder || !selectedProjectId}
          className="px-4 py-2 text-sm bg-black text-white rounded hover:bg-gray-800 disabled:opacity-40 shrink-0">
          {t('electron.connect')}
        </button>
      </div>
      {selectedFolder && (
        <p className="text-xs text-gray-400 mt-1.5 truncate">{selectedFolder}</p>
      )}
    </div>
  )
}