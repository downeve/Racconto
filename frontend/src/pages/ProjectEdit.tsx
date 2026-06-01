import { useEffect, useRef, useState, forwardRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { imeSafeClick } from '../utils/imeSafeClick'
import { useElectronSidebar } from '../context/ElectronSidebarContext'
import TagInput from '../components/TagInput'
import { CAMERA_TYPES, SUGGESTED_GENRE_TAGS, type CameraType } from '../constants/tags'

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

// IME race 방지용 ref 전달을 위해 forwardRef
const FormInput = forwardRef<HTMLInputElement, {
  value: string; onChange: (v: string) => void; placeholder?: string
}>(function FormInput({ value, onChange, placeholder }, ref) {
  return (
    <input
      ref={ref}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full font-serif text-body bg-transparent border-0 border-b border-edit-line focus:border-edit-ink focus:outline-none py-2 transition-colors duration-150 placeholder:text-edit-faint"
    />
  )
})

const FormTextarea = forwardRef<HTMLTextAreaElement, {
  value: string; onChange: (v: string) => void; rows?: number; placeholder?: string
}>(function FormTextarea({ value, onChange, rows, placeholder }, ref) {
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={rows ?? 4}
      placeholder={placeholder}
      className="w-full font-serif text-body bg-transparent border-0 border-b border-edit-line focus:border-edit-ink focus:outline-none py-2 resize-none transition-colors duration-150 placeholder:text-edit-faint"
    />
  )
})

function SegmentedControl({ value, onChange, options }: {
  value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  const { i18n } = useTranslation()
  const isEn = i18n.language.startsWith('en')
  // en + 버튼 4개: 2×2 그리드, 그 외: 1행 flex
  const wrapClass = isEn && options.length === 4
    ? 'grid grid-cols-2'
    : 'flex'
  return (
    <div className={`${wrapClass} w-full border border-edit-line rounded-[1px] p-0.5 gap-0.5`}>
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 t-caption px-2 py-1.5 rounded-[1px] text-center transition-colors duration-150 ${
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
  // 커뮤니티 태그 시스템 (Phase 1)
  const [cameraType, setCameraType] = useState<CameraType | ''>('')
  const [tags, setTags] = useState<string[]>([])
  const [showInExplore, setShowInExplore] = useState(false)
  // DOM 직접 읽기용 refs — IME race 방지 (사용자 입력 필드만)
  const titleRef = useRef<HTMLInputElement>(null)
  const descRef = useRef<HTMLTextAreaElement>(null)
  const locationRef = useRef<HTMLInputElement>(null)

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
    setCameraType((p.camera_type as CameraType) || '')
    setTags(Array.isArray(p.tags) ? p.tags : [])
    setShowInExplore(Boolean(p.show_in_explore))
  }, [projectData])

  // ── 프로젝트 수정 ─────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: () => {
      // textarea/input DOM 우선 읽기 (IME race 방지) — React state 가 아직 commit 안 됐어도 최신 값
      const titleVal = titleRef.current?.value ?? title
      const descVal = descRef.current?.value ?? description
      const locationVal = locationRef.current?.value ?? location
      return axios.put(`${API}/projects/${numericId}`, {
        title: titleVal, title_en: titleEn,
        description: descVal, description_en: descriptionEn,
        location: locationVal, status, is_public: isPublic,
        camera_type: cameraType || null,
        tags,
        // 비공개면 둘러보기 노출도 강제 false (백엔드 검증과 일치)
        show_in_explore: isPublic === 'true' ? showInExplore : false,
      })
    },
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
    const titleVal = (titleRef.current?.value ?? title).trim()
    if (!titleVal || !numericId) return
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
        <div className="mb-10">
          <h1 className="font-serif text-h2 font-normal tracking-tight">
            {t('project.editProject')}
          </h1>
        </div>

        <div>
          <FormField label={t('project.labelTitle')} required>
            <FormInput ref={titleRef} value={title} onChange={setTitle} placeholder={t('project.projectName')} />
          </FormField>
          <FormField label={t('project.labelDescription')}>
            <FormTextarea ref={descRef} rows={4} value={description} onChange={setDescription} placeholder={t('project.description')} />
          </FormField>
          <FormField label={t('project.labelLocation')}>
            <FormInput ref={locationRef} value={location} onChange={setLocation} placeholder={t('project.location')} />
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

          {/* 커뮤니티 태그 시스템 — Phase 1. 노출 동의가 가장 먼저, 그 다음 카메라/태그 */}
          {/* 진한 구분선 — 개인 포트폴리오/상태 영역과 둘러보기 공개 영역 시각 분리 */}
          {(() => {
            // 비공개 포트폴리오는 둘러보기에 노출될 수 없음 (백엔드도 동일 검증) — 토글 비활성화
            const exploreDisabled = isPublic !== 'true'
            return (
              <div className="pt-6 mt-2 border-t border-edit-line-strong">
                <label className={`flex items-start gap-3 ${exploreDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    checked={showInExplore && !exploreDisabled}
                    onChange={e => setShowInExplore(e.target.checked)}
                    disabled={exploreDisabled}
                    className="mt-1 shrink-0 accent-edit-ink disabled:opacity-40"
                  />
                  <div className={exploreDisabled ? 'opacity-50' : ''}>
                    <div className="text-[0.9375rem] text-edit-ink font-medium">
                      {t('project.showInExplore', 'Show in Explore feed')}
                    </div>
                    <p className="t-caption text-edit-muted mt-1 leading-[1.5]">
                      {exploreDisabled
                        ? t('project.showInExploreRequiresPublic', '포트폴리오를 공개로 설정해야 둘러보기에 노출할 수 있습니다.')
                        : t('project.showInExploreDesc', 'Make this portfolio discoverable in the public Explore feed at racconto.app/explore. Other photographers and visitors can find your work through browsing and search. You can turn this off anytime.')}
                    </p>
                  </div>
                </label>
              </div>
            )
          })()}

          <div className="py-5 border-t border-edit-line">
            <p className="t-eyebrow text-edit-muted mb-2">{t('project.cameraType', 'Camera Type')}</p>
            <div className="flex flex-wrap gap-1.5">
              {CAMERA_TYPES.map(ct => {
                const active = cameraType === ct.value
                return (
                  <button
                    key={ct.value}
                    type="button"
                    onClick={() => setCameraType(active ? '' : ct.value)}
                    className={`px-3 py-1.5 t-caption rounded-btn border transition-colors ${
                      active
                        ? 'bg-edit-ink text-edit-paper border-edit-ink'
                        : 'border-edit-line text-edit-muted hover:text-edit-ink hover:border-edit-line-strong'
                    }`}
                  >
                    {ct.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="py-5 border-t border-edit-line">
            <p className="t-eyebrow text-edit-muted mb-2">{t('project.genreTags', 'Genre Tags (max 5)')}</p>
            <TagInput
              value={tags}
              onChange={setTags}
              suggestions={SUGGESTED_GENRE_TAGS}
              placeholder={t('project.genreTagsPlaceholder', 'wedding, travel, street...')}
            />
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
            {...imeSafeClick(handleSubmit)}
            className="t-caption px-5 py-2 bg-edit-ink text-edit-paper rounded-[1px] hover:bg-edit-ink/85 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
