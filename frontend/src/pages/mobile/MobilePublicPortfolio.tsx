import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { MapPin, X, ChevronLeft, Link2, Check } from 'lucide-react'
import EmptyState from '../../components/EmptyState'
import PublicNavbar from '../../components/PublicNavbar'
import FollowButton from '../../components/FollowButton'
import PortfolioListCard from '../../components/PortfolioListCard'
import PortfolioListBanner from '../../components/PortfolioListBanner'
import PortfolioComments from '../../components/PortfolioComments'
import MobilePortfolioChapterItems from '../../components/mobile/MobilePortfolioChapterItems'
import { cfUrl, cfLightboxUrl } from '../../utils/cfImage'
import { useActiveChapter } from '../../hooks/useActiveChapter'
import type { PortfolioPhoto } from '../../components/PortfolioChapterItems'

const API = import.meta.env.VITE_API_URL

interface ChapterItem {
  item_type: 'PHOTO' | 'TEXT'; id?: string; image_url?: string; caption?: string | null
  block_layout?: 'grid' | 'wide' | 'single'; text_content?: string | null
  block_id?: string | null; block_type?: string; order_in_block?: number
}
interface Chapter { id: string; title: string; description: string | null; items: ChapterItem[]; sub_chapters: Chapter[] }
interface PortfolioProject {
  id: string; title: string; description: string | null; cover_image_url: string | null
  location: string | null; updated_at: string | null; slug: string | null
  view_count?: number
  photos: PortfolioPhoto[]; chapters: Chapter[]; extra_photos: PortfolioPhoto[]
}

