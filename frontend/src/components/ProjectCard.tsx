import { Link } from 'react-router-dom'

interface Project {
  id: string
  title: string
  title_en: string
  description: string
  status: string
  location: string
  cover_image_url: string
  is_public: string
  created_at: string
}

const statusLabel: Record<string, string> = {
  in_progress: '진행 중',
  completed: '완성',
  published: '발표됨',
  archived: '보관'
}

const statusColor: Record<string, string> = {
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-blue-100 text-blue-800',
  published: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-800'
}

export default function ProjectCard({ project }: { project: Project }) {
  return (
    <Link to={`/projects/${project.id}`}>
      <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden">
        <div className="h-48 bg-gray-100 flex items-center justify-center">
          {project.cover_image_url ? (
            <img
              src={project.cover_image_url}
              alt={project.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-gray-400 text-sm">이미지 없음</span>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-bold text-gray-900">{project.title}</h3>
            <span className={`text-xs px-2 py-1 rounded-full ml-2 shrink-0 ${statusColor[project.status] || 'bg-gray-100'}`}>
              {statusLabel[project.status] || project.status}
            </span>
          </div>
          {project.title_en && (
            <p className="text-xs text-gray-400 mb-2">{project.title_en}</p>
          )}
          {project.description && (
            <p className="text-sm text-gray-600 line-clamp-2">{project.description}</p>
          )}
          {project.location && (
            <p className="text-xs text-gray-400 mt-2">📍 {project.location}</p>
          )}
        </div>
      </div>
    </Link>
  )
}