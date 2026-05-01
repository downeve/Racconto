import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import Heading from '../components/Heading' //

const API = import.meta.env.VITE_API_URL

export default function ProjectEdit() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [numericId, setNumericId] = useState<string | null>(null)

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
      setNumericId(String(p.id))  // numericId 세팅
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
    if (!title || !numericId) return

    try {
      await axios.put(`${API}/projects/${numericId}`, { // 👈 id 대신 numericId 사용
        title, title_en: titleEn,
        description, description_en: descriptionEn,
        location,
        status,
        is_public: isPublic
      })
      // 저장이 끝나면 다시 프로젝트 상세 페이지로 이동 (상세페이지는 slug 사용 가능)
      navigate(`/projects/${id}`) 
    } catch (error) {
      console.error('Update failed:', error)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Heading level={2} className="mb-4 font-serif font-semibold">
        {t('project.editProject')}
      </Heading>

      <div className="bg-card rounded-card shadow p-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <input
            className="border rounded-card px-3 py-2"
            placeholder={t('project.projectName')}
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <textarea
            className="border rounded-card px-3 py-2 col-span-2"
            placeholder={t('project.description')}
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
          <input
            className="border rounded-card px-3 py-2"
            placeholder={t('project.location')}
            value={location}
            onChange={e => setLocation(e.target.value)}
          />
          <select
            className="border rounded-card px-3 py-2"
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            <option value="in_progress">{t('project.statusInProgress')}</option>
            <option value="completed">{t('project.statusCompleted')}</option>
            <option value="published">{t('project.statusPublished')}</option>
            <option value="archived">{t('project.statusArchived')}</option>
          </select>
          <select
            className="border rounded-card px-3 py-2 col-span-2"
            value={isPublic}
            onChange={e => setIsPublic(e.target.value)}
          >
            <option value="false">{t('project.privateProject')}</option>
            <option value="true">{t('project.publicProject')}</option>
          </select>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={handleSubmit}
            className="text-body btn-primary tracking-wider transition-[background,color,border] duration-150 ease-out"
          >
            {t('common.save')}
          </button>
          <button
            onClick={() => navigate(`/projects/${id}`)}
            className="text-body btn-secondary-on-card"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}