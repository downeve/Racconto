import { useEffect, useRef, useState, useCallback, memo } from 'react'
import axios from 'axios'
import ProjectCard from '../components/ProjectCard'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ConfirmModal from '../components/ConfirmModal'
import ToastNotification from '../components/ToastNotification'
import { useElectronSidebar } from '../context/ElectronSidebarContext'
// import {
//   DndContext, closestCenter, PointerSensor, useSensor, useSensors,
//   type DragEndEvent,
// } from '@dnd-kit/core'
// import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
// import { CSS } from '@dnd-kit/utilities'

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

// 🔥 최적화: React.memo로 감싸서 불필요한 리렌더링 방지
// const SortableProjectCard = memo(function SortableProjectCard({
//   project,
//   onDelete,
//   t,
// }: {
//   project: Project
//   onDelete: (id: string) => void
//   t: (key: string) => string
// }) {
//   const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: project.id })
//   const style = {
//     transform: CSS.Transform.toString(transform),
//     transition,
//     opacity: isDragging ? 0.4 : 1,
//   }
//   return (
//     <div ref={setNodeRef} style={style} className="relative group">
//       {/* 드래그 핸들 */}
//       <div
//         {...attributes}
//         {...listeners}
//         className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing bg-white/80 rounded p-0.5 text-stone-400 hover:text-stone-700 select-none"
//         title="드래그하여 순서 변경"
//       >
//         <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
//           <circle cx="4" cy="3" r="1.2"/><circle cx="10" cy="3" r="1.2"/>
//           <circle cx="4" cy="7" r="1.2"/><circle cx="10" cy="7" r="1.2"/>
//           <circle cx="4" cy="11" r="1.2"/><circle cx="10" cy="11" r="1.2"/>
//         </svg>
//       </div>
//       <ProjectCard project={project} />
//       <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
//         <Link to={`/projects/${project.slug || project.id}/edit`} className="bg-card text-ink px-2 py-1 text-xs rounded shadow hover:bg-muted hover:text-hair" onClick={e => e.stopPropagation()}>{t('common.edit')}</Link>
//         <button onClick={e => { e.preventDefault(); onDelete(project.id) }} className="bg-red-400 text-card px-2 py-1 text-xs rounded shadow hover:bg-red-600">{t('common.delete')}</button>
//       </div>
//     </div>
//   )
// })

const ProjectCardItem = memo(function ProjectCardItem({
  project,
  onDelete,
  t,
}: {
  project: Project
  onDelete: (id: string) => void
  t: (key: string) => string
}) {
  return (
    <div className="relative group">
      <ProjectCard project={project} />
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <Link
          to={`/projects/${project.slug || project.id}/edit`}
          className="bg-card text-ink px-2 py-1 text-xs rounded shadow hover:bg-muted hover:text-hair"
          onClick={e => e.stopPropagation()}
        >
          {t('common.edit')}
        </Link>
        <button
          onClick={e => { e.preventDefault(); onDelete(project.id) }}
          className="bg-red-400 text-card px-2 py-1 text-xs rounded shadow hover:bg-red-600"
        >
          {t('common.delete')}
        </button>
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
  const [title, setTitle] = useState('')
  const [titleEn, setTitleEn] = useState('')
  const [description, setDescription] = useState('')
  const [descriptionEn, setDescriptionEn] = useState('')
  const [location, setLocation] = useState('')
  const [status, setStatus] = useState('in_progress')
  const [isPublic, setIsPublic] = useState('false')
  const { triggerRefresh } = useElectronSidebar()
  const { t } = useTranslation()
  // const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  // const handleDragEnd = async (event: DragEndEvent) => {
  //   const { active, over } = event
  //   if (!over || active.id === over.id) return
  //   const oldIndex = projects.findIndex(p => p.id === active.id)
  //   const newIndex = projects.findIndex(p => p.id === over.id)
  //   const reordered = arrayMove(projects, oldIndex, newIndex)
  //   setProjects(reordered)
  //   await axios.patch(`${API}/projects/reorder`, { ids: reordered.map(p => p.id) })
  //   triggerRefresh()
  // }

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
    const sorted = [...res.data].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )
    setProjects(sorted)
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

  const isElectron = !!window.racconto

  return (
    <div className={`${isElectron ? 'w-full' : 'max-w-7xl mx-auto'} p-6`}>
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
          <h2 className="font-body font-serif font-medium text-h2">
            {t('nav.projectsList')}
          </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="font-body btn-primary tracking-wider transition-[background,color,border] duration-150 ease-out"
        >
          {t('project.newProject')}
        </button>
      </div>

      {showForm && (
        <div className="max-w-3xl bg-card rounded-card shadow p-6 mb-8">
          <h3 className="text-h3 font-serif font-semibold mb-4">{t('project.createProject')}</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <input className="text-body text-ink-2 border rounded-card px-3 py-2" placeholder={t('project.projectName')} value={title} onChange={e => setTitle(e.target.value)} />
            <textarea className="text-body text-ink-2 border rounded-card px-3 py-2 col-span-2" placeholder={t('project.description')} rows={2} value={description} onChange={e => setDescription(e.target.value)} />
            <input className="text-body text-ink-2 border rounded-card px-3 py-2" placeholder={t('project.location')} value={location} onChange={e => setLocation(e.target.value)} />
            <select className="text-body text-ink-2 border rounded-card px-3 py-2" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="in_progress">{t('project.statusInProgress')}</option>
              <option value="completed">{t('project.statusCompleted')}</option>
              <option value="published">{t('project.statusPublished')}</option>
              <option value="archived">{t('project.statusArchived')}</option>
            </select>
            <select className="text-body text-ink-2 border rounded-card px-3 py-2" value={isPublic} onChange={e => setIsPublic(e.target.value)}>
              <option value="false">{t('project.privateProject')}</option>
              <option value="true">{t('project.publicProject')}</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={handleSubmit} className="text-body btn-primary tracking-wider transition-[background,color,border] duration-150 ease-out">{t('common.save')}</button>
            <button onClick={() => {
              setShowForm(false)
              setTitle(''); setTitleEn(''); setDescription('')
              setDescriptionEn(''); setLocation('')
              setStatus('in_progress'); setIsPublic('false')
            }} className="text-body btn-secondary-on-card">{t('common.cancel')}</button>
          </div>
        </div>
      )}

      {/* <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={projects.map(p => p.id)} strategy={rectSortingStrategy}> */}
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {projects.map(project => (
              <ProjectCardItem
                key={project.id}
                project={project}
                onDelete={handleDelete}
                t={t}
              />
            ))}
          </div>
        {/* </SortableContext>
      </DndContext> */}

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