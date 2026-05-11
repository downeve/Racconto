import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { useElectronSidebar } from '../context/ElectronSidebarContext'
import { useAuth } from '../context/AuthContext'
import { Camera, BookOpen, FileText, LayoutDashboard, Aperture, Settings, ChevronDown, ChevronRight } from 'lucide-react'
import { cfUrl } from '../utils/cfImage'
import { Wordmark } from './Wordmark'
import { applyFontScale, getStoredFontScale, type FontScale } from '../utils/fontScale'

const API = import.meta.env.VITE_API_URL

interface Project {
  id: string
  slug: string | null
  title: string
  cover_image_url: string | null
  updated_at: string
}

const MIN_WIDTH = 160
const MAX_WIDTH = 480

interface Props {
  activeTab: 'photos' | 'story' | 'notes'
  onTabChange: (tab: 'photos' | 'story' | 'notes') => void
  showTabs: boolean
  width: number
  onWidthChange: (width: number) => void
}

export default function ElectronSidebar({ activeTab, onTabChange, showTabs, width, onWidthChange }: Props) {
  const [projects, setProjects] = useState<Project[]>([])
  const [showProjects, setShowProjects] = useState(
    () => localStorage.getItem('sidebar_projects_open') !== 'false'
  )
  const navigate = useNavigate()
  const location = useLocation()
  const { t, i18n } = useTranslation()
  const { refreshTrigger } = useElectronSidebar()
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

  const currentLang = (i18n.language || 'ko').substring(0, 2)
  const [fontScale, setFontScaleState] = useState<FontScale>(getStoredFontScale)

  // 마운트 시 저장된 폰트 스케일을 DOM에 복원
  useEffect(() => { applyFontScale(getStoredFontScale()) }, [])

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang)
    localStorage.setItem('app_language', lang)
  }

  const handleFontScale = (scale: FontScale) => {
    applyFontScale(scale)
    setFontScaleState(scale)
  }

  const languages = [
    { code: 'ko', label: '한국어 (KO)' },
    { code: 'en', label: 'English (EN)' },
    { code: 'ja', label: '日本語 (JA)' },
  ]

  const fontScaleOptions: { scale: FontScale; label: string }[] = [
    { scale: 'sm', label: t('settings.fontSizeSm') },
    { scale: 'md', label: t('settings.fontSizeMd') },
    { scale: 'lg', label: t('settings.fontSizeLg') },
  ]

  const avatarInitial = user?.email ? user.email[0].toUpperCase() : '?'

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = width

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMouseMove = (e: MouseEvent) => {
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + e.clientX - startX))
      onWidthChange(newWidth)
    }

    const onMouseUp = () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  useEffect(() => {
    const token = localStorage.getItem('token')
    axios.get(`${API}/projects/`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setProjects(res.data)
    })
  }, [refreshTrigger])

  const isOnProjectDetail = location.pathname.startsWith('/projects/') &&
    !location.pathname.endsWith('/edit')

  const currentProjectId = (() => {
    const match = location.pathname.match(/^\/projects\/([^/]+)/)
    return match ? match[1] : null
  })()

  // §11.1 navItem 헬퍼 — layout shift 없는 active 표시
  const navItem = (active: boolean) =>
    `relative w-full text-left px-2 py-1 rounded-[1px] flex items-center gap-2 text-[0.8125rem] font-sans font-medium
     transition-[background-color,color] duration-150 ${
      active
        ? 'bg-edit-ink/[0.06] text-edit-ink before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[2px] before:bg-edit-ink'
        : 'text-edit-muted hover:bg-edit-paper hover:text-edit-ink'
    }`

  const otherNavItems = [
    {
      label: t('nav.portfolio') || 'Portfolio',
      Icon: Aperture,
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
    <div
      className="shrink-0 fixed left-0 top-0 bottom-0 bg-edit-paper border-r border-edit-line flex flex-col z-40 overflow-hidden"
      style={{ width }}
    >
      {/* §11.4 드래그 리사이즈 핸들 */}
      <div
        onMouseDown={handleResizeMouseDown}
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize z-50
                   after:absolute after:right-0 after:top-0 after:bottom-0 after:w-px
                   after:bg-edit-ink/0 hover:after:bg-edit-ink/30 active:after:bg-edit-ink/60
                   after:transition-colors"
      />

      {/* §11.5 Racconto 로고 */}
      <div
        className="shrink-0 px-4 pt-3 pb-2 cursor-pointer transition-opacity duration-150 ease-out"
        onClick={() => navigate('/dashboard')}
      >
        <Wordmark size="md" tone="on-paper" asLink={false} />
      </div>

      <div className="mx-3 border-t border-edit-line shrink-0" />

      {/* 앱 네비게이션 */}
      <div className="shrink-0 px-2 pt-3 pb-2">
        {/* Projects 접기/펼치기 */}
        <div className="flex items-center gap-0.5 mb-0.5">
          <button
            onClick={() => navigate('/projects')}
            className={`flex-1 ${navItem(location.pathname === '/projects')}`}
          >
            <LayoutDashboard size={14} strokeWidth={1.5} />
            <span>{t('nav.projects') || 'Projects'}</span>
          </button>
          <button
            onClick={() => setShowProjects(v => {
              localStorage.setItem('sidebar_projects_open', String(!v))
              return !v
            })}
            className="px-1 py-1.5 text-edit-faint hover:text-edit-ink shrink-0 transition-colors duration-150"
          >
            {showProjects
              ? <ChevronDown size={13} strokeWidth={1.5} />
              : <ChevronRight size={13} strokeWidth={1.5} />}
          </button>
        </div>

        {showProjects && (
          <div className="mb-1 space-y-0.5">
            {projects.map(project => (
              <button
                key={project.id}
                onClick={() => navigate(`/projects/${project.slug ?? project.id}`)}
                className={`pl-6 pr-2 ${navItem(currentProjectId === project.id)}`}
              >
                {/* §11.6 프로젝트 cover 썸네일 */}
                {project.cover_image_url ? (
                  <img src={cfUrl(project.cover_image_url, 'thumb')}
                       className="w-4 h-4 rounded-[1px] object-cover shrink-0" />
                ) : (
                  <span className="w-4 h-4 rounded-[1px] bg-edit-paper-2 ring-1 ring-edit-line shrink-0" />
                )}
                <span className="truncate">{project.title}</span>
              </button>
            ))}
          </div>
        )}

        {/* 나머지 nav 항목 */}
        <div className="space-y-0.5">
          {otherNavItems.map(item => (
            <button
              key={item.path}
              onClick={item.onClick}
              className={navItem(item.active)}
            >
              <item.Icon size={14} strokeWidth={1.5} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mx-3 border-t border-edit-line shrink-0" />

      {/* §11.2 탭 전환 — ProjectDetail에서만 */}
      {showTabs && isOnProjectDetail && (
        <div className="shrink-0 flex px-1 gap-1 py-1">
          {([
            { key: 'photos' as const, Icon: Camera,   label: t('photo.title') },
            { key: 'story'  as const, Icon: BookOpen, label: t('story.title') },
            { key: 'notes'  as const, Icon: FileText, label: t('note.title') },
          ]).map(item => (
            <button
              key={item.key}
              onClick={() => onTabChange(item.key)}
              className={`rounded-[1px] flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-[0.8125rem] font-sans font-medium
                          transition-colors duration-150 ${
                activeTab === item.key
                  ? 'bg-edit-ink text-edit-paper'
                  : 'text-edit-muted hover:bg-edit-paper-2 hover:text-edit-ink'
              }`}
            >
              <item.Icon size={14} strokeWidth={1.5} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* 탭별 사이드바 내용 — Portal 슬롯 */}
      {isOnProjectDetail && (
        <div id="sidebar-content-slot" className="border-t border-edit-line overflow-y-scroll flex-1 [&::-webkit-scrollbar]:w-0" />
      )}

      {/* §11.3 사용자 dropdown */}
      <div ref={dropdownRef} className="shrink-0 mt-auto border-t border-edit-line relative">
        <button
          onClick={() => setDropdownOpen(v => !v)}
          className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-edit-paper-2 transition-colors duration-150"
        >
          <span className="w-6 h-6 rounded-full bg-edit-ink text-edit-paper t-caption font-bold flex items-center justify-center shrink-0">
            {avatarInitial}
          </span>
          <span className="text-[0.8125rem] font-sans text-edit-muted truncate">{user?.email}</span>
        </button>
        {dropdownOpen && (
          <div className="absolute bottom-full left-2 right-2 mb-1 z-popover bg-edit-paper rounded-[2px] py-1 border border-edit-line shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
            <Link
              to="/trash"
              onClick={() => setDropdownOpen(false)}
              className="w-full text-left px-3 py-2 text-[0.8125rem] font-sans text-edit-ink hover:bg-edit-paper-2 flex items-center gap-2 transition-colors"
            >
              {t('nav.trash')}
            </Link>
            <div className="border-t border-edit-line my-1" />
            {languages.map(lang => (
              <button
                key={lang.code}
                onClick={() => { changeLanguage(lang.code); setDropdownOpen(false) }}
                className={`w-full text-left px-3 py-2 text-[0.8125rem] font-sans hover:bg-edit-paper-2 transition-colors ${
                  currentLang === lang.code ? 'text-edit-ink' : 'text-edit-muted'
                }`}
              >
                {lang.label}
              </button>
            ))}
            <div className="border-t border-edit-line my-1" />
            {/* §11.7 폰트 사이즈 */}
            <div className="px-3 py-1.5">
              <p className="t-caption text-edit-faint mb-1.5">{t('settings.fontSize')}</p>
              <div className="inline-flex border border-edit-line rounded-[1px] p-0.5 gap-0.5">
                {fontScaleOptions.map(({ scale, label }) => (
                  <button
                    key={scale}
                    onClick={() => handleFontScale(scale)}
                    className={`px-2 py-1 t-caption rounded-[1px] transition-colors duration-150 ${
                      fontScale === scale
                        ? 'bg-edit-ink text-edit-paper'
                        : 'text-edit-muted hover:text-edit-ink'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t border-edit-line my-1" />
            <button
              onClick={() => { setDropdownOpen(false); logout() }}
              className="w-full text-left px-3 py-2 text-[0.8125rem] font-sans text-edit-danger hover:bg-edit-paper-2 transition-colors"
            >
              {t('auth.logout')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
