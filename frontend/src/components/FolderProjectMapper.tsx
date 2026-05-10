import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { Folder, FolderOpen, X, Link, TriangleAlert } from 'lucide-react'
import ConfirmModal from './ConfirmModal'

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
  const [confirmModal, setConfirmModal] = useState<{ folderPath: string; projectId: string; count: number } | null>(null)
  const [missingFolders, setMissingFolders] = useState<Set<string>>(new Set())
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
    checkMissingFolders(result)
  }

  const checkMissingFolders = async (mappingResult: Record<string, Mapping>) => {
    const missing = new Set<string>()
    await Promise.all(
      Object.keys(mappingResult).map(async (folderPath) => {
        const exists = await window.racconto!.folderExists(folderPath)
        if (!exists) missing.add(folderPath)
      })
    )
    setMissingFolders(missing)
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
    const mapping = mappings[folderPath]
    const token = localStorage.getItem('token')
    const res = await axios.get(`${API}/photos/?project_id=${mapping.projectId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const count = res.data.filter((p: any) => p.folder === folderPath && !p.deleted_at).length
    setConfirmModal({ folderPath, projectId: mapping.projectId, count })
  }

  const confirmUnlink = async () => {
    if (!confirmModal) return
    const { folderPath, projectId, count } = confirmModal
    const token = localStorage.getItem('token')
    if (count > 0) {
      await axios.delete(`${API}/photos/by-folder`, {
        params: { project_id: projectId, folder: folderPath },
        headers: { Authorization: `Bearer ${token}` }
      })
    }
    await window.racconto!.unlinkFolder(folderPath)
    setConfirmModal(null)
    loadMappings()
  }

  if (!isElectron) return null // 웹에서는 표시 안 함

  return (
    <>
    {confirmModal && (
      <ConfirmModal
        message={confirmModal.count > 0
          ? t('electron.unlinkConfirm', { count: confirmModal.count })
          : t('electron.unlinkConfirmNoPhotos')}
        onConfirm={confirmUnlink}
        onCancel={() => setConfirmModal(null)}
        dangerous
      />
    )}
    <div className="border-b border-hair py-8">
      <h3 className="t-eyebrow text-muted mb-1 flex items-center gap-2">
        <FolderOpen size={14} strokeWidth={1.5} />
        {t('electron.localFolderConnect')}
      </h3>
      <p className="text-[0.6875rem] text-faint mb-5 ml-6">
        {t('electron.localFolderConnectInfo')}
      </p>

      {/* 연결된 폴더 목록 */}
      {Object.keys(mappings).length > 0 && (
        <div className="mb-4 space-y-2">
          {Object.entries(mappings).map(([folderPath, mapping]) => {
            const isMissing = missingFolders.has(folderPath)
            return (
              <div key={folderPath}
                className={`flex items-center justify-between px-3 py-2 text-sm ${isMissing ? 'bg-amber-50 border border-amber-200' : 'bg-hair/30'}`}>
                <div className="flex items-center gap-2 min-w-0">
                  {isMissing
                    ? <TriangleAlert size={14} strokeWidth={1.5} className="text-amber-500 shrink-0" />
                    : <Link size={14} strokeWidth={1.5} className="text-faint shrink-0" />
                  }
                  <div className="min-w-0">
                    <p className={`font-medium truncate ${isMissing ? 'text-amber-700' : 'text-ink-2'}`}>
                      {mapping.projectName}
                    </p>
                    <p className={`text-xs truncate ${isMissing ? 'text-amber-500' : 'text-faint'}`}>
                      {folderPath}
                    </p>
                    {isMissing && (
                      <p className="text-xs text-amber-600 mt-0.5">{t('electron.folderMissingTooltip')}</p>
                    )}
                  </div>
                </div>
                <button onClick={() => handleUnlink(folderPath)}
                  className="ml-2 text-faint hover:text-[oklch(0.50_0.15_25)] shrink-0 transition-colors">
                  <X size={14} strokeWidth={1.5} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* 새 폴더 연결 */}
      <div className="flex items-center gap-2">
        <button onClick={handleSelectFolder}
          className="px-3 py-2 text-sm border-hair border hover:bg-canvas-2 shrink-0 transition-colors">
          {selectedFolder
            ? <span className="flex items-center gap-1"><Folder size={14} strokeWidth={1.5} />{selectedFolder.split('/').pop()}</span>
            : t('electron.selectFolder')}
        </button>
        <select
          value={selectedProjectId}
          onChange={e => setSelectedProjectId(e.target.value)}
          className="border-hair border px-3 py-2 text-sm outline-none focus:border-ink flex-1 transition-colors">
          <option value="">{t('electron.selectProject')}</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
        <button
          onClick={handleLink}
          disabled={!selectedFolder || !selectedProjectId}
          className="px-4 py-2 text-sm bg-ink text-canvas hover:bg-ink-2 disabled:opacity-40 shrink-0 transition-colors">
          {t('electron.connect')}
        </button>
      </div>
      {selectedFolder && (
        <p className="text-[0.6875rem] text-faint mt-1.5 truncate">{selectedFolder}</p>
      )}
    </div>
    </>
  )
}