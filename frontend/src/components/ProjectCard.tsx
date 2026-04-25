import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

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
}

const statusColor: Record<string, string> = {
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-blue-100 text-blue-800',
  published: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-800'
}

export default function ProjectCard({ project }: { project: Project }) {
  const { t } = useTranslation()

  return (
    <Link to={`/projects/${project.slug || project.id}`}>
      <div className="bg-card rounded-card shadow hover:shadow transition-shadow overflow-hidden">
        <div className="h-48 bg-hair flex items-center justify-center">
          {project.cover_image_url ? (
            <img
              src={project.cover_image_url}
              alt={project.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-muted text-small">{t('project.noImage')}</span>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-body text-ink [word-break:keep-all]">{project.title}</h3>
            <span className={`text-eyebrow px-2 py-1 rounded-full ml-2 shrink-0 ${statusColor[project.status] || 'bg-hair'}`}>
              {t(`status.${project.status}`)} 
            </span>
          </div>
          {project.description && (
            <p className="text-small text-muted line-clamp-2 [word-break:keep-all]">{project.description}</p>
          )}
          {project.location && (
            <p className="text-small text-faint mt-2">📍 {project.location}</p>
          )}
        </div>
      </div>
    </Link>
  )
}