import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { useElectronSidebar } from '../../context/ElectronSidebarContext'
import { useAuth } from '../../context/AuthContext'
import { Camera, BookOpen, FileText, LayoutDashboard, Aperture, Settings, ChevronDown, ChevronRight } from 'lucide-react'

const API = import.meta.env.VITE_API_URL

interface Project {
  id: string
  slug: string | null
  title: string
  cover_image_url: string | null
}

interface Props {
  activeTab: 'photos' | 'story' | 'notes'
  onTabChange: (tab: 'photos' | 'story' | 'notes') => void
  showTabs: boolean
  width: number
}

export default function TabletSidebar({ activeTab, onTabChange, showTabs, width }: Props) {
  const [projects, setProjects] = useState<Project[]>([])
  const [showProjects, setShowProjects] = useState(
    () => localStorage.getItem('sidebar_projects_open') !== 'false'
  )
  const navigate = useNavigate()
  const location = useLocation()
  const { t, i18n } = useTranslation()
  const { sidebarContent, refreshTrigger } = useElectronSidebar()
  const { user, logout } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [dropdownOpen])

  useEffect(() => {
    axios.get(`${API}/projects/`).then(r => setProjects(r.data)).catch(() => {})
  }, [refreshTrigger])

  const toggleLanguage = () => {
    const next = i18n.language.startsWith('ko') ? 'en' : 'ko'
    i18n.changeLanguage(next)
    localStorage.setItem('app_language', next)
  }

  const avatarInitial = user?.email?.[0]?.toUpperCase() ?? '?'
  const isOnProjectDetail = !!location.pathname.match(/^\/projects\/[^/]+$/)

  return (
    <div
      className="shrink-0 fixed left-0 top-0 bottom-0 bg-card border-r border-hair flex flex-col z-40 overflow-hidden"
      style={{ width }}
    >
      <div
        className="shrink-0 px-2 pt-3 pb-2 cursor-pointer"
        onClick={() => navigate('/dashboard')}
        style={{ paddingTop: `calc(env(safe-area-inset-top) + 0.75rem)` }}
      >
        <span className="font-serif font-bold text-h3 text-ink-2 px-2" style={{ fontWeight: 700, letterSpacing: '0.08em' }}>
          Racconto
        </span>
      </div>

      <div className="mx-3 border-t border-faint/30 shrink-0" />

      <div className="shrink-0 px-2 pt-3 pb-2">
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => navigate('/projects')}
            className={`flex-1 text-left px-2 py-1.5 rounded-btn flex items-center gap-2 text-small min-h-[44px] transition-colors ${
              location.pathname === '/projects'
                ? 'bg-stone-300/70 text-ink font-bold'
                : 'text-muted'
            }`}
          >
            <LayoutDashboard size={14} strokeWidth={1.5} />
            <span>{t('nav.projects') || 'Projects'}</span>
          </button>
          <button
            onClick={() => setShowProjects(v => {
              localStorage.setItem('sidebar_projects_open', String(!v))
              return !v
            })}
            className="px-1 min-h-[44px] text-stone-400 shrink-0"
          >
            {showProjects ? <ChevronDown size={13} strokeWidth={1.5} /> : <ChevronRight size={13} strokeWidth={1.5} />}
          </button>
        </div>
        {showProjects && (
          <div className="mt-0.5 mb-1">
            {projects.map(project => (
              <button
                key={project.id}
                onClick={() => navigate(`/projects/${project.slug ?? project.id}`)}
                className="w-full text-left pl-6 pr-2 py-1 min-h-[44px] rounded-btn flex items-center gap-2 text-small text-muted"
              >
                {project.cover_image_url ? (
                  <img src={project.cover_image_url} className="w-4 h-4 rounded object-cover shrink-0" />
                ) : (
                  <span className="w-4 h-4 rounded bg-stone-300 shrink-0" />
                )}
                <span className="truncate">{project.title}</span>
              </button>
            ))}
          </div>
        )}

        {[
          {
            label: t('nav.portfolio') || 'Portfolio', Icon: Aperture,
            active: user?.username ? location.pathname === `/${user.username}` : false,
            onClick: () => user?.username ? navigate(`/${user.username}`, { state: { resetToList: true } }) : navigate('/@setup'),
          },
          {
            label: t('nav.settings') || 'Settings', Icon: Settings,
            active: location.pathname === '/settings',
            onClick: () => navigate('/settings'),
          },
        ].map(item => (
          <button
            key={item.label}
            onClick={item.onClick}
            className={`w-full text-left px-2 py-1.5 min-h-[44px] rounded-btn flex items-center gap-2 text-small transition-colors opacity-100 ${
              item.active ? 'bg-stone-300/70 text-ink font-bold' : 'text-muted'
            }`}
          >
            <item.Icon size={14} strokeWidth={1.5} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <div className="mx-3 border-t border-faint/30 shrink-0" />

      {showTabs && isOnProjectDetail && (
        <div className="shrink-0 flex px-1 gap-1 py-1">
          {([
            { key: 'photos' as const, Icon: Camera, label: t('photo.title') },
            { key: 'story' as const, Icon: BookOpen, label: t('story.title') },
            { key: 'notes' as const, Icon: FileText, label: t('note.title') },
          ]).map(item => (
            <button
              key={item.key}
              onClick={() => onTabChange(item.key)}
              className={`rounded-btn flex-1 flex flex-row items-center justify-center gap-1.5 min-h-[44px] text-menu tracking-wider transition-colors ${
                activeTab === item.key ? 'bg-stone-900 text-white' : 'text-stone-600'
              }`}
            >
              <item.Icon size={14} strokeWidth={1.5} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {sidebarContent && isOnProjectDetail && (
        <div className="border-t border-faint/30 overflow-y-scroll flex-1 [&::-webkit-scrollbar]:w-0">
          {sidebarContent}
        </div>
      )}

      <div ref={dropdownRef} className="shrink-0 mt-auto border-t border-faint/30 relative" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <button
          onClick={() => setDropdownOpen(v => !v)}
          className="w-full flex items-center gap-2 px-3 py-2.5 min-h-[44px] bg-card"
        >
          <span className="w-6 h-6 rounded-full bg-ink-2 text-canvas text-[10px] font-bold flex items-center justify-center shrink-0">
            {avatarInitial}
          </span>
          <span className="text-small text-muted truncate">{user?.email}</span>
        </button>
        {dropdownOpen && (
          <div className="absolute bottom-full left-2 right-2 bg-card rounded-card shadow border border-hair py-1 z-50 mb-1">
            <Link
              to="/trash"
              onClick={() => setDropdownOpen(false)}
              className="w-full text-left px-3 py-2 min-h-[44px] text-small text-ink-2 flex items-center gap-2"
            >
              {t('nav.trash')}
            </Link>
            <div className="border-t border-hair my-1" />
            <button
              onClick={() => { toggleLanguage(); setDropdownOpen(false) }}
              className="w-full text-left px-3 py-2 min-h-[44px] text-small text-muted"
            >
              {i18n.language === 'ko' ? 'English' : '한국어'}
            </button>
            <button
              onClick={() => { setDropdownOpen(false); logout() }}
              className="w-full text-left px-3 py-2 min-h-[44px] text-small text-red-400"
            >
              {t('auth.logout')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
