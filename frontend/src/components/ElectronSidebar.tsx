import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { useElectronSidebar } from '../context/ElectronSidebarContext'

const API = import.meta.env.VITE_API_URL

interface Project {
  id: string
  title: string
  cover_image_url: string | null
}

interface Props {
  activeTab: 'photos' | 'story' | 'notes'
  onTabChange: (tab: 'photos' | 'story' | 'notes') => void
  showTabs: boolean  // ProjectDetail 안에서만 탭 표시
}

export default function ElectronSidebar({ activeTab, onTabChange, showTabs }: Props) {
  const [projects, setProjects] = useState<Project[]>([])
  const [showProjects, setShowProjects] = useState(true)
  const navigate = useNavigate()
  const { id: currentId } = useParams()
  const location = useLocation()
  const { t } = useTranslation()
  const { sidebarContent, refreshTrigger } = useElectronSidebar() //

  useEffect(() => {
    const token = localStorage.getItem('token')
    axios.get(`${API}/projects/`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setProjects(res.data))
  }, [refreshTrigger])

  const isOnProjectDetail = location.pathname.startsWith('/projects/') &&
    !location.pathname.endsWith('/edit')

  return (
    <div className="w-56 shrink-0 fixed left-0 top-14 bottom-0 bg-[#EFECE8] border-r border-stone-200 flex flex-col z-40 overflow-hidden">

      {/* 프로젝트 목록 섹션 */}
      <div className="flex flex-col min-h-0">
        <div className="flex items-center justify-between px-4 text-xs font-semibold text-stone-500 tracking-widest uppercase hover:text-stone-800 shrink-0"
        >
          <span>{t('nav.projectsList')}</span>
        <button
          onClick={() => {
            navigate('/projects')
            setShowProjects(v => !v)
          }}
          className="flex items-center justify-between px-1 py-1 text-lg font-bold text-stone-500 tracking-widest uppercase hover:text-stone-800 shrink-0"
        >
          <span className="text-stone-400">{showProjects ? '▾' : '▸'}</span>
        </button>
        </div>

        {showProjects && (
          <div className="overflow-y-auto flex-1">
            {projects.map(project => (
              <button
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className={`w-full text-left px-4 py-2 text-xs flex items-center gap-2 transition-colors ${
                  currentId === project.id
                    ? 'bg-stone-200 text-stone-900 font-medium'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                }`}
              >
                {project.cover_image_url ? (
                  <img src={project.cover_image_url} className="w-6 h-6 rounded object-cover shrink-0" />
                ) : (
                  <span className="w-6 h-6 rounded bg-stone-300 shrink-0" />
                )}
                <span className="truncate">{project.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 탭 전환 섹션 — 가로 한 줄 */}
      {showTabs && isOnProjectDetail && (
        <div className="border-t border-stone-200 shrink-0 flex px-1 gap-1 py-1">
          {([
            { key: 'photos', icon: '📷', label: t('photo.title') },
            { key: 'story',  icon: '📖', label: t('story.title') },
            { key: 'notes',  icon: '📝', label: t('note.title') },
          ] as const).map(item => (
            <button
              key={item.key}
              onClick={() => onTabChange(item.key)}
              className={`flex-1 flex flex-row items-center justify-center gap-1.5 py-2 text-xs tracking-wider transition-colors ${
                activeTab === item.key
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* 현재 탭 사이드바 내용 */}
      {sidebarContent && isOnProjectDetail && (
        <div className="border-t border-stone-200 overflow-y-scroll flex-1 [&::-webkit-scrollbar]:w-0">
          {sidebarContent}
        </div>
      )}
    </div>
  )
}