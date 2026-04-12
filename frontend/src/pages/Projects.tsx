import { useEffect, useState } from 'react'
import axios from 'axios'
import ProjectCard from '../components/ProjectCard'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Heading from '../components/Heading' //

const API = import.meta.env.VITE_API_URL

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

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [titleEn, setTitleEn] = useState('')
  const [description, setDescription] = useState('')
  const [descriptionEn, setDescriptionEn] = useState('')
  const [location, setLocation] = useState('')
  const [status, setStatus] = useState('in_progress')
  const [isPublic, setIsPublic] = useState('false')
  const { t } = useTranslation()

  const handleDelete = async (projectId: string) => {
    if (!confirm((t('project.deleteConfirm')))) return
    await axios.delete(`${API}/projects/${projectId}`)
    fetchProjects()
  }

  const fetchProjects = async () => {
    const res = await axios.get(`${API}/projects/`)
    setProjects(res.data)
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const handleSubmit = async () => {
    if (!title) return
    try {
      await axios.post(`${API}/projects/`, {
        title, title_en: titleEn,
        description, description_en: descriptionEn,
        location, status, is_public: isPublic
      })
      setTitle(''); setTitleEn(''); setDescription('')
      setDescriptionEn(''); setLocation('')
      setStatus('in_progress'); setIsPublic('false')
      setShowForm(false)
      fetchProjects()
    } catch (err: any) {
      const detail = err.response?.data?.detail
      const code = typeof detail === 'object' ? detail.code : detail
      const limit = typeof detail === 'object' ? detail.limit : undefined

      if (code === 'PROJECT_LIMIT_EXCEEDED') {
        alert(t('api.error.PROJECT_LIMIT_EXCEEDED', { limit }))
      }
    }
  }

  const isElectron = !!window.racconto

  return (
    <div className={`${isElectron ? 'w-full' : 'max-w-7xl mx-auto'} p-6`}>
      <div className="flex items-center justify-between mb-8">
          <Heading level={2} className="mb-2">
            {t('nav.projects')}
          </Heading>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-stone-600 text-white px-4 py-2 text-sm tracking-wider hover:bg-stone-700 transition-colors rounded"
        >
          {t('project.newProject')}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="font-semibold mb-4">{t('project.createProject')}</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <input className="border rounded px-3 py-2" placeholder={t('project.projectName')} value={title} onChange={e => setTitle(e.target.value)} />
            <textarea className="border rounded px-3 py-2 col-span-2" placeholder={t('project.description')} rows={2} value={description} onChange={e => setDescription(e.target.value)} />
            <input className="border rounded px-3 py-2" placeholder={t('project.location')} value={location} onChange={e => setLocation(e.target.value)} />
            <select className="border rounded px-3 py-2" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="in_progress">{t('project.statusInProgress')}</option>
              <option value="completed">{t('project.statusCompleted')}</option>
              <option value="published">{t('project.statusPublished')}</option>
              <option value="archived">{t('project.statusArchived')}</option>
            </select>
            <select className="border rounded px-3 py-2" value={isPublic} onChange={e => setIsPublic(e.target.value)}>
              <option value="false">{t('project.privateProject')}</option>
              <option value="true">{t('project.publicProject')}</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSubmit} className="bg-stone-600 text-white px-6 py-2 text-sm tracking-wider hover:bg-stone-700 transition-colors rounded">{t('common.save')}</button>
            <button onClick={() => {
              setShowForm(false)
              setTitle(''); setTitleEn(''); setDescription('')
              setDescriptionEn(''); setLocation('')
              setStatus('in_progress'); setIsPublic('false')
            }} className="border border-stone-300 px-6 py-2 text-sm text-stone-600 hover:bg-stone-50 rounded">{t('common.cancel')}</button>
          </div>
        </div>
      )}

      <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {projects.map(project => (
          <div key={project.id} className="relative group">
            <ProjectCard project={project} />
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <Link
                to={`/projects/${project.id}/edit`}
                className="bg-white text-black px-2 py-1 text-xs rounded shadow hover:bg-gray-100"
                onClick={e => e.stopPropagation()}
              >
                {t('common.edit')}
              </Link>
              <button
                onClick={e => { e.preventDefault(); handleDelete(project.id) }}
                className="bg-red-500 text-white px-2 py-1 text-xs rounded shadow hover:bg-red-600"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg mb-2">{t('project.noProjects')}</p>
        </div>
      )}
    </div>
  )
}