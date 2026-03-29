import { useEffect, useState } from 'react'
import axios from 'axios'

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

  const fetchTrash = async () => {
    const res = await axios.get(`${API}/projects/trash`)
    setProjects(res.data)
  }

  useEffect(() => {
    fetchTrash()
  }, [])

  const handleRestore = async (projectId: string) => {
    await axios.post(`${API}/projects/${projectId}/restore`)
    fetchTrash()
  }

  const handlePermanentDelete = async (projectId: string) => {
    if (!confirm('영구 삭제할까요? 복구할 수 없습니다.')) return
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
      <h2 className="text-2xl font-bold mb-2">휴지통</h2>
      <p className="text-sm text-gray-400 mb-8">삭제 후 30일이 지나면 자동으로 영구 삭제됩니다</p>

      {projects.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg mb-2">휴지통이 비어있어요</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map(project => (
            <div key={project.id} className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{project.title}</h3>
                {project.title_en && <p className="text-xs text-gray-400">{project.title_en}</p>}
                <p className="text-xs text-red-400 mt-1">
                  {getDaysLeft(project.deleted_at)}일 후 자동 삭제
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRestore(project.id)}
                  className="border px-3 py-1 text-sm hover:bg-gray-50"
                >
                  복구
                </button>
                <button
                  onClick={() => handlePermanentDelete(project.id)}
                  className="bg-red-500 text-white px-3 py-1 text-sm hover:bg-red-600"
                >
                  영구 삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}