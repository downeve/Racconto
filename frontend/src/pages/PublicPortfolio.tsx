import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import PortfolioChapterItems, { type PortfolioPhoto } from '../components/PortfolioChapterItems'
import PublicNavbar from '../components/PublicNavbar'
import EmptyState from '../components/EmptyState'
import { Sun, Moon, MapPin, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cfUrl } from '../utils/cfImage'

const API = import.meta.env.VITE_API_URL
const isElectron = typeof window !== 'undefined' && !!window.racconto

interface Photo {
  id: string
  image_url: string
  caption?: string | null
}

interface ChapterItem {
  item_type: 'PHOTO' | 'TEXT'
  id?: string
  image_url?: string
  caption?: string | null
  block_layout?: 'grid' | 'wide' | 'single'
  text_content?: string | null
  block_id?: string | null
  block_type?: string
}

interface Chapter {
  id: string
  title: string
  description: string | null
  items: ChapterItem[]
  sub_chapters: Chapter[]
}

interface PortfolioProject {
  id: string
  title: string
  description: string | null
  cover_image_url: string | null
  location: string | null
  photos: Photo[]
  chapters: Chapter[]
  extra_photos: Photo[]
}

export default function PublicPortfolio() {
  const { username } = useParams()
  const [projects, setProjects] = useState<PortfolioProject[]>([])
  const [selectedProject, setSelectedProject] = useState<PortfolioProject | null>(null)
  const [darkMode, setDarkMode] = useState(false)
  const [notFound, setNotFound] = useState(false)

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [lightboxItems, setLightboxItems] = useState<{ photo: Photo; title: string }[]>([])
  const [showLightboxHint, setShowLightboxHint] = useState(false)
  const lightboxHintShownRef = useRef(false)
  const lightboxRef = useRef<HTMLDivElement>(null)

  const activeLightboxItem = lightboxIndex !== null ? lightboxItems[lightboxIndex] : null

  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    if ((location.state as { resetToList?: boolean } | null)?.resetToList) {
      setSelectedProject(null)
    }
  }, [location])

  useEffect(() => {
    if (!isAuthenticated && username === '@setup') {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, username, navigate])

  useEffect(() => {
    if (!username || username === '@setup') {
      setNotFound(false)
      return
    }
    axios.get(`${API}/portfolio/${username}`)
      .then(res => {
        setProjects(res.data.projects)
        setDarkMode(res.data.theme === 'dark')
      })
      .catch(err => {
        if (err.response?.status === 404) setNotFound(true)
      })
  }, [username])

  const openProject = (project: PortfolioProject) => {
    setSelectedProject(project)
    window.scrollTo(0, 0)
  }

  const goBackToList = () => {
    setSelectedProject(null)
    window.scrollTo(0, 0)
  }

  const getAllChapterItems = (project: PortfolioProject) => {
    const items: { photo: Photo; title: string }[] = []
    project.chapters?.forEach((ch) => {
      ch.items?.filter(i => i.item_type === 'PHOTO').forEach(i => {
        items.push({ photo: i as Photo, title: ch.title })
      })
      ch.sub_chapters?.forEach((sub) => {
        sub.items?.filter(i => i.item_type === 'PHOTO').forEach(i => {
          items.push({ photo: i as Photo, title: sub.title })
        })
      })
    })
    return items
  }

  const openLightbox = (photo: Photo, items: { photo: Photo; title: string }[]) => {
    const idx = items.findIndex(item => item.photo === photo)
    setLightboxItems(items)
    setLightboxIndex(idx !== -1 ? idx : 0)
    if (!lightboxHintShownRef.current) {
      lightboxHintShownRef.current = true
      setShowLightboxHint(true)
      setTimeout(() => setShowLightboxHint(false), 2500)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null || lightboxItems.length === 0) return
      if (e.key === 'Escape') { setLightboxIndex(null); return }
      if (e.key === 'ArrowRight' && lightboxIndex < lightboxItems.length - 1) {
        setLightboxIndex(prev => prev !== null ? prev + 1 : null)
      }
      if (e.key === 'ArrowLeft' && lightboxIndex > 0) {
        setLightboxIndex(prev => prev !== null ? prev - 1 : null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxIndex, lightboxItems])

  // Focus trap for lightbox
  useEffect(() => {
    if (lightboxIndex === null || !lightboxRef.current) return
    const el = lightboxRef.current
    const focusables = el.querySelectorAll<HTMLElement>('button, [tabindex]:not([tabindex="-1"])')
    if (focusables.length) focusables[0].focus()

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    el.addEventListener('keydown', handleTab)
    return () => el.removeEventListener('keydown', handleTab)
  }, [lightboxIndex])

  const bg = darkMode ? 'bg-[#18140F] text-hair' : 'bg-canvas text-ink'
  const subText = darkMode ? 'text-faint' : 'text-muted'
  const barBg = darkMode
    ? 'bg-[#18140F]/95 border-white/10'
    : 'bg-canvas/95 border-hair/60'

  if (username === '@setup' || !username) {
    return (
      <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-ink text-hair' : 'bg-canvas text-ink'}`}>
        <main className="flex-1 flex items-center justify-center px-6 pb-32">
          <EmptyState
            heading={t('portfolio.startMessage')}
            body={t('portfolio.startMessage2')}
          />
        </main>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className={`fixed inset-0 z-[100] flex flex-col ${darkMode ? 'bg-ink text-hair' : 'bg-canvas text-ink'}`}>
        <PublicNavbar />
        <main className="flex-1 flex items-center justify-center px-6 pb-32">
          <EmptyState heading={`@${username}${t('portfolio.noUser')}`} />
        </main>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${bg} transition-[background,color,border] duration-150 ease-out`}>
      {!isAuthenticated && <PublicNavbar username={username} darkMode={darkMode} compact />}

      {/* Sticky top bar: breadcrumb (left) + theme toggle (right) — desktop only breadcrumb */}
      <div className={`sticky ${!isAuthenticated ? 'top-20' : 'top-0'} z-10 border-b backdrop-blur-sm ${barBg}`}>
        <div className="max-w-4xl mx-auto px-6 h-10 flex items-center justify-between">
          {selectedProject ? (
            <button
              onClick={goBackToList}
              className={`hidden md:flex items-center gap-1 text-small hover:opacity-70 transition-opacity ${subText}`}
            >
              <ChevronLeft size={14} strokeWidth={1.5} />
              <span>@{username}</span>
              <span className="mx-0.5 opacity-40">/</span>
              <span className={darkMode ? 'text-hair' : 'text-ink-2'}>{selectedProject.title}</span>
            </button>
          ) : (
            <div className="hidden md:block" />
          )}
          <div className="md:hidden" />
          <button
            onClick={() => setDarkMode(!darkMode)}
            aria-label="다크 모드 전환"
            className={`inline-flex items-center gap-1 px-3 py-1 text-xs rounded-btn border ${darkMode ? 'border-ink-2 text-faint' : 'border-faint text-muted'}`}
          >
            {darkMode
              ? <><Sun size={12} strokeWidth={1.5} /> {t('settings.themeBeige')}</>
              : <><Moon size={12} strokeWidth={1.5} /> {t('settings.themeDark')}</>}
          </button>
        </div>
      </div>

      <div className={`max-w-4xl mx-auto px-6 ${isElectron ? 'pt-4' : 'pt-space-md'} pb-space-xl`}>

        {/* Page title */}
        <div id="portfolio-print-start" className="mb-space-md">
          {selectedProject ? (
            <h1 className={`text-h1 font-bold font-serif tracking-tight ${darkMode ? 'text-hair' : 'text-ink'}`}>
              {selectedProject.title}
            </h1>
          ) : (
            <h2 className={`text-h2 font-bold font-serif tracking-wide ${darkMode ? 'text-hair' : 'text-ink'}`}>
              @{username}
            </h2>
          )}
        </div>

        {/* Project list */}
        {!selectedProject && (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
            {projects.map(project => (
              <div
                key={project.id}
                className={`cursor-pointer group rounded-card overflow-hidden transition-shadow border shadow-sm hover:shadow ${darkMode ? 'border-white/10' : 'border-hair'}`}
                onClick={() => openProject(project)}
              >
                <div className={`h-48 flex items-center justify-center ${darkMode ? 'bg-card-cover' : 'bg-hair'}`}>
                  {project.cover_image_url ? (
                    <img
                      src={cfUrl(project.cover_image_url, 'thumb')}
                      alt={project.title}
                      className="w-full h-full object-cover group-hover:opacity-95 transition-opacity"
                    />
                  ) : (
                    <span className={`font-serif text-[3.5rem] leading-none font-light select-none ${darkMode ? 'text-stone-600' : 'text-stone-300'}`}>
                      {project.title.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className={`p-4 ${darkMode ? 'bg-card-surface' : 'bg-canvas-2'}`}>
                  <h3 className={`font-semibold text-h3 font-serif [word-break:keep-all] ${darkMode ? 'text-hair' : 'text-ink-2'}`}>
                    {project.title}
                  </h3>
                  {project.location && (
                    <p className={`flex items-center gap-1 text-small mt-1 ${subText}`}>
                      <MapPin size={12} strokeWidth={1.5} />{project.location}
                    </p>
                  )}
                  {project.description && (
                    <p className={`text-body font-serif mt-1 line-clamp-2 [word-break:keep-all] ${subText}`}>
                      {project.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {projects.length === 0 && (
              <div className="col-span-2">
                <EmptyState
                  heading={t('portfolio.noPublicProjects')}
                  darkMode={darkMode}
                />
              </div>
            )}
          </div>
        )}

        {/* Project detail */}
        {selectedProject && (
          <div id="portfolio-print-area">
            <div className="mb-space-md max-w-2xl">
              {selectedProject.location && (
                <p className={`flex items-center gap-1 text-menu uppercase mb-6 ${subText}`}>
                  <MapPin size={12} strokeWidth={1.5} />{selectedProject.location}
                </p>
              )}
              {selectedProject.description && (
                <p className={`text-body font-serif [word-break:keep-all] ${subText}`}>
                  {selectedProject.description}
                </p>
              )}
            </div>

            {selectedProject.chapters.length > 0 ? (
              <div className="space-y-0">
                {selectedProject.chapters.map((chapter, idx) => (
                  <div key={chapter.id} className={idx > 0 ? 'pt-space-xl' : ''}>
                    <div className="mb-space-md">
                      <div className="mb-2">
                        <h3 className="text-h2 font-bold font-serif mb-4 tracking-tight">
                          {chapter.title}
                        </h3>
                      </div>
                      {chapter.description && (
                        <p className={`text-body font-serif max-w-xl [word-break:keep-all] ${subText}`}>
                          {chapter.description}
                        </p>
                      )}
                      <div className={`mt-6 h-px w-12 ${darkMode ? 'bg-card/30' : 'bg-faint'}`} />
                    </div>
                    <PortfolioChapterItems
                      items={chapter.items || []}
                      allLightboxItems={getAllChapterItems(selectedProject) as { photo: PortfolioPhoto; title: string }[]}
                      darkMode={darkMode}
                      onLightbox={(photo, items) => openLightbox(photo as unknown as Photo, items as { photo: Photo; title: string }[])}
                    />
                    {chapter.sub_chapters?.map((sub) => (
                      <div key={sub.id} className="mt-space-xl">
                        <div className="mb-8">
                          <div className="mb-2">
                            <h4 className="text-h3 font-serif font-semibold">
                              {sub.title}
                            </h4>
                          </div>
                          {sub.description && (
                            <p className={`text-body font-serif mt-2 max-w-xl [word-break:keep-all] ${subText}`}>
                              {sub.description}
                            </p>
                          )}
                        </div>
                        <PortfolioChapterItems
                          items={sub.items || []}
                          allLightboxItems={getAllChapterItems(selectedProject) as { photo: PortfolioPhoto; title: string }[]}
                          darkMode={darkMode}
                          onLightbox={(photo, items) => openLightbox(photo as unknown as Photo, items as { photo: Photo; title: string }[])}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                heading={t('portfolio.noChapters')}
                body={t('portfolio.createChapterFirst')}
                darkMode={darkMode}
              />
            )}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && activeLightboxItem && (
        <div
          ref={lightboxRef}
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-lightbox/[.97] z-50 flex flex-col transition-[background,color,border] duration-150 ease-out"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Thin top bar: chapter title, counter, close */}
          <div
            className="shrink-0 flex items-center justify-between px-6 h-10 border-b border-white/10"
            onClick={e => e.stopPropagation()}
          >
            <span className="text-hair/50 text-small truncate max-w-[60%]">{activeLightboxItem.title}</span>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-hair/50 text-small">{lightboxIndex + 1} / {lightboxItems.length}</span>
              <button
                aria-label="닫기"
                onClick={() => setLightboxIndex(null)}
                className="p-1.5 rounded text-hair/60 hover:text-hair hover:bg-white/10 transition-colors"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Left arrow */}
          {lightboxIndex > 0 && (
            <button
              aria-label="이전 사진"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full text-hair/60 hover:text-hair hover:bg-white/10 transition-colors"
              onClick={e => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1) }}
            >
              <ChevronLeft size={28} strokeWidth={1.5} />
            </button>
          )}

          {/* Image */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
            <img
              src={cfUrl(activeLightboxItem.photo.image_url, 'public')}
              alt={activeLightboxItem.photo.caption || ''}
              className="max-h-full max-w-full object-contain"
              onClick={e => e.stopPropagation()}
            />
          </div>

          {/* Right arrow */}
          {lightboxIndex < lightboxItems.length - 1 && (
            <button
              aria-label="다음 사진"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full text-hair/60 hover:text-hair hover:bg-white/10 transition-colors"
              onClick={e => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1) }}
            >
              <ChevronRight size={28} strokeWidth={1.5} />
            </button>
          )}

          {/* Keyboard hint toast — 첫 진입 시 1회 */}
          {showLightboxHint && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 rounded bg-white/10 text-hair/60 text-caption pointer-events-none whitespace-nowrap">
              ← → ESC
            </div>
          )}
        </div>
      )}
    </div>
  )
}
