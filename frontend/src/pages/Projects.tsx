import { useEffect, useState } from 'react'
import axios from 'axios'
import ProjectCard from '../components/ProjectCard'

const API = 'http://localhost:8000'

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

  const fetchProjects = async () => {
    const res = await axios.get(`${API}/projects/`)
    setProjects(res.data)
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const handleSubmit = async () => {
    if (!title) return
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
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold">프로젝트</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-black text-white px-4 py-2 text-sm tracking-wider hover:bg-gray-800"
        >
          + 새 프로젝트
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="font-semibold mb-4">프로젝트 등록</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <input className="border rounded px-3 py-2" placeholder="프로젝트명 (한국어) *" value={title} onChange={e => setTitle(e.target.value)} />
            <input className="border rounded px-3 py-2" placeholder="Project Title (English)" value={titleEn} onChange={e => setTitleEn(e.target.value)} />
            <textarea className="border rounded px-3 py-2 col-span-2" placeholder="설명 (한국어)" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
            <textarea className="border rounded px-3 py-2 col-span-2" placeholder="Description (English)" rows={2} value={descriptionEn} onChange={e => setDescriptionEn(e.target.value)} />
            <input className="border rounded px-3 py-2" placeholder="촬영 장소" value={location} onChange={e => setLocation(e.target.value)} />
            <select className="border rounded px-3 py-2" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="in_progress">진행 중</option>
              <option value="completed">완성</option>
              <option value="published">발표됨</option>
              <option value="archived">보관</option>
            </select>
            <select className="border rounded px-3 py-2" value={isPublic} onChange={e => setIsPublic(e.target.value)}>
              <option value="false">비공개</option>
              <option value="true">공개 (포트폴리오 노출)</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSubmit} className="bg-black text-white px-6 py-2 text-sm hover:bg-gray-800">등록</button>
            <button onClick={() => setShowForm(false)} className="border px-6 py-2 text-sm hover:bg-gray-50">취소</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {projects.map(project => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg mb-2">프로젝트가 없어요</p>
          <p className="text-sm">첫 번째 프로젝트를 등록해봐요</p>
        </div>
      )}
    </div>
  )
}