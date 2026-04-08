import { useEffect, useState } from 'react'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import Heading from '../components/Heading' //

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
    } catch (err: any) {
      const detail = err.response?.data?.detail
      const code = typeof detail === 'object' ? detail.code : detail
      const limit = typeof detail === 'object' ? detail.limit : undefined

      if (code === 'PROJECT_LIMIT_EXCEEDED') {
        alert(t('api.error.PROJECT_LIMIT_EXCEEDED', { limit }))
      }
    }
  }

  const handlePermanentDelete = async (projectId: string) => {
    if (!confirm(t('trash.permanentDeleteConfirm'))) return
    await axios.delete(`${API}/projects/${projectId}/permanent`)
    fetchTrash()
  }

  const getDaysLeft = (deletedAt: string) => {
    const deleted = new Date(deletedAt)
    const now = new Date()
    const diff = Math.floor((now.getTime() - deleted.getTime()) / (1000 * 60 * 60 * 24))
    return 30 - diff
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Heading level={2} className="mb-2">
        {t('trash.title')}
      </Heading>
      <p className="text-sm text-gray-400 mb-8">{t('trash.description')}</p>

      {projects.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg mb-2">{t('trash.empty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map(project => (
            <div key={project.id} className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{project.title}</h3>
                {project.title_en && <p className="text-xs text-gray-400">{project.title_en}</p>}
                <p className="text-xs text-red-400 mt-1">
                  {getDaysLeft(project.deleted_at)}{t('trash.deletedAt')}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRestore(project.id)}
                  className="border px-3 py-1 text-sm hover:bg-gray-50"
                >
                  {t('trash.restore')}
                </button>
                <button
                  onClick={() => handlePermanentDelete(project.id)}
                  className="bg-red-500 text-white px-3 py-1 text-sm hover:bg-red-600"
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