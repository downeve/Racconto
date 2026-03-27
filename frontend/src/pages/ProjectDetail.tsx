import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'

const API = 'http://localhost:8000'

interface Project {
  id: string
  title: string
  title_en: string
  description: string
  description_en: string
  status: string
  location: string
  is_public: string
}

interface Photo {
  id: string
  image_url: string
  caption: string
  is_portfolio: string
}

export default function ProjectDetail() {
  const { id } = useParams()
  const [project, setProject] = useState<Project | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])

  useEffect(() => {
    if (!id) return
    axios.get(`${API}/projects/${id}`).then(res => setProject(res.data))
    axios.get(`${API}/photos/?project_id=${id}`).then(res => setPhotos(res.data))
  }, [id])

  if (!project) return <div className="p-6 text-gray-400">로딩 중...</div>

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-1">{project.title}</h2>
        {project.title_en && <p className="text-gray-400 mb-4">{project.title_en}</p>}
        {project.location && <p className="text-sm text-gray-500 mb-4">📍 {project.location}</p>}
        {project.description && <p className="text-gray-700 mb-2">{project.description}</p>}
        {project.description_en && <p className="text-gray-500 text-sm">{project.description_en}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {photos.map(photo => (
          <div key={photo.id} className="rounded overflow-hidden bg-gray-100">
            <img src={photo.image_url} alt={photo.caption} className="w-full object-cover" />
            {photo.caption && <p className="p-2 text-sm text-gray-600">{photo.caption}</p>}
          </div>
        ))}
      </div>

      {photos.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p>아직 사진이 없어요</p>
        </div>
      )}
    </div>
  )
}