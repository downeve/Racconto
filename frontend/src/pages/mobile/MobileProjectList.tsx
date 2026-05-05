import { useEffect, useRef, useState, useCallback } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MoreVertical } from 'lucide-react'
import { useMobileLayout } from '../../context/MobileLayoutContext'
import { useElectronSidebar } from '../../context/ElectronSidebarContext'
import MobileShell from '../../components/mobile/MobileShell'
import ConfirmModal from '../../components/ConfirmModal'
import ToastNotification from '../../components/ToastNotification'

const API = import.meta.env.VITE_API_URL

interface Project {
  id: string
  slug: string | null
  title: string
  title_en: string
  description: string
  status: string
  location: string
  cover_image_url: string
  is_public: string
  created_at: string
  updated_at: string
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  in_progress: { label: 'project.statusInProgress', cls: 'bg-purple-400 text-white' },
  completed: { label: 'project.statusCompleted', cls: 'bg-green-500 text-white' },
  published: { label: 'project.statusPublished', cls: 'bg-blue-400 text-white' },
  archived: { label: 'project.statusArchived', cls: 'bg-stone-300 text-stone-700' },
}

export default function MobileProjectList() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { setBottomSheetContent, setFabAction } = useMobileLayout()
  const { triggerRefresh } = useElectronSidebar()

  const [projects, setProjects] = useState<Project[]>([])
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 새 프로젝트 폼 상태
  const [showNewForm, setShowNewForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [status, setStatus] = useState('in_progress')
  const [isPublic, setIsPublic] = useState('false')

  const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ message, type })
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }

  const fetchProjects = async () => {
    const res = await axios.get(`${API}/projects/`)
    setProjects(res.data)
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  useEffect(() => {
    setFabAction(() => () => setShowNewForm(true))
    return () => setFabAction(null)
  }, [setFabAction])

  const handleDelete = useCallback((projectId: string) => {
    setBottomSheetContent(null)
    setConfirmModal({
      message: t('project.deleteConfirm'),
      onConfirm: async () => {
        setConfirmModal(null)
        try {
          await axios.delete(`${API}/projects/${projectId}`)
          setProjects(prev => prev.filter(p => p.id !== projectId))
          triggerRefresh()
        } catch {
          showToast(t('common.error'), 'error')
        }
      },
    })
  }, [t, triggerRefresh, setBottomSheetContent])

  const handleMoveUp = (idx: number) => {
    if (idx === 0) return
    const next = [...projects]
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    setProjects(next)
    axios.patch(`${API}/projects/reorder`, { ids: next.map(p => p.id) }).catch(() => {})
    triggerRefresh()
  }

  const handleMoveDown = (idx: number) => {
    if (idx === projects.length - 1) return
    const next = [...projects]
    ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    setProjects(next)
    axios.patch(`${API}/projects/reorder`, { ids: next.map(p => p.id) }).catch(() => {})
    triggerRefresh()
  }

  const openProjectMenu = (project: Project, idx: number) => {
    setBottomSheetContent(
      <div className="pb-4">
        <div className="px-4 py-3 text-sm font-semibold text-stone-700 border-b border-stone-100">{project.title}</div>
        <button
          onClick={() => { setBottomSheetContent(null); navigate(`/projects/${project.slug || project.id}/edit`) }}
          className="w-full text-left px-4 py-3 min-h-[44px] text-sm text-stone-700"
        >
          {t('common.edit')}
        </button>
        <button
          onClick={() => handleMoveUp(idx)}
          disabled={idx === 0}
          className="w-full text-left px-4 py-3 min-h-[44px] text-sm text-stone-700 disabled:opacity-30"
        >
          {t('common.moveUp') || '위로'}
        </button>
        <button
          onClick={() => handleMoveDown(idx)}
          disabled={idx === projects.length - 1}
          className="w-full text-left px-4 py-3 min-h-[44px] text-sm text-stone-700 disabled:opacity-30"
        >
          {t('common.moveDown') || '아래로'}
        </button>
        <button
          onClick={() => handleDelete(project.id)}
          className="w-full text-left px-4 py-3 min-h-[44px] text-sm text-red-500"
        >
          {t('common.delete')}
        </button>
      </div>
    )
  }

  const handleSubmit = async () => {
    if (!title) return
    try {
      await axios.post(`${API}/projects/`, {
        title, title_en: '',
        description, description_en: '',
        location, status, is_public: isPublic
      })
      setTitle(''); setDescription(''); setLocation('')
      setStatus('in_progress'); setIsPublic('false')
      setShowNewForm(false)
      fetchProjects()
      triggerRefresh()
    } catch (err: any) {
      const detail = err.response?.data?.detail
      const code = typeof detail === 'object' ? detail.code : detail
      const limit = typeof detail === 'object' ? detail.limit : undefined
      if (code === 'PROJECT_LIMIT_EXCEEDED') {
        showToast(t('api.error.PROJECT_LIMIT_EXCEEDED', { limit }), 'warning')
      }
    }
  }

  return (
    <MobileShell title={t('common.projects')}>
      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
          dangerous
        />
      )}
      {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-col gap-3 p-4">
        {projects.map((project, idx) => {
          const badge = STATUS_BADGE[project.status]
          return (
            <div
              key={project.id}
              className="bg-white rounded-xl shadow-sm border border-stone-100 flex items-center gap-3 p-3 active:bg-stone-50"
              onClick={() => navigate(`/projects/${project.slug || project.id}`)}
            >
              <div className="shrink-0">
                {project.cover_image_url ? (
                  <img
                    src={project.cover_image_url}
                    className="w-20 h-20 rounded-lg object-cover"
                    alt={project.title}
                  />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-stone-100" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-stone-900 truncate text-sm">{project.title}</p>
                {project.location && (
                  <p className="text-xs text-stone-400 truncate mt-0.5">{project.location}</p>
                )}
                {badge && (
                  <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>
                    {t(badge.label)}
                  </span>
                )}
              </div>
              <button
                onClick={e => { e.stopPropagation(); openProjectMenu(project, idx) }}
                className="shrink-0 flex items-center justify-center min-w-[44px] min-h-[44px]"
              >
                <MoreVertical size={18} strokeWidth={1.5} className="text-stone-400" />
              </button>
            </div>
          )
        })}
      </div>

      {/* 새 프로젝트 전체화면 모달 */}
      {showNewForm && (
        <div className="fixed inset-0 z-50 bg-[#F7F4F0] flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200">
            <button onClick={() => setShowNewForm(false)} className="min-w-[44px] min-h-[44px] flex items-center justify-center text-stone-500 text-sm">
              {t('common.cancel')}
            </button>
            <span className="font-semibold text-stone-900 text-sm">{t('project.createProject')}</span>
            <button onClick={handleSubmit} className="min-w-[44px] min-h-[44px] flex items-center justify-center text-stone-900 font-semibold text-sm">
              {t('common.save')}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            <input
              className="border border-stone-200 rounded-xl px-4 py-3 text-sm bg-white"
              placeholder={t('project.projectName')}
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
            <textarea
              className="border border-stone-200 rounded-xl px-4 py-3 text-sm bg-white"
              placeholder={t('project.description')}
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
            <input
              className="border border-stone-200 rounded-xl px-4 py-3 text-sm bg-white"
              placeholder={t('project.location')}
              value={location}
              onChange={e => setLocation(e.target.value)}
            />
            <select
              className="border border-stone-200 rounded-xl px-4 py-3 text-sm bg-white"
              value={status}
              onChange={e => setStatus(e.target.value)}
            >
              <option value="in_progress">{t('project.statusInProgress')}</option>
              <option value="completed">{t('project.statusCompleted')}</option>
              <option value="published">{t('project.statusPublished')}</option>
              <option value="archived">{t('project.statusArchived')}</option>
            </select>
            <select
              className="border border-stone-200 rounded-xl px-4 py-3 text-sm bg-white"
              value={isPublic}
              onChange={e => setIsPublic(e.target.value)}
            >
              <option value="false">{t('project.privateProject')}</option>
              <option value="true">{t('project.publicProject')}</option>
            </select>
          </div>
        </div>
      )}
    </MobileShell>
  )
}
