import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { useElectronSidebar } from '../context/ElectronSidebarContext'
import { useAuth } from '../context/AuthContext'
import { Camera, BookOpen, FileText, LayoutDashboard, Aperture, ChevronDown, ChevronRight, SlidersHorizontal, Trash2, Pencil, Compass } from 'lucide-react'
import { cfUrl } from '../utils/cfImage'
import { Wordmark } from './Wordmark'
import ConfirmModal from './ConfirmModal'
import { applyFontScale, getStoredFontScale, type FontScale } from '../utils/fontScale'
import { useTheme } from '../theme/ThemeProvider'

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

const isMac = typeof window !== 'undefined' && window.racconto?.platform === 'darwin'

export default function ElectronSidebar({ activeTab, onTabChange, showTabs, width, onWidthChange }: Props) {
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null)
  const [showProjects, setShowProjects] = useState(
    () => localStorage.getItem('sidebar_projects_open') !== 'false'
  )
  const navigate = useNavigate()
  const location = useLocation()
  const { t, i18n } = useTranslation()
  const { refreshTrigger, triggerRefresh } = useElectronSidebar()
  const { user, logout } = useAuth()
  const { pref: themePref, setPref: setThemePref } = useTheme()
  const queryClient = useQueryClient()
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

  const handleDeleteProject = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation()
    setConfirmModal({
      message: t('project.deleteConfirm'),
      onConfirm: async () => {
        const token = localStorage.getItem('token')
        await axios.delete(`${API}/projects/${projectId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setConfirmModal(null)
        triggerRefresh()
        queryClient.invalidateQueries({ queryKey: ['projects'] })
        queryClient.invalidateQueries({ queryKey: ['trash'] })
        const deleted = projects.find(p => p.id === projectId)
        const isViewing = currentProjectId === projectId || (deleted?.slug && currentProjectId === deleted.slug)
        if (isViewing) navigate('/projects')
      },
    })
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

  // Projects.tsx 와 동일한 React Query 캐시(`['projects']`)를 공유 — 정렬·옵티미스틱 업데이트 일관성 보장.
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      const res = await axios.get<Project[]>(`${API}/projects/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return res.data
    },
  })

  // 레거시 triggerRefresh 호출자(ProjectDetail/Edit/Trash 등)와 호환 — refreshTrigger 가 바뀌면 캐시 무효화.
  useEffect(() => {
    if (refreshTrigger > 0) queryClient.invalidateQueries({ queryKey: ['projects'] })
  }, [refreshTrigger, queryClient])

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
        : 'text-edit-muted hover:bg-edit-paper-2 hover:text-edit-ink'
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
      label: t('explore.menu', 'Explore'),
      Icon: Compass,
      path: '/explore',
      active: location.pathname === '/explore',
      onClick: () => navigate('/explore'),
    },
  ]

  return (
    <>
    {confirmModal && (
      <ConfirmModal
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(null)}
        dangerous
      />
    )}
    <div
      className={`shrink-0 fixed bg-edit-paper flex flex-col z-40 overflow-hidden
        ${isMac
          ? 'left-1.5 top-1.5 bottom-1.5 border border-edit-line rounded-xl'
          : 'left-0 top-0 bottom-0 border-r border-edit-line'
        }`}
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

      {/* §11.5 macOS drag zone — 신호등 영역 확보 + 윈도우 드래그 */}
      {isMac && (
        <div
          className="shrink-0 h-10 w-full"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        />
      )}

      {/* §11.6 Racconto 로고 */}
      <div
        className={`shrink-0 px-4 pb-2 cursor-pointer transition-opacity duration-150 ease-out ${isMac ? 'pt-0' : 'pt-3'}`}
        onClick={() => navigate('/dashboard')}
        style={isMac ? { WebkitAppRegion: 'no-drag' } as React.CSSProperties : undefined}
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
              <div key={project.id} className="group/proj relative">
                <button
                  onClick={() => navigate(`/projects/${project.slug ?? project.id}`)}
                  className={`pl-6 pr-16 w-full ${navItem(currentProjectId === project.id)}`}
                >
                  {project.cover_image_url ? (
                    <img src={cfUrl(project.cover_image_url, 'thumb')}
                         className="w-4 h-4 rounded-[1px] object-cover shrink-0" />
                  ) : (
                    <span className="w-4 h-4 rounded-[1px] bg-edit-paper-2 ring-1 ring-edit-line shrink-0" />
                  )}
                  <span className="truncate">{project.title}</span>
                </button>
                <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover/proj:flex items-center gap-0.5">
                  <button
                    onClick={e => { e.stopPropagation(); navigate(`/projects/${project.slug ?? project.id}/edit`, { state: { from: `/projects/${project.slug ?? project.id}` } }) }}
                    className="p-1 rounded-[1px] text-edit-faint hover:text-edit-ink hover:bg-edit-paper-2 transition-colors"
                    title={t('common.edit')}
                  >
                    <Pencil size={11} strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={e => handleDeleteProject(e, project.id)}
                    className="p-1 rounded-[1px] text-edit-faint hover:text-edit-danger hover:bg-edit-paper-2 transition-colors"
                    title={t('common.delete')}
                  >
                    <Trash2 size={11} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
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
                  ? 'bg-edit-ink/80 text-edit-paper'
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
          <div className="absolute bottom-full left-2 right-2 mb-1 z-popover bg-edit-paper rounded-btn py-1 border border-edit-line shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
            <Link
              to="/trash"
              onClick={() => setDropdownOpen(false)}
              className="w-full text-left px-3 py-2 text-[0.8125rem] font-sans text-edit-ink hover:bg-edit-paper-2 flex items-center gap-2 transition-colors"
            >
              <Trash2 size={13} strokeWidth={1.5} />
              {t('nav.trash')}
            </Link>
            <Link
              to="/settings"
              onClick={() => setDropdownOpen(false)}
              className="w-full text-left px-3 py-2 text-[0.8125rem] font-sans text-edit-ink hover:bg-edit-paper-2 flex items-center gap-2 transition-colors"
            >
              <SlidersHorizontal size={13} strokeWidth={1.5} />
              {t('nav.settings')}
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
              <div className="inline-flex max-w-full border border-edit-line rounded-[1px] p-0.5 gap-0.5">
                {fontScaleOptions.map(({ scale, label }) => (
                  <button
                    key={scale}
                    onClick={() => handleFontScale(scale)}
                    className={`flex-1 min-w-0 px-2 py-1 t-caption rounded-[1px] transition-colors duration-150 ${
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
            {/* 테마 3지선다 — Settings 와 동일(시스템 따름/라이트/다크) */}
            <div className="px-3 py-1.5">
              <p className="t-caption text-edit-faint mb-1.5">{t('settings.themeTitle')}</p>
              <div className="inline-flex max-w-full border border-edit-line rounded-[1px] p-0.5 gap-0.5">
                {(['system', 'light', 'dark'] as const).map(opt => (
                  <button
                    key={opt}
                    onClick={() => setThemePref(opt)}
                    className={`flex-1 min-w-0 px-2 py-1 t-caption rounded-[1px] transition-colors duration-150 ${
                      themePref === opt
                        ? 'bg-edit-ink text-edit-paper'
                        : 'text-edit-muted hover:text-edit-ink'
                    }`}
                  >
                    {opt === 'system' ? t('settings.themeSystem') : opt === 'light' ? t('settings.themeLight') : t('settings.themeDark')}
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
    </>
  )
}
