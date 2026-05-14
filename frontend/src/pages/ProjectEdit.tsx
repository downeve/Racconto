import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { useElectronSidebar } from '../context/ElectronSidebarContext'

const API = import.meta.env.VITE_API_URL

// ── 로컬 폼 컴포넌트 ─────────────────────────────────────

function FormField({ label, required, children }: {
  label: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <div className="py-5 first:pt-0">
      <label className="block t-eyebrow text-edit-muted mb-2">
        {label}{required && <span className="text-edit-danger ml-1">*</span>}
      </label>
      {children}
    </div>
  )
}

function FormInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full font-serif text-body bg-transparent border-0 border-b border-edit-line focus:border-edit-ink focus:outline-none py-2 transition-colors duration-150 placeholder:text-edit-faint"
    />
  )
}

function FormTextarea({ value, onChange, rows, placeholder }: {
  value: string; onChange: (v: string) => void; rows?: number; placeholder?: string
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={rows ?? 4}
      placeholder={placeholder}
      className="w-full font-serif text-body bg-transparent border-0 border-b border-edit-line focus:border-edit-ink focus:outline-none py-2 resize-none transition-colors duration-150 placeholder:text-edit-faint"
    />
  )
}

function SegmentedControl({ value, onChange, options }: {
  value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="inline-flex border border-edit-line rounded-[1px] p-0.5 flex-wrap gap-0.5">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`t-caption px-3 py-1.5 rounded-[1px] transition-colors duration-150 ${
            value === opt.value
              ? 'bg-edit-ink text-edit-paper'
              : 'text-edit-muted hover:text-edit-ink'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────

export default function ProjectEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const routerLocation = useLocation()
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  const backTo = (routerLocation.state as { from?: string } | null)?.from ?? `/projects/${id}`
  const { triggerRefresh } = useElectronSidebar()

  const [numericId, setNumericId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [titleEn, setTitleEn] = useState('')
  const [description, setDescription] = useState('')
  const [descriptionEn, setDescriptionEn] = useState('')
  const [location, setLocation] = useState('')
  const [status, setStatus] = useState('in_progress')
  const [isPublic, setIsPublic] = useState('false')

  // ── 프로젝트 조회 ─────────────────────────────────────────────
  const { data: projectData } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const res = await axios.get(`${API}/projects/${id}`)
      return res.data
    },
    enabled: !!id,
  })

  useEffect(() => {
    if (!projectData) return
    const p = projectData
    setNumericId(String(p.id))
    setTitle(p.title || '')
    setTitleEn(p.title_en || '')
    setDescription(p.description || '')
    setDescriptionEn(p.description_en || '')
    setLocation(p.location || '')
    setStatus(p.status?.value || p.status || 'in_progress')
    setIsPublic(p.is_public || 'false')
  }, [projectData])

  // ── 프로젝트 수정 ─────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: () =>
      axios.put(`${API}/projects/${numericId}`, {
        title, title_en: titleEn,
        description, description_en: descriptionEn,
        location, status, is_public: isPublic,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
      queryClient.invalidateQueries({ queryKey: ['portfolioSlug'] })
      triggerRefresh()
      navigate(backTo)
    },
  })

  const handleSubmit = () => {
    if (!title || !numericId) return
    updateMutation.mutate()
  }

  const STATUS_OPTIONS = [
    { value: 'in_progress', label: t('project.statusInProgress') },
    { value: 'completed',   label: t('project.statusCompleted') },
    { value: 'published',   label: t('project.statusPublished') },
    { value: 'archived',    label: t('project.statusArchived') },
  ]

  const VISIBILITY_OPTIONS = [
    { value: 'false', label: t('project.privateProject') },
    { value: 'true',  label: t('project.publicProject') },
  ]

  return (
    <div className="max-w-2xl mx-auto py-12">
      <div className="bg-edit-paper border border-edit-line rounded-btn px-8 py-10">
        <div className="mb-10 pb-8 border-b border-edit-line">
          <p className="t-eyebrow text-edit-muted mb-2">{t('project.editing')}</p>
          <h1 className="font-serif text-h2 font-normal tracking-tight">
            {t('project.editProject')}
          </h1>
        </div>

        <div>
          <FormField label={t('project.labelTitle')} required>
            <FormInput value={title} onChange={setTitle} placeholder={t('project.projectName')} />
          </FormField>
          <FormField label={t('project.labelDescription')}>
            <FormTextarea rows={4} value={description} onChange={setDescription} placeholder={t('project.description')} />
          </FormField>
          <FormField label={t('project.labelLocation')}>
            <FormInput value={location} onChange={setLocation} placeholder={t('project.location')} />
          </FormField>
          <div className="py-5 grid grid-cols-2 gap-8">
            <div>
              <p className="t-eyebrow text-edit-muted mb-2">{t('project.labelStatus')}</p>
              <SegmentedControl value={status} onChange={setStatus} options={STATUS_OPTIONS} />
            </div>
            <div>
              <p className="t-eyebrow text-edit-muted mb-2">{t('project.labelVisibility')}</p>
              <SegmentedControl value={isPublic} onChange={setIsPublic} options={VISIBILITY_OPTIONS} />
            </div>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-edit-line flex justify-end gap-2">
          <button
            onClick={() => navigate(backTo)}
            className="t-caption px-4 py-2 text-edit-muted hover:text-edit-ink transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title}
            className="t-caption px-5 py-2 bg-edit-ink text-edit-paper rounded-[1px] hover:bg-edit-ink/85 transition-colors disabled:opacity-40"
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
