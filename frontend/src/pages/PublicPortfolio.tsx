import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useLightboxZoom } from '../hooks/useLightboxZoom'
import { useActiveChapter } from '../hooks/useActiveChapter'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import PortfolioChapterItems, { type PortfolioPhoto } from '../components/PortfolioChapterItems'
import PublicNavbar from '../components/PublicNavbar'
import FollowButton from '../components/FollowButton'
import PortfolioListCard from '../components/PortfolioListCard'
import EmptyState from '../components/EmptyState'
import PortfolioComments from '../components/PortfolioComments'
import { Sun, Moon, MapPin, ChevronLeft, ChevronRight, X, Link2, Check, ArrowUp } from 'lucide-react'
import { cfUrl, cfLightboxUrl } from '../utils/cfImage'

const API = import.meta.env.VITE_API_URL
const isElectron = typeof window !== 'undefined' && !!window.racconto

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
  view_count?: number
  photos: PortfolioPhoto[]
  chapters: Chapter[]
  extra_photos: PortfolioPhoto[]
}

interface BannerProps {
  username: string
  projects: PortfolioProject[]
  showFollow: boolean
}

function PortfolioBanner({ username, projects, showFollow }: BannerProps) {
  const projectCount = projects.length
  return (
    <div className="pb-2">
      <p className="t-eyebrow mb-2 text-muted">
        Portfolio
        {projectCount > 0 && <span className="ml-2 opacity-70">· {projectCount} {projectCount === 1 ? 'project' : 'projects'}</span>}
      </p>
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <h1 className="font-serif font-normal leading-[1.1] tracking-[-0.015em]" style={{ fontSize: 'clamp(28px, 4vw, 38px)' }}>
          @{username}
        </h1>
        {showFollow && <FollowButton username={username} />}
      </div>
    </div>
  )
}

