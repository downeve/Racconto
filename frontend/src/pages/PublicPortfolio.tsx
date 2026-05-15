import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import PortfolioChapterItems, { type PortfolioPhoto } from '../components/PortfolioChapterItems'
import PublicNavbar from '../components/PublicNavbar'
import EmptyState from '../components/EmptyState'
import { Sun, Moon, MapPin, ChevronLeft, ChevronRight, X, Link2, Check, Share2 } from 'lucide-react'
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
  slug: string | null
  title: string
  description: string | null
  cover_image_url: string | null
  location: string | null
  updated_at: string | null
  photos: Photo[]
  chapters: Chapter[]
  extra_photos: Photo[]
}

interface BannerProps {
  username: string
  projects: PortfolioProject[]
  darkMode: boolean
}

function PortfolioBanner({ username, projects, darkMode }: BannerProps) {
  const projectCount = projects.length
  const eyebrowColor = darkMode ? 'text-d-soft' : 'text-muted'
  return (
    <div className="pb-2">
      <p className={`t-eyebrow mb-2 ${eyebrowColor}`}>
        Portfolio
        {projectCount > 0 && <span className="ml-2 opacity-70">· {projectCount} {projectCount === 1 ? 'project' : 'projects'}</span>}
      </p>
      <h1 className="font-serif font-normal leading-[1.1] tracking-[-0.015em]" style={{ fontSize: 'clamp(28px, 4vw, 38px)' }}>
        @{username}
      </h1>
    </div>
  )
}

