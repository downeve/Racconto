import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import Heading from '../components/Heading' //

const API = import.meta.env.VITE_API_URL

export default function ProjectEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [titleEn, setTitleEn] = useState('')
  const [description, setDescription] = useState('')
  const [descriptionEn, setDescriptionEn] = useState('')
  const [location, setLocation] = useState('')
  const [status, setStatus] = useState('in_progress')
  const [isPublic, setIsPublic] = useState('false')

  const { t } = useTranslation()

  useEffect(() => {
    if (!id) return
    axios.get(`${API}/projects/${id}`).then(res => {
      const p = res.data
      setTitle(p.title || '')
      setTitleEn(p.title_en || '')
      setDescription(p.description || '')
      setDescriptionEn(p.description_en || '')
      setLocation(p.location || '')
      setStatus(p.status?.value || p.status || 'in_progress')
      setIsPublic(p.is_public || 'false')
    })
  }, [id])

  const handleSubmit = async () => {
    if (!title) return
    await axios.put(`${API}/projects/${id}`, {
      title, title_en: titleEn,
      description, description_en: descriptionEn,
      location, status, is_public: isPublic
    })
    navigate(`/projects/${id}`)
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Heading level={2} className="mb-2">
        {t('project.editProject')}
      </Heading>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <input
            className="border rounded px-3 py-2"
            placeholder="프로젝트명 *"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <textarea
            className="border rounded px-3 py-2 col-span-2"
            placeholder="설명"
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="촬영 장소"
            value={location}
            onChange={e => setLocation(e.target.value)}
          />
          <select
            className="border rounded px-3 py-2"
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            <option value="in_progress">진행 중</option>
            <option value="completed">완성</option>
            <option value="published">발표됨</option>
            <option value="archived">보관</option>
          </select>
          <select
            className="border rounded px-3 py-2 col-span-2"
            value={isPublic}
            onChange={e => setIsPublic(e.target.value)}
          >
            <option value="false">비공개</option>
            <option value="true">공개 (포트폴리오 노출)</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            className="bg-black text-white px-6 py-2 text-sm hover:bg-gray-800"
          >
            저장
          </button>
          <button
            onClick={() => navigate(`/projects/${id}`)}
            className="border px-6 py-2 text-sm hover:bg-gray-50"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  )
}