export default function MobilePublicPortfolio() {
  const { username, slug } = useParams<{ username: string; slug?: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, user } = useAuth()

  const [localSelectedProject, setLocalSelectedProject] = useState<PortfolioProject | null>(null)
  const [darkMode, setDarkMode] = useState(false)

  const enabled = !!username && username !== '@setup'
  const { data: portfolioData, isError: listError } = useQuery({
    queryKey: ['portfolio', username],
    queryFn: async () => (await axios.get(`${API}/portfolio/${username}`)).data,
    enabled: enabled && !slug,
    staleTime: 1000 * 60 * 5,
    retry: (_count, err) => !axios.isAxiosError(err) || err.response?.status !== 404,
  })
  const { data: slugData, isError: slugError } = useQuery({
    queryKey: ['portfolioSlug', username, slug],
    queryFn: async () => (await axios.get(`${API}/portfolio/${username}/${slug}`)).data,
    enabled: enabled && !!slug,
    staleTime: 1000 * 60 * 5,
    retry: (_count, err) => !axios.isAxiosError(err) || err.response?.status !== 404,
  })
  const projects = useMemo<PortfolioProject[]>(() => portfolioData?.projects ?? [], [portfolioData])
  const selectedProject: PortfolioProject | null = slug
    ? ((slugData?.project ?? null) as PortfolioProject | null)
    : localSelectedProject
  const notFound = listError || slugError
  // 상세 의도 여부 — slug 또는 로컬 선택. slug 로딩 중에도 detail 모드로 간주해
  // 목록↔미니멀 navbar 깜빡임을 방지.
  const isDetailRoute = !!slug || !!localSelectedProject
  // slug 상세 로딩 중(아직 데이터·에러 모두 없음) — 이 동안 목록/EmptyState 대신 로딩 표시.
  const slugPending = !!slug && !selectedProject && !slugError
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [lightboxItems, setLightboxItems] = useState<{ photo: PortfolioPhoto; title: string }[]>([])
  const [copied, setCopied] = useState(false)

  const getShareUrl = useCallback(() => {
    if (selectedProject?.slug) {
      return `${window.location.origin}/${username}/${selectedProject.slug}`
    }
    return window.location.href
  }, [selectedProject, username])

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(getShareUrl()).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [getShareUrl])

  const openShareUrl = useCallback((url: string) => {
    window.open(url, '_blank', 'width=600,height=500,noopener,noreferrer')
  }, [])
  const [scrollProgress, setScrollProgress] = useState(0)
  const [isScrolling, setIsScrolling] = useState(false)
  const [isTouchingRail, setIsTouchingRail] = useState(false)
  const scrollEndTimerRef = useRef<number | null>(null)

  const chapterIds = selectedProject?.chapters.map(c => c.id) ?? []
  const activeChapterId = useActiveChapter(chapterIds)

  useEffect(() => {
    if ((location.state as { resetToList?: boolean } | null)?.resetToList) setLocalSelectedProject(null)
  }, [location.state])

  // slug 기반 네비게이션(목록→상세, 상세→상세, 상세→목록)은 react-router Link 라
  // 스크롤 위치가 유지된다(MobileInfoApp 엔 전역 ScrollToTop 없음). slug 변경 시 최상단 복귀.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [slug])

  useEffect(() => {
    if (!isAuthenticated && username === '@setup') navigate('/', { replace: true })
  }, [isAuthenticated, username, navigate])

  const applyTheme = useCallback((apiTheme: string) => {
    const saved = localStorage.getItem(`portfolio_theme_${username}`)
    setDarkMode(saved !== null ? saved === 'dark' : apiTheme === 'dark')
  }, [username])

  useEffect(() => {
    if (portfolioData?.theme) applyTheme(portfolioData.theme)
  }, [portfolioData, applyTheme])

  useEffect(() => {
    if (slugData?.theme) applyTheme(slugData.theme)
  }, [slugData, applyTheme])

  // 브라우저 탭 제목 — 개별 프로젝트면 프로젝트 제목, 작가 페이지면 @username
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
    setDarkMode(prev => {
      const next = !prev
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

  // scroll progress + dot-rail scroll 감지
  useEffect(() => {
    if (!selectedProject) return
    const handleScroll = () => {
      const docH = document.documentElement.scrollHeight
      const viewH = window.innerHeight
      const progress = docH <= viewH ? 0 : Math.min(1, window.scrollY / (docH - viewH))
      setScrollProgress(progress)
      setIsScrolling(true)
      if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current)
      scrollEndTimerRef.current = window.setTimeout(() => setIsScrolling(false), 400)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current)
    }
  }, [selectedProject])

  const scrollToChapter = (id: string) => {
    const el = document.getElementById(`chapter-section-${id}`)
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' })
  }

  const getAllChapterItems = (project: PortfolioProject) => {
    const items: { photo: PortfolioPhoto; title: string }[] = []
    project.chapters?.forEach((ch) => {
      ch.items?.filter(i => i.item_type === 'PHOTO').forEach(i => items.push({ photo: i as PortfolioPhoto, title: ch.title }))
      ch.sub_chapters?.forEach(sub => {
        sub.items?.filter(i => i.item_type === 'PHOTO').forEach(i => items.push({ photo: i as PortfolioPhoto, title: sub.title }))
      })
    })
    return items
  }

  const openLightbox = (photo: PortfolioPhoto, items: { photo: PortfolioPhoto; title: string }[]) => {
    const idx = items.findIndex(item => item.photo.id === photo.id)
    setLightboxItems(items)
    setLightboxIndex(idx !== -1 ? idx : 0)
  }

  // 인접 이미지 preload — 앞 1장 + 뒤 2장 (PublicPortfolio 와 동일 패턴)
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

  const bg      = darkMode ? 'bg-d-bg text-d-hair'  : 'bg-canvas text-ink'
  const subText = darkMode ? 'text-d-soft'           : 'text-muted'
  const microcopy = darkMode ? 'text-d-faint'        : 'text-faint'

  if (notFound) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${bg}`}>
        <EmptyState
          heading={t('portfolio.notFound') || '포트폴리오를 찾을 수 없습니다.'}
          darkMode={darkMode}
        />
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${bg}`}>

      {/* PublicNavbar — 목록·로그아웃 상세 모두 동일하게 미니멀(로고 + 다크토글)만.
          (로그인 상세는 navbar 없이 좌상단 floating back 사용) */}
      {(!isDetailRoute || !isAuthenticated) && (
        <PublicNavbar
          darkMode={darkMode}
          portfolio
          compactLogo
          minimal
          onToggleDark={handleToggleDark}
        />
      )}

      {/* 진행 hairline */}
      {selectedProject && (
        <div className="fixed top-0 left-0 right-0 z-30 h-0.5 bg-transparent pointer-events-none">
          <div
            className="h-full bg-accent transition-[width] duration-200"
            style={{ width: `${scrollProgress * 100}%` }}
          />
        </div>
      )}

      {/* floating back button — 로그인 상세 전용(상단 navbar 없음).
          로그아웃 상세는 미니멀 navbar + 보조 행(@username)이 복귀를 담당하므로 미표시(로고 겹침 방지). */}
      {selectedProject && isAuthenticated && (() => {
        const fromExplore = (location.state as { from?: string } | null)?.from === '/explore'
        const baseTheme = darkMode ? 'bg-d-bg/85 border-d-line' : 'bg-canvas/85 border-hair/60'
        return (
          <button
            onClick={goBackToList}
            className={
              fromExplore
                ? `fixed left-3 z-20 h-9 px-3 inline-flex items-center gap-1 rounded-full border text-small ${baseTheme} backdrop-blur-md`
                : `fixed left-3 z-20 w-9 h-9 rounded-full border flex items-center justify-center ${baseTheme} backdrop-blur-md`
            }
            style={{ top: 'calc(env(safe-area-inset-top) + 14px)' }}
            aria-label={fromExplore ? t('explore.menu') : '뒤로 가기'}
          >
            <ChevronLeft size={16} strokeWidth={1.5} />
            {fromExplore && <span>{t('explore.menu')}</span>}
          </button>
        )
      })()}

      {/* 우측 dot-rail (챕터 점프, 상세 화면) */}
      {selectedProject && selectedProject.chapters.length > 1 && (
        <nav
          className={`fixed left-1/2 -translate-x-1/2 z-10 flex flex-row items-center gap-3 px-3 py-2
                       rounded-full border backdrop-blur-md transition-opacity duration-300
                       ${darkMode ? 'bg-d-bg/85 border-d-line' : 'bg-canvas/85 border-hair/60'}`}
          style={{
            bottom: 'calc(env(safe-area-inset-bottom) + 24px)',
            opacity: isTouchingRail ? 1 : isScrolling ? 0.35 : 0.55,
          }}
          onTouchStart={() => setIsTouchingRail(true)}
          onTouchEnd={() => setIsTouchingRail(false)}
          onTouchCancel={() => setIsTouchingRail(false)}
          aria-label="챕터 이동"
        >
          {selectedProject.chapters.map((ch, i) => (
            <button
              key={ch.id}
              onClick={() => scrollToChapter(ch.id)}
              className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-medium transition-colors
                          ${activeChapterId === ch.id
                            ? darkMode ? 'bg-d-hair text-d-bg' : 'bg-ink text-canvas'
                            : darkMode ? 'text-d-soft' : 'text-muted'}`}
              aria-label={`${ch.title} 챕터로 이동`}
            >
              {i + 1}
            </button>
          ))}
        </nav>
      )}

      <div className="px-[22px]">
        {slugPending ? (
          // ── slug 상세 로딩 중 — 목록/EmptyState 깜빡임 방지용 로딩 표시 ──
          <div
            style={{ paddingTop: 'calc(env(safe-area-inset-top) + 90px)' }}
            className="flex justify-center"
          >
            <span className={`t-caption ${subText}`}>{t('common.loading')}</span>
          </div>
        ) : !selectedProject ? (
          // ── 프로젝트 목록 ──────────────────────────────────
          <>
            <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 72px)' }} className="pb-6">
              <PortfolioListBanner
                eyebrow={`Portfolio${projects.length > 0
                  ? ` · ${projects.length} ${projects.length === 1 ? 'project' : 'projects'}`
                  : ''}`}
                title={`@${username}`}
                darkMode={darkMode}
              />
              {isAuthenticated && user?.username && user.username !== username && (
                <div className="-mt-8 mb-8">
                  <FollowButton username={username!} darkMode={darkMode} />
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 gap-12 pb-16">
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
                  darkMode={darkMode}
                />
              ))}
              {projects.length === 0 && (
                <EmptyState heading={t('portfolio.noPublicProjects')} darkMode={darkMode} />
              )}
            </div>
          </>
        ) : (
          // ── 프로젝트 상세 — V2 Document Reader ────────────
          <div className="pb-16">
            {/* 프로젝트 헤더 */}
            <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 90px)' }}>
              <div className={`flex flex-wrap items-center gap-3 t-caption mb-4 ${subText}`}>
                {selectedProject.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={11} strokeWidth={1.5} />
                    {selectedProject.location}
                  </span>
                )}
                {selectedProject.location && <span className="w-[3px] h-[3px] rounded-full bg-faint dark:bg-d-faint" />}
                <span>{selectedProject.chapters.length} chapters</span>
                {typeof selectedProject.view_count === 'number' && (
                  <>
                    <span className="w-[3px] h-[3px] rounded-full bg-faint dark:bg-d-faint" />
                    <span>{selectedProject.view_count.toLocaleString()} {t('portfolio.views')}</span>
                  </>
                )}
              </div>
              <h1 className="font-serif text-[32px] font-normal leading-[1.05] tracking-[-0.02em] [word-break:keep-all]">
                {selectedProject.title}
              </h1>
              {selectedProject.description && (
                <p className={`font-serif text-[15px] leading-[1.75] mt-7 [word-break:keep-all] whitespace-pre-wrap ${subText}`}>
                  {selectedProject.description}
                </p>
              )}
            </div>

            {/* 챕터 목록 */}
            {selectedProject.chapters.length > 0 ? (
              <div className="mt-16">
                {selectedProject.chapters.map((chapter, idx) => {
                  const allChapterItems = getAllChapterItems(selectedProject)
                  return (
                    <div
                      key={chapter.id}
                      id={`chapter-section-${chapter.id}`}
                      className={idx > 0 ? 'pt-20' : ''}
                    >
                      {/* 챕터 헤더 — oversized number + hairline + serif title */}
                      <header className="mb-8">
                        <div className="flex items-baseline gap-3.5 mb-3.5">
                          <span className={`font-serif text-[44px] font-light tracking-[-0.04em] leading-none ${darkMode ? 'text-d-soft' : 'text-accent'}`}>
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <div className={`flex-1 h-px ${darkMode ? 'bg-d-line' : 'bg-hair'}`} />
                        </div>
                        <h2 className="font-serif text-[24px] leading-[1.12] tracking-[-0.015em] font-normal [word-break:keep-all]">
                          {chapter.title}
                        </h2>
                        {chapter.description && (
                          <p className={`font-serif text-[15px] italic leading-[1.7] mt-3 [word-break:keep-all] ${subText}`}>
                            {chapter.description}
                          </p>
                        )}
                      </header>

                      {/* 챕터 아이템 */}
                      <MobilePortfolioChapterItems
                        items={chapter.items || []}
                        allLightboxItems={allChapterItems}
                        darkMode={darkMode}
                        onLightbox={openLightbox}
                      />

                      {/* 서브챕터 */}
                      {chapter.sub_chapters?.map((sub) => (
                        <div key={sub.id} className="mt-14">
                          <div className="mb-5">
                            <p className={`t-eyebrow mb-2 ${microcopy}`}>Section</p>
                            <h3 className="font-serif text-[18px] tracking-tight font-normal [word-break:keep-all]">{sub.title}</h3>
                            {sub.description && (
                              <p className={`text-sm font-serif mt-1.5 [word-break:keep-all] whitespace-pre-wrap leading-relaxed ${subText}`}>
                                {sub.description}
                              </p>
                            )}
                          </div>
                          <MobilePortfolioChapterItems
                            items={sub.items || []}
                            allLightboxItems={allChapterItems}
                            darkMode={darkMode}
                            onLightbox={openLightbox}
                          />
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            ) : (
              <EmptyState heading={t('portfolio.noChapters')} darkMode={darkMode} />
            )}

            {/* 공유 버튼 */}
            <div className={`mt-20 pt-8 border-t ${darkMode ? 'border-d-line' : 'border-hair'}`}>
              <p className={`t-eyebrow mb-5 ${microcopy}`}>{t('portfolio.share')}</p>
              <div className="flex flex-wrap gap-2">
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
              </div>
            </div>

            {/* 댓글 섹션 — 슬러그 기반 상세 페이지에서만 표시 */}
            {selectedProject && (slug || localSelectedProject) && (
              <div style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 48px)' }}>
                <PortfolioComments
                  projectId={selectedProject.id}
                  darkMode={darkMode}
                  isAuthenticated={isAuthenticated}
                  currentUsername={user?.username}
                  portfolioOwnerUsername={username ?? ''}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox — filmstrip (Phase 4 mobile) */}
      {lightboxIndex !== null && lightboxItems[lightboxIndex] && (
        <div
          className="fixed inset-0 bg-[oklch(0.12_0.012_60/0.98)] z-50 flex flex-col"
          style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {/* 상단: 닫기 + italic 캡션 */}
          <div className="flex items-center justify-between px-4 shrink-0 h-11">
            <button
              aria-label="닫기"
              onClick={() => setLightboxIndex(null)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <X size={20} strokeWidth={1.5} className="text-d-faint" />
            </button>
            <span className="font-serif italic text-[13px] text-d-faint/70 text-center px-2 truncate flex-1">
              {lightboxItems[lightboxIndex].photo.caption || lightboxItems[lightboxIndex].title}
            </span>
            <div className="w-[44px]" />
          </div>

          {/* 메인 이미지 (스와이프) */}
          <div
            className="flex-1 flex items-center justify-center overflow-hidden"
            onTouchStart={e => { (e.currentTarget as any)._tx = e.touches[0].clientX }}
            onTouchEnd={e => {
              const startX = (e.currentTarget as any)._tx ?? 0
              const delta = e.changedTouches[0].clientX - startX
              if (delta < -50 && lightboxIndex < lightboxItems.length - 1) setLightboxIndex(v => v! + 1)
              if (delta > 50 && lightboxIndex > 0) setLightboxIndex(v => v! - 1)
            }}
          >
            <img
              src={cfLightboxUrl(lightboxItems[lightboxIndex].photo.image_url)}
              alt={lightboxItems[lightboxIndex].photo.caption || ''}
              style={{ width: '100%', maxHeight: '100%', objectFit: 'contain' }}
              draggable={false}
            />
          </div>

          {/* 하단 filmstrip */}
          <div className="shrink-0 h-[72px] flex items-center">
            <div className="overflow-x-auto flex gap-1 px-3 w-full snap-x snap-mandatory scroll-px-3">
              {lightboxItems.map((item, i) => (
                <button
                  key={i}
                  onClick={() => setLightboxIndex(i)}
                  className="shrink-0 snap-start"
                  style={{
                    width: 56, height: 56,
                    opacity: i === lightboxIndex ? 1 : 0.55,
                    outline: i === lightboxIndex ? '2px solid #8C4A1F' : 'none',
                    outlineOffset: 1,
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={cfUrl(item.photo.image_url ?? '', 'grid')}
                    alt=""
                    className="w-full h-full object-cover block"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