export default function PublicPortfolio() {
  const { username, slug } = useParams<{ username: string; slug?: string }>()
  const [localSelectedProject, setLocalSelectedProject] = useState<PortfolioProject | null>(null)
  const [darkMode, setDarkMode] = useState(false)

  const enabled = !!username && username !== '@setup'

  const { data: listData, isError: listError } = useQuery({
    queryKey: ['portfolio', username],
    queryFn: async () => (await axios.get(`${API}/portfolio/${username}`)).data,
    enabled: enabled && !slug,
    retry: (_count, err) => (err as any)?.response?.status !== 404,
  })

  const { data: slugData, isError: slugError } = useQuery({
    queryKey: ['portfolioSlug', username, slug],
    queryFn: async () => (await axios.get(`${API}/portfolio/${username}/${slug}`)).data,
    enabled: enabled && !!slug,
    retry: (_count, err) => (err as any)?.response?.status !== 404,
  })

  const projects = useMemo<PortfolioProject[]>(() => listData?.projects ?? [], [listData])
  const selectedProject = slug ? (slugData?.project ?? null) : localSelectedProject
  const notFound = listError || slugError

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [lightboxItems, setLightboxItems] = useState<{ photo: Photo; title: string }[]>([])
  const [showLightboxHint, setShowLightboxHint] = useState(false)
  const [chromeOn, setChromeOn] = useState(true)
  const [ratios, setRatios] = useState<Record<string, number>>({})
  const lightboxHintShownRef = useRef(false)
  const lightboxRef = useRef<HTMLDivElement>(null)

  const activeLightboxItem = lightboxIndex !== null ? lightboxItems[lightboxIndex] : null

  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    if ((location.state as { resetToList?: boolean } | null)?.resetToList) {
      setLocalSelectedProject(null)
    }
  }, [location])

  useEffect(() => {
    if (!isAuthenticated && username === '@setup') {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, username, navigate])

  const applyTheme = useCallback((apiTheme: string) => {
    const saved = localStorage.getItem(`portfolio_theme_${username}`)
    setDarkMode(saved !== null ? saved === 'dark' : apiTheme === 'dark')
  }, [username])

  useEffect(() => {
    if (listData?.theme) applyTheme(listData.theme)
  }, [listData, applyTheme])

  useEffect(() => {
    if (slugData?.theme) applyTheme(slugData.theme)
  }, [slugData, applyTheme])

  const handleToggleDark = () => {
    setDarkMode(v => {
      const next = !v
      if (username) localStorage.setItem(`portfolio_theme_${username}`, next ? 'dark' : 'light')
      return next
    })
  }

  const openProject = (project: PortfolioProject) => {
    if (project.slug) {
      navigate(`/${username}/${project.slug}`)
    } else {
      setLocalSelectedProject(project)
      window.scrollTo(0, 0)
    }
  }

  const goBackToList = () => {
    if (slug) {
      navigate(`/${username}`)
    } else {
      setLocalSelectedProject(null)
      window.scrollTo(0, 0)
    }
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

  const [copied, setCopied] = useState(false)

  const getShareUrl = useCallback(() => {
    if (selectedProject?.slug) {
      return `${window.location.origin}/${username}/${selectedProject.slug}`
    }
    return window.location.href
  }, [selectedProject, username])

  const canNativeShare = typeof navigator !== 'undefined' && 'share' in navigator

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(getShareUrl()).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [getShareUrl])

  const openShareUrl = useCallback((url: string) => {
    window.open(url, '_blank', 'width=600,height=500,noopener,noreferrer')
  }, [])

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
      {!isAuthenticated && <PublicNavbar username={username} darkMode={darkMode} portfolio onToggleDark={handleToggleDark} />}
      {/* fixed navbar 높이만큼 밀어내는 spacer */}
      {!isAuthenticated && <div className="h-14" />}

      {/* Sticky top bar: breadcrumb (left) + theme toggle (right) — 로그인 상태에서만 표시 */}
      {isAuthenticated && <div className={`sticky top-0 z-10 border-b backdrop-blur-sm ${barBg}`}>
        <div className={`mx-auto px-6 h-10 flex items-center justify-between ${
          selectedProject || slug ? 'max-w-4xl' : 'max-w-4xl xl:max-w-6xl'
        }`}>
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
              onClick={handleToggleDark}
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

      <div className={`mx-auto px-6 ${isElectron ? 'pt-4' : 'pt-8'} pb-space-xl ${
        selectedProject || slug ? 'max-w-4xl' : 'max-w-4xl xl:max-w-6xl'
      }`}>

        {/* Page title */}
        <div id="portfolio-print-start" className="mb-space-md">
          {selectedProject ? (
            // ── Detail view: 프로젝트 제목 h1 (기존 유지) ──
            <header>
              <h1 className="font-serif text-[38px] leading-[1.1] tracking-[-0.015em] font-normal">
                {selectedProject.title}
              </h1>
            </header>
          ) : (
            // ── List view: 풀-블리드 커버 배너 ──
            <header className="mb-space-md">
              <PortfolioBanner
                username={username!}
                projects={projects}
                darkMode={darkMode}
              />
            </header>
          )}
        </div>

        {/* Project list */}
        {!selectedProject && !slug && (
          <div className="grid gap-x-8 gap-y-14 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {projects.map(project => (
              <article
                key={project.id}
                className="cursor-pointer group"
                onClick={() => openProject(project)}
              >
                <div className={`aspect-[4/5] overflow-hidden ${darkMode ? 'bg-d-surface' : 'bg-[oklch(0.92_0.012_75)]'}`}>
                  {project.cover_image_url ? (
                    <img
                      src={cfUrl(project.cover_image_url, 'cover')}
                      alt={project.title}
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                    />
                  ) : (
                    <CoverFallback title={project.title} dark={darkMode} />
                  )}
                </div>
                <h3 className="mt-4 font-serif text-[22px] tracking-tight font-normal truncate">
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
              <div className="col-span-1 md:col-span-2 xl:col-span-3">
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
              <div className={`flex flex-wrap items-center gap-3 t-caption mb-5 ${subText}`}>
                {selectedProject.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={11} strokeWidth={1.5} />
                    {selectedProject.location}
                  </span>
                )}
                {selectedProject.location && <span className="w-[3px] h-[3px] rounded-full bg-faint dark:bg-d-faint" />}
                <span>{getAllChapterItems(selectedProject).length} photos</span>
                {selectedProject.updated_at && (
                  <>
                    <span className="w-[3px] h-[3px] rounded-full bg-faint dark:bg-d-faint" />
                    <span>{new Date(selectedProject.updated_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </>
                )}
              </div>
              {selectedProject.description && (
                <p className={`font-serif text-[17px] leading-[1.65] italic [word-break:keep-all] whitespace-pre-wrap ${subText}`}>
                  {selectedProject.description}
                </p>
              )}
            </div>

            {selectedProject.chapters.length > 1 && (
              <nav className={`flex flex-wrap gap-2.5 mt-10 py-4 border-y ${darkMode ? 'border-d-line' : 'border-hair'}`}>
                {selectedProject.chapters.map((ch: Chapter, i: number) => (
                  <a
                    key={ch.id}
                    href={`#chapter-${ch.id}`}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-btn text-small font-sans
                                ${darkMode
                                  ? 'border border-transparent text-d-soft hover:text-d-hair'
                                  : 'border border-transparent text-muted hover:text-ink-2'}`}
                  >
                    <span className={`font-serif ${darkMode ? 'text-d-soft' : 'text-accent'}`} style={{ fontVariantNumeric: 'oldstyle-nums' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {ch.title}
                  </a>
                ))}
              </nav>
            )}

            {selectedProject.chapters.length > 0 ? (
              <div>
                {selectedProject.chapters.map((chapter: Chapter, idx: number) => (
                  <section key={chapter.id} id={`chapter-${chapter.id}`} className={idx > 0 ? 'pt-32 md:pt-40' : ''}>
                    <header className="mb-10 max-w-[560px]">
                      <p className={`t-eyebrow mb-3 ${microcopy}`}>
                        Chapter {String(idx + 1).padStart(2, '0')}
                      </p>
                      <h3 className="font-serif text-[32px] leading-[1.1] tracking-[-0.015em] font-normal">
                        {chapter.title}
                      </h3>
                      {chapter.description && (
                        <p className={`mt-5 font-serif text-[16px] leading-[1.65] [word-break:keep-all] whitespace-pre-wrap ${subText}`}>
                          {chapter.description}
                        </p>
                      )}
                    </header>
                    <PortfolioChapterItems
                      items={chapter.items || []}
                      allLightboxItems={getAllChapterItems(selectedProject) as { photo: PortfolioPhoto; title: string }[]}
                      darkMode={darkMode}
                      onLightbox={(photo, items) => openLightbox(photo as unknown as Photo, items as { photo: Photo; title: string }[])}
                      ratios={ratios}
                      setRatios={setRatios}
                    />
                    {chapter.sub_chapters?.map((sub: Chapter) => (
                      <div key={sub.id} className="mt-space-xl">
                        <div className="mb-5">
                          <p className={`t-eyebrow mb-2 ${microcopy}`}>Section</p>
                          <h4 className="font-serif text-[20px] tracking-tight font-normal">
                            {sub.title}
                          </h4>
                          {sub.description && (
                            <p className={`text-body font-serif mt-2 max-w-xl [word-break:keep-all] whitespace-pre-wrap ${subText}`}>
                              {sub.description}
                            </p>
                          )}
                        </div>
                        <PortfolioChapterItems
                          items={sub.items || []}
                          allLightboxItems={getAllChapterItems(selectedProject) as { photo: PortfolioPhoto; title: string }[]}
                          darkMode={darkMode}
                          onLightbox={(photo, items) => openLightbox(photo as unknown as Photo, items as { photo: Photo; title: string }[])}
                          ratios={ratios}
                          setRatios={setRatios}
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

            {/* 공유 버튼 */}
            <div className={`mt-24 pt-10 border-t ${darkMode ? 'border-d-line' : 'border-hair'}`}>
              <p className={`t-eyebrow mb-5 ${microcopy}`}>{t('portfolio.share')}</p>
              <div className="flex flex-wrap gap-2">
                {canNativeShare ? (
                  <button
                    onClick={() => navigator.share({ title: selectedProject.title, url: getShareUrl() }).catch(() => {})}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-[2px] border t-caption transition-colors duration-150 ${
                      darkMode
                        ? 'border-d-line text-d-faint hover:text-d-hair hover:border-d-soft'
                        : 'border-hair text-faint hover:text-ink-2 hover:border-faint'
                    }`}
                  >
                    <Share2 size={12} strokeWidth={1.5} />
                    {t('portfolio.share')}
                  </button>
                ) : (
                  <>
                    <button
                      title="Facebook"
                      onClick={() => openShareUrl(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl())}`)}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-[2px] border t-caption transition-colors duration-150 ${
                        darkMode
                          ? 'border-d-line text-d-faint hover:text-d-hair hover:border-d-soft'
                          : 'border-hair text-faint hover:text-ink-2 hover:border-faint'
                      }`}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </button>
                    <button
                      title="X"
                      onClick={() => openShareUrl(`https://twitter.com/intent/tweet?url=${encodeURIComponent(getShareUrl())}&text=${encodeURIComponent(selectedProject.title)}`)}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-[2px] border t-caption transition-colors duration-150 ${
                        darkMode
                          ? 'border-d-line text-d-faint hover:text-d-hair hover:border-d-soft'
                          : 'border-hair text-faint hover:text-ink-2 hover:border-faint'
                      }`}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.632 5.905-5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                    </button>
                    <button
                      onClick={handleCopyLink}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-[2px] border t-caption transition-colors duration-150 ${
                        copied
                          ? darkMode ? 'border-d-soft text-d-hair' : 'border-faint text-ink-2'
                          : darkMode ? 'border-d-line text-d-faint hover:text-d-hair hover:border-d-soft' : 'border-hair text-faint hover:text-ink-2 hover:border-faint'
                      }`}
                    >
                      {copied ? <Check size={12} strokeWidth={2} /> : <Link2 size={12} strokeWidth={1.5} />}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && activeLightboxItem && (
        <div
          ref={lightboxRef}
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-[oklch(0.12_0.012_60/0.98)] z-50 flex flex-col"
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
              onMouseDown={e => e.preventDefault()}
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
              onMouseDown={e => e.preventDefault()}
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
