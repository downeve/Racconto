import { useEffect, useRef, useState, useCallback, memo } from 'react'
import axios from 'axios'
import ProjectCard from '../components/ProjectCard'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ConfirmModal from '../components/ConfirmModal'
import ToastNotification from '../components/ToastNotification'
import { useElectronSidebar } from '../context/ElectronSidebarContext'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const API = import.meta.env.VITE_API_URL

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
  updated_at: string
}

const SortableProjectCard = memo(function SortableProjectCard({
  project,
  onDelete,
  t,
}: {
  project: Project
  onDelete: (id: string) => void
  t: (key: string) => string
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: project.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }
  return (
    <div ref={setNodeRef} style={style}>
      <div className={`relative group ${!isDragging ? 'transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-1 hover:shadow-deep' : ''}`}>
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing bg-white/80 rounded p-0.5 text-stone-400 hover:text-stone-700 select-none"
          title="드래그하여 순서 변경"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <circle cx="4" cy="3" r="1.2"/><circle cx="10" cy="3" r="1.2"/>
            <circle cx="4" cy="7" r="1.2"/><circle cx="10" cy="7" r="1.2"/>
            <circle cx="4" cy="11" r="1.2"/><circle cx="10" cy="11" r="1.2"/>
          </svg>
        </div>
        <ProjectCard project={project} />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <Link to={`/projects/${project.slug || project.id}/edit`} className="bg-card text-ink px-2 py-1 text-xs rounded shadow hover:bg-muted hover:text-hair" onClick={e => e.stopPropagation()}>{t('common.edit')}</Link>
          <button onClick={e => { e.preventDefault(); onDelete(project.id) }} className="bg-red-400 text-card px-2 py-1 text-xs rounded shadow hover:bg-red-600">{t('common.delete')}</button>
        </div>
      </div>
    </div>
  )
})

