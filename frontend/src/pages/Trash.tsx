import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import ConfirmModal from '../components/ConfirmModal'
import ToastNotification from '../components/ToastNotification'
import { useElectronSidebar } from '../context/ElectronSidebarContext'

const API = import.meta.env.VITE_API_URL

interface Project {
  id: string
  title: string
  title_en: string
  description: string
  status: string
  deleted_at: string
}

export default function Trash() {
  const [projects, setProjects] = useState<Project[]>([])
  const { t } = useTranslation()
  const { triggerRefresh } = useElectronSidebar()

  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ message, type })
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }

  const fetchTrash = async () => {
    const res = await axios.get(`${API}/projects/trash`)
    setProjects(res.data)
  }

  useEffect(() => {
    fetchTrash()
  }, [])

  const handleRestore = async (projectId: string) => {
    try {
      await axios.post(`${API}/projects/${projectId}/restore`)
      fetchTrash()
      triggerRefresh()
    } catch (err: any) {
      const detail = err.response?.data?.detail
      const code = typeof detail === 'object' ? detail.code : detail
      const limit = typeof detail === 'object' ? detail.limit : undefined

      if (code === 'PHOTO_LIMIT_EXCEEDED') {
        showToast(t('api.error.PHOTO_LIMIT_EXCEEDED', { limit }), 'warning')
      } else if (code === 'PROJECT_LIMIT_EXCEEDED') {
        showToast(t('api.error.PROJECT_LIMIT_EXCEEDED', { limit }), 'warning')
      } else {
        showToast(t('common.error'), 'error')
      }
    }
  }

  const handlePermanentDelete = (projectId: string) => {
    setConfirmModal({
      message: t('trash.permanentDeleteConfirm'),
      onConfirm: async () => {
        setConfirmModal(null)
        try {
          await axios.delete(`${API}/projects/${projectId}/permanent`)
          fetchTrash()
        } catch (err: any) {
          console.error(err)
          const errorMessage = err.response?.data?.detail || t('trash.deleteProjectError')
          showToast(errorMessage, 'error')
        }
      },
    })
  }

  const getDaysLeft = (deletedAt: string) => {
    const deleted = new Date(deletedAt)
    const now = new Date()
    const diff = Math.floor((now.getTime() - deleted.getTime()) / (1000 * 60 * 60 * 24))
    return 30 - diff
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
          dangerous
        />
      )}
      {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <header className="mb-10">
        <p className="t-eyebrow text-muted mb-2">Archive</p>
        <h1 className="font-serif text-[32px] leading-[1.1] tracking-[-0.015em] font-normal">
          {t('trash.title')}
        </h1>
      </header>
      <p className="font-serif text-[15px] leading-[1.6] text-muted mb-12 max-w-[520px]">
        {t('trash.description')}
      </p>

      {projects.length === 0 ? (
        <div className="text-center py-20 text-muted">
          <p className="font-serif text-[18px] italic">{t('trash.empty')}</p>
        </div>
      ) : (
        <div>
          {projects.map(project => (
            <div key={project.id} className="border-b border-hair py-5 first:border-t flex items-center justify-between">
              <div>
                <h3 className="font-serif text-[18px] font-medium">{project.title}</h3>
                {project.title_en && (
                  <p className="t-caption text-faint mt-0.5">{project.title_en}</p>
                )}
                <p className="t-caption text-[oklch(0.55_0.10_25)] mt-2">
                  {getDaysLeft(project.deleted_at)}{t('trash.deletedAt')}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRestore(project.id)}
                  className="border border-hair hover:border-ink px-4 py-2 text-[13px] font-medium tracking-[0.02em] transition-colors"
                >
                  {t('trash.restore')}
                </button>
                <button
                  onClick={() => handlePermanentDelete(project.id)}
                  className="bg-[oklch(0.50_0.15_25)] text-canvas px-4 py-2 text-[13px] font-medium"
                >
                  {t('trash.permanentDelete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
