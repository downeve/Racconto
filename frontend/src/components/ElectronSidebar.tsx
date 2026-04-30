import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { useElectronSidebar } from '../context/ElectronSidebarContext'
import { useAuth } from '../context/AuthContext'
import { Camera, BookOpen, FileText, LayoutDashboard, Globe, Settings } from 'lucide-react'

const API = import.meta.env.VITE_API_URL

interface Project {
  id: string
  title: string
  cover_image_url: string | null
}

interface Props {
  activeTab: 'photos' | 'story' | 'notes'
  onTabChange: (tab: 'photos' | 'story' | 'notes') => void
  showTabs: boolean
}

export default function ElectronSidebar({ activeTab, onTabChange, showTabs }: Props) {
  const [projects, setProjects] = useState<Project[]>([])
  const [showProjects, setShowProjects] = useState(true)
  const navigate = useNavigate()
  const { id: currentId } = useParams()
  const location = useLocation()
  const { t, i18n } = useTranslation()
  const { sidebarContent, refreshTrigger } = useElectronSidebar()
  const { user, logout } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'ko' ? 'en' : 'ko'
    i18n.changeLanguage(nextLang)
    localStorage.setItem('app_language', nextLang)
  }

  const avatarInitial = user?.email ? user.email[0].toUpperCase() : '?'

  useEffect(() => {
    const token = localStorage.getItem('token')
    axios.get(`${API}/projects/`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setProjects(res.data))
  }, [refreshTrigger])

  const isOnProjectDetail = location.pathname.startsWith('/projects/') &&
    !location.pathname.endsWith('/edit')

  const navItems = [
    {
      label: t('nav.dashboard') || 'Dashboard',
      Icon: LayoutDashboard,
      path: '/dashboard',
      active: location.pathname === '/dashboard',
      onClick: () => navigate('/dashboard'),
    },
    {
      label: t('nav.portfolio') || 'Portfolio',
      Icon: Globe,
      path: '/p',
      active: user?.username ? location.pathname === `/${user.username}` : false,
      onClick: () => {
        if (user?.username) {
          navigate(`/${user.username}`, { state: { resetToList: true } })
        } else {
          navigate('/@setup')
        }
      },
    },
    {
      label: t('nav.settings') || 'Settings',
      Icon: Settings,
      path: '/settings',
      active: location.pathname === '/settings',
      onClick: () => navigate('/settings'),
    },
  ]

  return (
    <div className="w-56 shrink-0 fixed left-0 top-0 bottom-0 bg-canvas border-r border-hair flex flex-col z-40 overflow-hidden">

      {/* Racconto 로고 */}
      <div className="shrink-0 px-2 pt-3 pb-2">
        <span className="font-serif font-bold text-h3 text-ink-2 px-2">Racconto</span>
      </div>

      <div className="mx-3 border-t border-faint/30 shrink-0" />

      {/* 앱 네비게이션 */}
      <div className="shrink-0 px-2 pt-3 pb-2">
        {navItems.map(item => (
          <button
            key={item.path}
            onClick={item.onClick}
            className={`w-full text-left px-2 py-1.5 rounded-btn flex items-center gap-2 text-small transition-[background,color,border] duration-150 ease-out ${
              item.active
                ? 'bg-stone-300/70 text-ink font-bold'
                : 'text-muted hover:bg-stone-200 hover:text-ink hover:font-bold'
            }`}
          >
            <item.Icon size={14} strokeWidth={1.5} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <div className="mx-3 border-t border-faint/30 shrink-0" />

      {/* 프로젝트 목록 */}
      <div className="flex flex-col min-h-0 pt-0">
        <div className="flex items-center justify-between px-2 shrink-0">
          <button
            onClick={() => navigate('/projects')}
            className="px-1 py-1 text-small font-bold text-muted tracking-widest uppercase hover:text-ink-2"
          >
            {t('nav.projectsList')}
          </button>
          <button
            onClick={() => setShowProjects(v => !v)}
            className="px-1 py-1 text-stone-400 hover:text-stone-700"
          >
            <span className="text-[16px]">{showProjects ? '▾' : '▸'}</span>
          </button>
        </div>

        {showProjects && (
          <div className="overflow-y-auto flex-1">
            {projects.map(project => (
              <button
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className={`w-full text-left px-4 py-2 text-small flex items-center gap-2 transition-[background,color,border] duration-150 ease-out ${
                  currentId === project.id
                    ? 'bg-hair text-stone-900 font-bold'
                    : 'text-muted font-medium hover:bg-hair hover:text-ink-2'
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

      {/* 탭 전환 — ProjectDetail에서만 */}
      {showTabs && isOnProjectDetail && (
        <div className="border-t border-faint/30 shrink-0 flex px-1 gap-1 py-1">
          {([
            { key: 'photos' as const, Icon: Camera, label: t('photo.title') },
            { key: 'story'  as const, Icon: BookOpen, label: t('story.title') },
            { key: 'notes'  as const, Icon: FileText, label: t('note.title') },
          ]).map(item => (
            <button
              key={item.key}
              onClick={() => onTabChange(item.key)}
              className={`rounded-btn flex-1 flex flex-row items-center justify-center gap-1.5 py-2 text-menu tracking-wider transition-[background,color,border] duration-150 ease-out ${
                activeTab === item.key
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              <item.Icon size={14} strokeWidth={1.5} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* 탭별 사이드바 내용 */}
      {sidebarContent && isOnProjectDetail && (
        <div className="border-t border-faint/30 overflow-y-scroll flex-1 [&::-webkit-scrollbar]:w-0">
          {sidebarContent}
        </div>
      )}

      {/* 사용자 */}
      <div ref={dropdownRef} className="shrink-0 mt-auto border-t border-faint/30 relative">
        <button
          onClick={() => setDropdownOpen(v => !v)}
          className="w-full flex items-center gap-2 px-3 py-2.5 bg-card hover:bg-stone-100 transition-[background,color,border] duration-150 ease-out"
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
              className="w-full text-left px-3 py-2 text-small text-ink-2 hover:bg-hair/30 flex items-center gap-2"
            >
              {t('nav.trash')}
            </Link>
            <div className="border-t border-hair my-1" />
            <button
              onClick={() => { toggleLanguage(); setDropdownOpen(false) }}
              className="w-full text-left px-3 py-2 text-small text-muted hover:bg-hair/30"
            >
              {i18n.language === 'ko' ? 'English' : '한국어'}
            </button>
            <button
              onClick={() => { setDropdownOpen(false); logout() }}
              className="w-full text-left px-3 py-2 text-small text-red-400 hover:bg-red-50"
            >
              {t('auth.logout')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