export default function Projects() {
  const dashboardOpen = useLocation();
  const [projects, setProjects] = useState<Project[]>([])
  const [showForm, setShowForm] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ message, type })
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }
  const FORM_INITIAL = { title: '', description: '', location: '', status: 'in_progress', isPublic: 'false' }
  const [formData, setFormData] = useState(FORM_INITIAL)
  const setField = (key: keyof typeof FORM_INITIAL, value: string) =>
    setFormData(prev => ({ ...prev, [key]: value }))
  const { triggerRefresh } = useElectronSidebar()
  const { t } = useTranslation()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = projects.findIndex(p => p.id === active.id)
    const newIndex = projects.findIndex(p => p.id === over.id)
    const reordered = arrayMove(projects, oldIndex, newIndex)
    setProjects(reordered)
    await axios.patch(`${API}/projects/reorder`, { ids: reordered.map(p => p.id) })
    triggerRefresh()
  }

  // 🔥 최적화: useCallback 및 상태 직접 조작(prev filter)으로 빠른 UI 갱신
  const handleDelete = useCallback((projectId: string) => {
    setConfirmModal({
      message: t('project.deleteConfirm'),
      onConfirm: async () => {
        setConfirmModal(null)
        try {
          await axios.delete(`${API}/projects/${projectId}`)
          window.racconto?.unlinkByProject(projectId)
          
          setProjects(prev => prev.filter(p => p.id !== projectId))
          triggerRefresh()
        } catch (error) {
          console.error("Delete failed:", error)
        }
      },
    })
  }, [t, triggerRefresh])

  const fetchProjects = async () => {
    const res = await axios.get(`${API}/projects/`)
    setProjects(res.data)
  }

  useEffect(() => {
    if (dashboardOpen.state?.openForm) {
      setShowForm(true);
      // 필요하다면 사용 후 state를 초기화하여 새로고침 시 창이 계속 열려있지 않게 할 수 있습니다.
      window.history.replaceState({}, document.title);
    }
    fetchProjects()
  }, [dashboardOpen.state])

  const handleSubmit = async () => {
    if (!formData.title) return
    try {
      await axios.post(`${API}/projects/`, {
        title: formData.title,
        description: formData.description,
        location: formData.location,
        status: formData.status,
        is_public: formData.isPublic,
      })
      setFormData(FORM_INITIAL)
      setShowForm(false)
      fetchProjects()
      triggerRefresh()
    } catch (err: any) {
      const detail = err.response?.data?.detail
      const code = typeof detail === 'object' ? detail.code : detail
      const limit = typeof detail === 'object' ? detail.limit : undefined

      if (code === 'PROJECT_LIMIT_EXCEEDED') {
        showToast(t('api.error.PROJECT_LIMIT_EXCEEDED', { limit }), 'warning')
      }
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
          dangerous
        />
      )}
      {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="flex items-center justify-between mb-space-sm">
          <h2 className="font-body font-serif font-semibold text-h2">
            {t('nav.projectsList')}
          </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="t-caption btn-primary"
        >
          {t('project.newProject')}
        </button>
      </div>

      {showForm && (
        <div className="max-w-2xl mb-8">
          <div className="bg-edit-paper border border-edit-line rounded-btn px-8 py-8">
            <h3 className="font-serif text-h2 font-normal tracking-tight mb-8">{t('project.createProject')}</h3>

            {/* 제목 */}
            <div className="pb-5">
              <p className="t-eyebrow text-edit-muted mb-2">{t('project.labelTitle')}<span className="text-edit-danger ml-1">*</span></p>
              <input
                value={formData.title} onChange={e => setField('title', e.target.value)}
                placeholder={t('project.projectName')}
                className="w-full font-serif text-body bg-transparent border-0 border-b border-edit-line focus:border-edit-ink focus:outline-none py-2 transition-colors duration-150 placeholder:text-edit-faint"
              />
            </div>

            {/* 설명 */}
            <div className="py-5">
              <p className="t-eyebrow text-edit-muted mb-2">{t('project.labelDescription')}</p>
              <textarea
                value={formData.description} onChange={e => setField('description', e.target.value)}
                placeholder={t('project.description')}
                rows={3}
                className="w-full font-serif text-body bg-transparent border-0 border-b border-edit-line focus:border-edit-ink focus:outline-none py-2 resize-none transition-colors duration-150 placeholder:text-edit-faint"
              />
            </div>

            {/* 장소 */}
            <div className="py-5">
              <p className="t-eyebrow text-edit-muted mb-2">{t('project.labelLocation')}</p>
              <input
                value={formData.location} onChange={e => setField('location', e.target.value)}
                placeholder={t('project.location')}
                className="w-full font-serif text-body bg-transparent border-0 border-b border-edit-line focus:border-edit-ink focus:outline-none py-2 transition-colors duration-150 placeholder:text-edit-faint"
              />
            </div>

            {/* 상태 + 공개 여부 */}
            <div className="py-5 grid grid-cols-2 gap-8">
              <div>
                <p className="t-eyebrow text-edit-muted mb-2">{t('project.labelStatus')}</p>
                <div className="inline-flex border border-edit-line rounded-btn p-0.5 flex-wrap gap-0.5">
                  {[
                    { value: 'in_progress', label: t('project.statusInProgress') },
                    { value: 'completed',   label: t('project.statusCompleted') },
                    { value: 'published',   label: t('project.statusPublished') },
                    { value: 'archived',    label: t('project.statusArchived') },
                  ].map(opt => (
                    <button key={opt.value} type="button" onClick={() => setField('status', opt.value)}
                      className={`t-caption px-3 py-1.5 rounded-btn transition-colors duration-150 ${formData.status === opt.value ? 'bg-edit-ink text-edit-paper' : 'text-edit-muted hover:text-edit-ink'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="t-eyebrow text-edit-muted mb-2">{t('project.labelVisibility')}</p>
                <div className="inline-flex border border-edit-line rounded-btn p-0.5 flex-wrap gap-0.5">
                  {[
                    { value: 'false', label: t('project.privateProject') },
                    { value: 'true',  label: t('project.publicProject') },
                  ].map(opt => (
                    <button key={opt.value} type="button" onClick={() => setField('isPublic', opt.value)}
                      className={`t-caption px-3 py-1.5 rounded-btn transition-colors duration-150 ${formData.isPublic === opt.value ? 'bg-edit-ink text-edit-paper' : 'text-edit-muted hover:text-edit-ink'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => { setShowForm(false); setFormData(FORM_INITIAL) }}
                className="t-caption px-4 py-2 text-edit-muted hover:text-edit-ink transition-colors"
              >{t('common.cancel')}</button>
              <button
                onClick={handleSubmit}
                disabled={!formData.title}
                className="t-caption px-5 py-2 bg-edit-ink text-edit-paper rounded-btn hover:bg-edit-ink/85 transition-colors disabled:opacity-40"
              >{t('common.save')}</button>
            </div>
          </div>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={projects.map(p => p.id)} strategy={rectSortingStrategy}>
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {projects.map(project => (
              <SortableProjectCard
                key={project.id}
                project={project}
                onDelete={handleDelete}
                t={t}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {projects.length === 0 && (
        <div className="text-center py-space-lg">
          <h1 className="text-h3 md:text-h2 font-semibold mb-6 italic text-ink-2 leading-tight break-keep">
          {t('project.noProjects')}
          </h1>
        </div>
      )}
    </div>
  )
}