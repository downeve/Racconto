import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import PortfolioChapterItems, { type PortfolioPhoto } from '../components/PortfolioChapterItems'
import PublicNavbar from '../components/PublicNavbar'
import EmptyState from '../components/EmptyState'
import { Sun, Moon, MapPin, ChevronLeft, ChevronRight, X } from 'lucide-react'
import CoverFallback from '../components/CoverFallback'
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
  const [chromeOn, setChromeOn] = useState(true)
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

  // Chrome auto-hide (2.5s idle)
  useEffect(() => {
    if (lightboxIndex === null) {
      setChromeOn(true)
      return
    }
    let t: number
    const ping = () => {
      setChromeOn(true)
      clearTimeout(t)
      t = window.setTimeout(() => setChromeOn(false), 2500)
    }
    ping()
    window.addEventListener('mousemove', ping)
    window.addEventListener('touchstart', ping)
    return () => {
      window.removeEventListener('mousemove', ping)
      window.removeEventListener('touchstart', ping)
      clearTimeout(t)
    }
  }, [lightboxIndex])

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

  const bg       = darkMode ? 'bg-d-bg text-d-hair'  : 'bg-canvas text-ink'
  const subText  = darkMode ? 'text-d-soft'          : 'text-muted'
  const microcopy = darkMode ? 'text-d-faint'        : 'text-faint'
  const barBg    = darkMode
    ? 'bg-d-bg/85 border-d-line'
    : 'bg-canvas/85 border-hair/60'

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
      {!isAuthenticated && <PublicNavbar username={username} darkMode={darkMode} compact onToggleDark={() => setDarkMode(!darkMode)} />}

      {/* Sticky top bar: breadcrumb (left) + theme toggle (right) — desktop only breadcrumb */}
      {(isAuthenticated || !!selectedProject) && <div className={`sticky ${!isAuthenticated ? 'top-14' : 'top-0'} z-10 border-b backdrop-blur-sm ${barBg}`}>
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
          {isAuthenticated && (
            <button
              onClick={() => setDarkMode(!darkMode)}
              aria-label="다크 모드 전환"
              className={`inline-flex items-center gap-1 px-3 py-1 text-xs rounded-btn border ${darkMode ? 'border-ink-2 text-faint' : 'border-faint text-muted'}`}
            >
              {darkMode
                ? <><Sun size={12} strokeWidth={1.5} /> {t('settings.themeBeige')}</>
                : <><Moon size={12} strokeWidth={1.5} /> {t('settings.themeDark')}</>}
            </button>
          )}
        </div>
      </div>}

      <div className={`max-w-4xl mx-auto px-6 ${isElectron ? 'pt-4' : 'pt-space-md'} pb-space-xl`}>

        {/* Page title */}
        <div id="portfolio-print-start" className="mb-space-md">
          {selectedProject ? (
            <header>
              <h1 className="font-serif text-[38px] leading-[1.1] tracking-[-0.015em] font-normal">
                {selectedProject.title}
              </h1>
            </header>
          ) : (
            <header>
              <p className={`t-eyebrow mb-2.5 ${microcopy}`}>Portfolio</p>
              <h1 className="font-serif text-[38px] leading-[1.1] tracking-[-0.015em] font-normal">
                @{username}
              </h1>
            </header>
          )}
        </div>

        {/* Project list */}
        {!selectedProject && (
          <div className="grid gap-x-10 gap-y-16 grid-cols-1 md:grid-cols-2">
            {projects.map(project => (
              <article
                key={project.id}
                className="cursor-pointer group"
                onClick={() => openProject(project)}
              >
                <div className={`aspect-[4/5] overflow-hidden ${darkMode ? 'bg-d-surface' : 'bg-[oklch(0.92_0.012_75)]'}`}>
                  {project.cover_image_url ? (
                    <img
                      src={cfUrl(project.cover_image_url, 'thumb')}
                      alt={project.title}
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                    />
                  ) : (
                    <CoverFallback title={project.title} dark={darkMode} />
                  )}
                </div>
                <h3 className="mt-4 font-serif text-[22px] tracking-tight font-normal [word-break:keep-all]">
                  {project.title}
                </h3>
                {project.location && (
                  <p className={`t-loc mt-2 ${subText}`}>
                    <MapPin size={10} strokeWidth={1.5} />{project.location}
                  </p>
                )}
                {project.description && (
                  <p className={`mt-3 font-serif text-[14px] leading-[1.55] line-clamp-2 [word-break:keep-all] ${subText}`}>
                    {project.description}
                  </p>
                )}
              </article>
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
                <p className={`t-loc mb-7 ${subText}`}>
                  <MapPin size={10} strokeWidth={1.5} />{selectedProject.location}
                </p>
              )}
              {selectedProject.description && (
                <p className={`font-serif text-[17px] leading-[1.65] italic [word-break:keep-all] ${subText}`}>
                  {selectedProject.description}
                </p>
              )}
            </div>

            {selectedProject.chapters.length > 0 ? (
              <div>
                {selectedProject.chapters.map((chapter, idx) => (
                  <section key={chapter.id} className={idx > 0 ? 'pt-32 md:pt-40' : ''}>
                    <header className="mb-10 max-w-[560px]">
                      <p className={`t-eyebrow mb-2 ${microcopy}`}>Chapter</p>
                      <h3 className="font-serif text-[32px] leading-[1.1] tracking-[-0.015em] font-normal">
                        {chapter.title}
                      </h3>
                      {chapter.description && (
                        <p className={`mt-5 font-serif text-[16px] leading-[1.65] [word-break:keep-all] ${subText}`}>
                          {chapter.description}
                        </p>
                      )}
                    </header>
                    <PortfolioChapterItems
                      items={chapter.items || []}
                      allLightboxItems={getAllChapterItems(selectedProject) as { photo: PortfolioPhoto; title: string }[]}
                      darkMode={darkMode}
                      onLightbox={(photo, items) => openLightbox(photo as unknown as Photo, items as { photo: Photo; title: string }[])}
                    />
                    {chapter.sub_chapters?.map((sub) => (
                      <div key={sub.id} className="mt-space-xl">
                        <div className="mb-5">
                          <p className={`t-eyebrow mb-2 ${microcopy}`}>Section</p>
                          <h4 className="font-serif text-[20px] tracking-tight font-medium">
                            {sub.title}
                          </h4>
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
                  </section>
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
          className="fixed inset-0 bg-[oklch(0.12_0.012_60)]/[.98] z-50 flex flex-col transition-[background,color,border] duration-150 ease-out"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Thin top bar: chapter title, counter, close */}
          <div
            className={`shrink-0 flex items-center justify-between px-6 h-10 border-b border-d-line transition-opacity duration-500 ${chromeOn ? 'opacity-100' : 'opacity-0'}`}
            onClick={e => e.stopPropagation()}
          >
            <span className="t-eyebrow text-d-faint truncate max-w-[60%]">{activeLightboxItem.title}</span>
            <div className="flex items-center gap-3 shrink-0">
              <span className="t-numeral text-d-faint">{lightboxIndex + 1} / {lightboxItems.length}</span>
              <button
                aria-label="닫기"
                onClick={() => setLightboxIndex(null)}
                className="p-1.5 text-d-faint hover:text-d-hair hover:bg-d-line/50 transition-colors"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Left arrow */}
          {lightboxIndex > 0 && (
            <button
              aria-label="이전 사진"
              className={`absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 text-d-faint hover:text-d-hair hover:bg-d-line/50 transition-[opacity,color,background] duration-500 ${chromeOn ? 'opacity-100' : 'opacity-0'}`}
              onClick={e => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1) }}
            >
              <ChevronLeft size={28} strokeWidth={1.5} />
            </button>
          )}

          {/* Image */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
            <img
              key={lightboxIndex}
              src={cfUrl(activeLightboxItem.photo.image_url, 'public')}
              alt={activeLightboxItem.photo.caption || ''}
              className="max-h-full max-w-full object-contain animate-[fade_.35s_ease-out]"
              onClick={e => e.stopPropagation()}
            />
          </div>

          {/* Right arrow */}
          {lightboxIndex < lightboxItems.length - 1 && (
            <button
              aria-label="다음 사진"
              className={`absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 text-d-faint hover:text-d-hair hover:bg-d-line/50 transition-[opacity,color,background] duration-500 ${chromeOn ? 'opacity-100' : 'opacity-0'}`}
              onClick={e => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1) }}
            >
              <ChevronRight size={28} strokeWidth={1.5} />
            </button>
          )}

          {/* Keyboard hint toast — 첫 진입 시 1회 */}
          {showLightboxHint && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 bg-d-line/70 pointer-events-none whitespace-nowrap">
              <span className="t-caption text-d-faint">← → ESC</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