export default function PublicPortfolio() {
  const { username, slug } = useParams<{ username: string; slug?: string }>()
  const [localSelectedProject, setLocalSelectedProject] = useState<PortfolioProject | null>(null)
  const [darkMode, setDarkMode] = useState(false)

  const enabled = !!username && username !== '@setup'

  const { data: listData, isError: listError, isLoading: listLoading } = useQuery({
    queryKey: ['portfolio', username],
    queryFn: async () => (await axios.get(`${API}/portfolio/${username}`)).data,
    enabled: enabled && !slug,
    staleTime: 1000 * 60 * 5,  // 공개 포트폴리오 — 5분간 fresh 유지
    retry: (_count, err) => !axios.isAxiosError(err) || err.response?.status !== 404,
  })

  const { data: slugData, isError: slugError } = useQuery({
    queryKey: ['portfolioSlug', username, slug],
    queryFn: async () => (await axios.get(`${API}/portfolio/${username}/${slug}`)).data,
    enabled: enabled && !!slug,
    staleTime: 1000 * 60 * 5,  // 공개 포트폴리오 — 5분간 fresh 유지
    retry: (_count, err) => !axios.isAxiosError(err) || err.response?.status !== 404,
  })

  const projects = useMemo<PortfolioProject[]>(() => listData?.projects ?? [], [listData])
  const selectedProject = slug ? (slugData?.project ?? null) : localSelectedProject
  const notFound = listError || slugError

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [lightboxItems, setLightboxItems] = useState<{ photo: PortfolioPhoto; title: string }[]>([])
  const [showLightboxHint, setShowLightboxHint] = useState(false)
  const [chromeOn, setChromeOn] = useState(true)
  const lightboxHintShownRef = useRef(false)
  const lightboxRef = useRef<HTMLDivElement>(null)
  const lightboxWasOpenRef = useRef(false)

  const activeLightboxItem = lightboxIndex !== null ? lightboxItems[lightboxIndex] : null
  const zoom = useLightboxZoom(lightboxIndex)

  // 스크롤 진행도 + 챕터 active 추적
  const [scrollProgress, setScrollProgress] = useState(0)
  const chapterIds = useMemo(
    () => selectedProject?.chapters.map((c: Chapter) => c.id) ?? [],
    [selectedProject]
  )
  const activeChapterId = useActiveChapter(chapterIds)
  const [longPressActive, setLongPressActive] = useState(false)
  const longPressTimer = useRef<number | null>(null)

  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, user } = useAuth()

  useEffect(() => {
    if ((location.state as { resetToList?: boolean } | null)?.resetToList) {
      setLocalSelectedProject(null)
    }
  }, [location.state])

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

  // 브라우저 탭 제목 동기화 — 개별 프로젝트면 프로젝트 제목, 작가 페이지면 @username
  useEffect(() => {
    const original = document.title
    if (selectedProject) {
      document.title = `${selectedProject.title} — Racconto`
    } else if (username) {
      document.title = `@${username} — Racconto`
    }
    return () => { document.title = original }
  }, [selectedProject, username])

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
      // 진입 경로 referrer 가 있으면 그쪽으로 (예: /explore), 없으면 유저 포트폴리오 목록
      const from = (location.state as { from?: string } | null)?.from
      navigate(from ?? `/${username}`)
    } else {
      setLocalSelectedProject(null)
      window.scrollTo(0, 0)
    }
  }

  const allLightboxItems = useMemo(() => {
    if (!selectedProject) return []
    const items: { photo: PortfolioPhoto; title: string }[] = []
    selectedProject.chapters?.forEach((ch: Chapter) => {
      ch.items?.filter((i: ChapterItem) => i.item_type === 'PHOTO').forEach((i: ChapterItem) => {
        items.push({ photo: i as PortfolioPhoto, title: ch.title })
      })
      ch.sub_chapters?.forEach((sub: Chapter) => {
        sub.items?.filter((i: ChapterItem) => i.item_type === 'PHOTO').forEach((i: ChapterItem) => {
          items.push({ photo: i as PortfolioPhoto, title: sub.title })
        })
      })
    })
    return items
  }, [selectedProject])

  const [copied, setCopied] = useState(false)

  const getShareUrl = useCallback(() => {
    if (selectedProject?.slug) {
      return `${window.location.origin}/${username}/${selectedProject.slug}`
    }
    return window.location.href
  }, [selectedProject, username])

  // 데스크톱에서는 native share(시스템 공유 시트) 대신 SNS 버튼을 항상 표시

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(getShareUrl()).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [getShareUrl])

  const openShareUrl = useCallback((url: string) => {
    window.open(url, '_blank', 'width=600,height=500,noopener,noreferrer')
  }, [])

  const openLightbox = (photo: PortfolioPhoto, items: { photo: PortfolioPhoto; title: string }[]) => {
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

  // 인접 이미지 preload — 앞 1장 + 뒤 2장
  useEffect(() => {
    if (lightboxIndex === null || lightboxItems.length === 0) return
    const indices = [lightboxIndex - 1, lightboxIndex + 1, lightboxIndex + 2]
      .filter(i => i >= 0 && i < lightboxItems.length)
    indices.forEach(i => {
      const url = lightboxItems[i].photo.image_url
      if (!url) return
      const img = new Image()
      img.src = cfLightboxUrl(url)
    })
  }, [lightboxIndex, lightboxItems])

  // Focus trap for lightbox
  useEffect(() => {
    if (lightboxIndex === null) {
      lightboxWasOpenRef.current = false
      return
    }
    if (!lightboxRef.current) return
    const el = lightboxRef.current

    // 열릴 때만 최초 포커스 — 컨테이너에 포커스해서 키 이벤트 수신, 버튼 focus ring 방지
    if (!lightboxWasOpenRef.current) {
      el.focus()
      lightboxWasOpenRef.current = true
    }

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const focs = el.querySelectorAll<HTMLElement>('button, [tabindex]:not([tabindex="-1"])')
      const first = focs[0]
      const last = focs[focs.length - 1]
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

  // 스크롤 진행도 계산
  useEffect(() => {
    const onScroll = () => {
      const docH = document.documentElement.scrollHeight
      const viewH = window.innerHeight
      const progress = docH <= viewH ? 0 : Math.min(1, window.scrollY / (docH - viewH))
      setScrollProgress(progress)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // 챕터 스크롤 이동
  const scrollToChapter = useCallback((id: string) => {
    const el = document.getElementById(`chapter-section-${id}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  // 작가 테마(L2) 스코프 — 의미 토큰만 사용하면 [data-theme] 가 자동 라이트/다크 매핑.
  const scopedTheme: 'light' | 'dark' = darkMode ? 'dark' : 'light'
  const bg = 'bg-canvas text-ink'
  const subText = 'text-muted'
  const microcopy = 'text-muted'
  const barBg = 'bg-canvas/85 border-hair'

  if (username === '@setup' || !username) {
    return (
      <div data-theme={scopedTheme} className="min-h-screen flex flex-col bg-canvas text-ink">
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
      <div data-theme={scopedTheme} className={`min-h-screen ${bg}`}>
        {!isAuthenticated && <PublicNavbar username={username} portfolio onToggleDark={handleToggleDark} />}
        {!isAuthenticated && <div className="h-14" />}
        <main className="flex items-center justify-center px-6 py-24">
          <EmptyState
            heading={`@${username}${t('portfolio.noUser')}`}
            body={t('portfolio.noUserBody')}
            cta={<a href="/" className="t-caption underline text-muted hover:text-ink-2">{t('portfolio.exploreOthers')}</a>}
          />
        </main>
      </div>
    )
  }

  return (
    <div data-theme={scopedTheme} className={`min-h-screen ${bg} transition-[background,color,border] duration-150 ease-out`}>
      {!isAuthenticated && <PublicNavbar username={username} portfolio onToggleDark={handleToggleDark} />}
      {/* fixed navbar 높이만큼 밀어내는 spacer */}
      {!isAuthenticated && <div className="h-14" />}

      {/* Sticky top bar: breadcrumb (left) + theme toggle (right) — 로그인 상태에서만 표시 */}
      {isAuthenticated && <div className={`sticky top-0 z-10 border-b backdrop-blur-sm ${barBg}`}>
        <div className={`mx-auto px-6 h-10 flex items-center justify-between ${
          selectedProject || slug ? 'max-w-4xl' : 'max-w-4xl xl:max-w-6xl'
        }`}>
          {selectedProject ? (() => {
            // referrer 가 /explore 면 breadcrumb 첫 세그먼트를 'Explore' 로 표시해 복귀 위치 명시
            const fromExplore = (location.state as { from?: string } | null)?.from === '/explore'
            return (
              <button
                onClick={goBackToList}
                className={`hidden md:flex items-center gap-1 text-small hover:opacity-70 transition-opacity ${subText}`}
              >
                <ChevronLeft size={14} strokeWidth={1.5} />
                <span>{fromExplore ? t('explore.menu') : `@${username}`}</span>
                <span className="mx-0.5 opacity-40">/</span>
                <span className="text-ink-2">{selectedProject.title}</span>
              </button>
            )
          })() : (
            <div className="hidden md:block" />
          )}
          <div className="md:hidden" />
          {isAuthenticated && (
            <button
              onClick={handleToggleDark}
              aria-label="다크 모드 전환"
              className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-btn border border-hair text-muted hover:text-ink"
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
          ) : slug ? (
            // ── slug 상세 로딩 중 — 목록 배너 대신 비움(@username 목록 깜빡임 방지) ──
            null
          ) : (
            // ── List view: 풀-블리드 커버 배너 ──
            <header className="mb-space-md">
              <PortfolioBanner
                username={username!}
                projects={projects}
                showFollow={isAuthenticated && !!user?.username && user.username !== username}
              />
            </header>
          )}
        </div>

        {/* Project list */}
        {!selectedProject && !slug && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-7 gap-y-15">
            {projects.map(project => (
              <PortfolioListCard
                key={project.id}
                mode="portfolio"
                href={project.slug ? `/${username}/${project.slug}` : '#'}
                onClick={project.slug ? undefined : () => openProject(project)}
                coverImageUrl={project.cover_image_url}
                title={project.title}
                location={project.location}
                description={project.description}
              />
            ))}
            {/* 로딩 중에는 EmptyState 를 띄우지 않음 — 첫 접근 시 빈 상태 깜빡임 방지 */}
            {projects.length === 0 && !listLoading && (
              <div className="col-span-1 md:col-span-2 xl:col-span-3">
                <EmptyState
                  heading={t('portfolio.noPublicProjects')}
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
                {selectedProject.location && <span className="w-[3px] h-[3px] rounded-full bg-faint" />}
                <span>{allLightboxItems.length} photos</span>
                {selectedProject.updated_at && (
                  <>
                    <span className="w-[3px] h-[3px] rounded-full bg-faint" />
                    <span>{new Date(selectedProject.updated_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </>
                )}
                {typeof selectedProject.view_count === 'number' && (
                  <>
                    <span className="w-[3px] h-[3px] rounded-full bg-faint" />
                    <span>{selectedProject.view_count.toLocaleString()} {t('portfolio.views')}</span>
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
              <nav className="flex flex-wrap gap-2.5 mt-10 py-4 border-y border-hair">
                {selectedProject.chapters.map((ch: Chapter, i: number) => (
                  <a
                    key={ch.id}
                    href={`#chapter-section-${ch.id}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-btn text-small font-sans border border-transparent text-muted hover:text-ink-2"
                  >
                    <span className="font-serif text-accent" style={{ fontVariantNumeric: 'oldstyle-nums' }}>
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
                  <section key={chapter.id} id={`chapter-section-${chapter.id}`} className={idx > 0 ? 'pt-36 md:pt-44' : ''}>
                    <header className="mb-10">
                      {/* Oversized numeral + capped hairline (Option B) */}
                      <div className="flex items-baseline gap-5">
                        <span
                          className="font-serif font-light leading-none tracking-[-0.04em] [font-variant-numeric:oldstyle-nums] text-accent"
                          style={{ fontSize: 'clamp(72px, 8vw, 112px)' }}
                        >
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <div className="flex-1 max-w-[480px] h-[0.5px] bg-hair-strong" />
                      </div>
                      <h3 className="font-serif text-[32px] leading-[1.1] tracking-[-0.015em] font-normal mt-6">
                        {chapter.title}
                      </h3>
                      {chapter.description && (
                        <p className={`mt-[18px] font-serif text-[16px] leading-[1.65] [word-break:keep-all] whitespace-pre-wrap ${subText}`}>
                          {chapter.description}
                        </p>
                      )}
                    </header>
                    <PortfolioChapterItems
                      items={chapter.items || []}
                      allLightboxItems={allLightboxItems}
                      onLightbox={openLightbox}
                    />
                    {chapter.sub_chapters?.map((sub: Chapter, subIdx: number) => (
                      <div key={sub.id} className="mt-space-xl">
                        <div className="mb-5">
                          <p className={`t-eyebrow mb-2 ${microcopy}`}>
                            Section {String(idx + 1).padStart(2, '0')}.{String(subIdx + 1).padStart(2, '0')}.
                          </p>
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
                          allLightboxItems={allLightboxItems}
                          onLightbox={openLightbox}
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
              />
            )}

            {/* 공유 버튼 */}
            <div className="mt-24 pt-10 border-t border-hair">
              <p className={`t-eyebrow mb-5 ${microcopy}`}>{t('portfolio.share')}</p>
              <div className="flex flex-wrap gap-2">
                <>
                  <button
                    title="Facebook"
                    onClick={() => openShareUrl(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl())}`)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-btn border t-caption transition-colors duration-150 border-hair text-faint hover:text-ink-2 hover:border-hair-strong"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </button>
                  <button
                    title="X"
                    onClick={() => openShareUrl(`https://twitter.com/intent/tweet?url=${encodeURIComponent(getShareUrl())}&text=${encodeURIComponent(selectedProject.title)}`)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-btn border t-caption transition-colors duration-150 border-hair text-faint hover:text-ink-2 hover:border-hair-strong"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.632 5.905-5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-btn border t-caption transition-colors duration-150 ${
                      copied
                        ? 'border-hair-strong text-ink-2'
                        : 'border-hair text-faint hover:text-ink-2 hover:border-hair-strong'
                    }`}
                  >
                    {copied ? <Check size={12} strokeWidth={2} /> : <Link2 size={12} strokeWidth={1.5} />}
                  </button>
                </>
              </div>
            </div>

            {/* 댓글 섹션 — 슬러그 기반 상세 페이지에서만 표시 */}
            {selectedProject && (slug || localSelectedProject) && (
              <PortfolioComments
                projectId={selectedProject.id}
                isAuthenticated={isAuthenticated}
                currentUsername={user?.username}
                portfolioOwnerUsername={username ?? ''}
              />
            )}
          </div>
        )}
      </div>

      {/* Lightbox — 전체화면 뷰어는 작품 몰입을 위해 작가/방문자 테마 무관 다크 고정(STEP 7). */}
      {lightboxIndex !== null && activeLightboxItem && (
        <div
          ref={lightboxRef}
          data-theme="dark"
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          className="fixed inset-0 bg-scrim z-50 flex flex-col outline-none"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Thin top bar: chapter title(center), counter, close */}
          <div
            className={`relative shrink-0 flex items-center justify-end px-6 h-10 border-b border-hair transition-opacity duration-500 ${chromeOn ? 'opacity-100' : 'opacity-0'}`}
            onClick={e => e.stopPropagation()}
          >
            <span className="t-eyebrow text-muted truncate max-w-[60%] absolute left-1/2 -translate-x-1/2">{activeLightboxItem.title}</span>
            <div className="flex items-center gap-3 shrink-0">
              <span className="t-numeral text-muted">{lightboxIndex + 1} / {lightboxItems.length}</span>
              <button
                aria-label="닫기"
                onClick={() => setLightboxIndex(null)}
                className="p-1.5 text-muted hover:text-ink hover:bg-hair-strong transition-colors"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Left arrow */}
          {lightboxIndex > 0 && (
            <button
              aria-label="이전 사진"
              className={`absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 text-muted hover:text-ink hover:bg-hair-strong transition-[opacity,color,background] duration-500 ${chromeOn ? 'opacity-100' : 'opacity-0'}`}
              onMouseDown={e => e.preventDefault()}
              onClick={e => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1) }}
            >
              <ChevronLeft size={28} strokeWidth={1.5} />
            </button>
          )}

          {/* Image */}
          <div
            className="flex-1 flex items-center justify-center p-4 overflow-hidden select-none"
            onDoubleClick={zoom.handleDoubleClick}
            onTouchMove={zoom.handleTouchMove}
            onTouchEnd={zoom.handleTouchEnd}
            onClick={e => e.stopPropagation()}
            onContextMenu={e => e.preventDefault()}
          >
            <img
              key={lightboxIndex}
              src={cfLightboxUrl(activeLightboxItem.photo.image_url)}
              alt={activeLightboxItem.photo.caption || ''}
              className="max-h-full max-w-full object-contain animate-[fade_.35s_ease-out]"
              style={zoom.imgStyle}
              draggable={false}
              onTouchStart={e => {
                longPressTimer.current = window.setTimeout(() => setLongPressActive(true), 500)
                ;(e.currentTarget as any)._tx = e.touches[0]?.clientX
              }}
              onTouchEnd={() => {
                if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
              }}
              onMouseDown={() => {
                longPressTimer.current = window.setTimeout(() => setLongPressActive(true), 500)
              }}
              onMouseUp={() => {
                if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
              }}
            />
          </div>

          {/* Right arrow */}
          {lightboxIndex < lightboxItems.length - 1 && (
            <button
              aria-label="다음 사진"
              className={`absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 text-muted hover:text-ink hover:bg-hair-strong transition-[opacity,color,background] duration-500 ${chromeOn ? 'opacity-100' : 'opacity-0'}`}
              onMouseDown={e => e.preventDefault()}
              onClick={e => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1) }}
            >
              <ChevronRight size={28} strokeWidth={1.5} />
            </button>
          )}

          {/* Keyboard hint toast — 첫 진입 시 1회 */}
          {showLightboxHint && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 bg-hair-strong pointer-events-none whitespace-nowrap">
              <span className="t-caption text-muted">← → ESC</span>
            </div>
          )}

          {/* Long-press action sheet */}
          {longPressActive && activeLightboxItem && (
            <div
              className="absolute inset-0 z-20 flex items-end justify-center"
              onClick={() => setLongPressActive(false)}
            >
              <div
                className="w-full max-w-sm mx-4 mb-8 bg-canvas/95 backdrop-blur-md rounded-card overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                <a
                  href={cfUrl(activeLightboxItem.photo.image_url ?? '', 'public')}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center px-5 py-4 t-caption text-ink border-b border-hair hover:bg-hair"
                  onClick={() => setLongPressActive(false)}
                >
                  사진 저장
                </a>
                {activeLightboxItem.photo.caption && (
                  <button
                    className="w-full flex items-center px-5 py-4 t-caption text-ink border-b border-hair hover:bg-hair text-left"
                    onClick={() => { navigator.clipboard.writeText(activeLightboxItem.photo.caption || '').catch(() => {}); setLongPressActive(false) }}
                  >
                    캡션 복사
                  </button>
                )}
                <button
                  className="w-full flex items-center px-5 py-4 t-caption text-muted hover:bg-hair text-left"
                  onClick={() => setLongPressActive(false)}
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 진행 hairline */}
      {selectedProject && (
        <div className="fixed top-0 left-0 right-0 z-30 h-0.5 bg-transparent pointer-events-none">
          <div
            className="h-full transition-[width] duration-150 bg-accent"
            style={{ width: `${scrollProgress * 100}%` }}
          />
        </div>
      )}

      {/* 우측 dot-rail — 챕터 ≥ 2일 때만 표시 */}
      {selectedProject && selectedProject.chapters.length > 1 && lightboxIndex === null && (
        <nav
          className="fixed right-6 z-30 flex flex-col items-center gap-3 px-2 py-3 rounded-full border backdrop-blur-md bg-canvas/85 border-hair-strong"
          style={{ top: '50%', transform: 'translateY(-50%)' }}
          aria-label="챕터 이동"
        >
          {selectedProject.chapters.map((ch: Chapter, i: number) => (
            <button
              key={ch.id}
              onClick={() => scrollToChapter(ch.id)}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium transition-colors
                          ${activeChapterId === ch.id
                            ? 'bg-ink text-canvas'
                            : 'text-muted hover:text-ink'}`}
              aria-label={`${ch.title} 챕터로 이동`}
            >
              {i + 1}
            </button>
          ))}
        </nav>
      )}

      {/* ⬆️ 맨 위로 가기 플로팅 버튼 */}
      {lightboxIndex === null && (
        <button
          id="floating-top-button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-8 right-8 w-10 h-10 bg-edit-ink text-edit-paper rounded-full flex items-center justify-center shadow-deep hover:opacity-80 transition-opacity z-40"
          title="Top"
        >
          <ArrowUp size={16} strokeWidth={1.5} />
        </button>
      )}
    </div>
  )
}
