import { useEffect, useState } from 'react'
import axios from 'axios'

const API = 'http://localhost:8000'

interface PortfolioProject {
  id: string
  title: string
  title_en: string
  description: string
  description_en: string
  cover_image_url: string
  location: string
  photos: { id: string; image_url: string; caption: string }[]
}

export default function Portfolio() {
  const [projects, setProjects] = useState<PortfolioProject[]>([])

  useEffect(() => {
    axios.get(`${API}/portfolio/`).then(res => setProjects(res.data))
  }, [])

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-8">Portfolio</h2>

      {projects.map(project => (
        <div key={project.id} className="mb-16">
          <h3 className="text-xl font-bold mb-1">{project.title}</h3>
          {project.title_en && <p className="text-gray-400 text-sm mb-2">{project.title_en}</p>}
          {project.location && <p className="text-xs text-gray-400 mb-4">📍 {project.location}</p>}
          {project.description && <p className="text-gray-600 mb-6">{project.description}</p>}
          <div className="grid grid-cols-2 gap-3">
            {project.photos.map(photo => (
              <img key={photo.id} src={photo.image_url} alt={photo.caption} className="w-full object-cover rounded" />
            ))}
          </div>
        </div>
      ))}

      {projects.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p>공개된 프로젝트가 없어요</p>
        </div>
      )}
    </div>
  )
}