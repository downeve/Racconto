import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { MapPin, X, ChevronLeft } from 'lucide-react'
import CoverFallback from '../../components/CoverFallback'
import EmptyState from '../../components/EmptyState'
import MobilePortfolioChapterItems from '../../components/mobile/MobilePortfolioChapterItems'
import { cfUrl } from '../../utils/cfImage'
import { useActiveChapter } from '../../hooks/useActiveChapter'
import type { PortfolioPhoto } from '../../components/PortfolioChapterItems'

const API = import.meta.env.VITE_API_URL

interface Photo { id: string; image_url: string; caption?: string | null }
interface ChapterItem {
  item_type: 'PHOTO' | 'TEXT'; id?: string; image_url?: string; caption?: string | null
  block_layout?: 'grid' | 'wide' | 'single'; text_content?: string | null
  block_id?: string | null; block_type?: string; order_in_block?: number
}
interface Chapter { id: string; title: string; description: string | null; items: ChapterItem[]; sub_chapters: Chapter[] }
interface PortfolioProject {
  id: string; title: string; description: string | null; cover_image_url: string | null
  location: string | null; updated_at: string | null; photos: Photo[]; chapters: Chapter[]; extra_photos: Photo[]
}

export default function MobilePublicPortfolio() {
  const { username } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated } = useAuth()

  const [projects, setProjects] = useState<PortfolioProject[]>([])
  const [selectedProject, setSelectedProject] = useState<PortfolioProject | null>(null)
  const [darkMode, setDarkMode] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [lightboxItems, setLightboxItems] = useState<{ photo: Photo; title: string }[]>([])
  const [scrollProgress, setScrollProgress] = useState(0)

  const chapterIds = selectedProject?.chapters.map(c => c.id) ?? []
  const activeChapterId = useActiveChapter(chapterIds)

  useEffect(() => {
    if ((location.state as { resetToList?: boolean } | null)?.resetToList) setSelectedProject(null)
  }, [location])

  useEffect(() => {
    if (!isAuthenticated && username === '@setup') navigate('/', { replace: true })
  }, [isAuthenticated, username, navigate])

  useEffect(() => {
    if (!username || username === '@setup') { setNotFound(false); return }
    axios.get(`${API}/portfolio/${username}`)
      .then(res => {
        setProjects(res.data.projects)
        const apiIsDark = res.data.theme === 'dark'
        const saved = localStorage.getItem(`portfolio_theme_${username}`)
        setDarkMode(saved !== null ? saved === 'dark' : apiIsDark)
      })
      .catch(err => { if (err.response?.status === 404) setNotFound(true) })
  }, [username])

  // scroll progress
  useEffect(() => {
    if (!selectedProject) return
    const handleScroll = () => {
      const docH = document.documentElement.scrollHeight
      const viewH = window.innerHeight
      const progress = docH <= viewH ? 0 : Math.min(1, window.scrollY / (docH - viewH))
      setScrollProgress(progress)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [selectedProject])

  const scrollToChapter = (id: string) => {
    const el = document.getElementById(`chapter-section-${id}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const getAllChapterItems = (project: PortfolioProject) => {
    const items: { photo: Photo; title: string }[] = []
    project.chapters?.forEach((ch) => {
      ch.items?.filter(i => i.item_type === 'PHOTO').forEach(i => items.push({ photo: i as Photo, title: ch.title }))
      ch.sub_chapters?.forEach(sub => {
        sub.items?.filter(i => i.item_type === 'PHOTO').forEach(i => items.push({ photo: i as Photo, title: sub.title }))
      })
    })
    return items
  }

  const openLightbox = (photo: Photo, items: { photo: Photo; title: string }[]) => {
    const idx = items.findIndex(item => item.photo.id === photo.id)
    setLightboxItems(items)
    setLightboxIndex(idx !== -1 ? idx : 0)
  }

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

      {/* 진행 hairline */}
      {selectedProject && (
        <div className="fixed top-0 left-0 right-0 z-30 h-0.5 bg-transparent pointer-events-none">
          <div
            className="h-full bg-accent transition-[width] duration-200"
            style={{ width: `${scrollProgress * 100}%` }}
          />
        </div>
      )}

      {/* floating back button (상세 화면) */}
      {selectedProject && (
        <button
          onClick={() => { setSelectedProject(null); window.scrollTo(0, 0) }}
          className={`fixed left-3 z-20 w-9 h-9 rounded-full border flex items-center justify-center
                      ${darkMode
                        ? 'bg-d-bg/85 border-d-line'
                        : 'bg-canvas/85 border-hair/60'}
                      backdrop-blur-md`}
          style={{ top: 'calc(env(safe-area-inset-top) + 14px)' }}
          aria-label="뒤로 가기"
        >
          <ChevronLeft size={16} strokeWidth={1.5} />
        </button>
      )}

      {/* 우측 dot-rail (챕터 점프, 상세 화면) */}
      {selectedProject && selectedProject.chapters.length > 1 && (
        <nav
          className={`fixed left-1/2 -translate-x-1/2 z-10 flex flex-row items-center gap-3 px-3 py-2
                       rounded-full border backdrop-blur-md
                       ${darkMode ? 'bg-d-bg/85 border-d-line' : 'bg-canvas/85 border-hair/60'}`}
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}
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
        {!selectedProject ? (
          // ── 프로젝트 목록 ──────────────────────────────────
          <>
            <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 48px)' }} className="pb-6">
              <p className={`t-eyebrow mb-3 ${microcopy}`}>
                Portfolio
                {projects.length > 0 && <span className="ml-2 opacity-70">· {projects.length} {projects.length === 1 ? 'project' : 'projects'}</span>}
              </p>
              <h1 className="font-serif font-normal leading-[1.05] tracking-[-0.02em]" style={{ fontSize: 'clamp(24px, 6vw, 32px)' }}>
                @{username}
              </h1>
            </div>
            <div className="flex flex-col gap-12 pb-16">
              {projects.map(project => (
                <article
                  key={project.id}
                  className="cursor-pointer group"
                  onClick={() => { setSelectedProject(project); window.scrollTo(0, 0) }}
                >
                  <div className={`aspect-[4/5] overflow-hidden ${darkMode ? 'bg-d-surface' : 'bg-[oklch(0.92_0.012_75)]'}`}>
                    {project.cover_image_url ? (
                      <img
                        src={cfUrl(project.cover_image_url, 'cover')}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                        alt={project.title}
                      />
                    ) : (
                      <CoverFallback title={project.title} dark={darkMode} />
                    )}
                  </div>
                  <h3 className="mt-3 font-serif text-[18px] tracking-tight font-normal [word-break:keep-all]">
                    {project.title}
                  </h3>
                  {project.location && (
                    <p className={`t-loc mt-1.5 ${subText}`}>
                      <MapPin size={10} strokeWidth={1.5} />{project.location}
                    </p>
                  )}
                </article>
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
              </div>
              <h1 className="font-serif text-[38px] font-normal leading-[1.05] tracking-[-0.02em] [word-break:keep-all]">
                {selectedProject.title}
              </h1>
              {selectedProject.description && (
                <p className={`font-serif text-[17px] leading-[1.75] mt-7 [word-break:keep-all] whitespace-pre-wrap ${subText}`}>
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
                          <span className={`font-serif text-[52px] font-light tracking-[-0.04em] leading-none ${darkMode ? 'text-d-soft' : 'text-accent'}`}>
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <div className={`flex-1 h-px ${darkMode ? 'bg-d-line' : 'bg-hair'}`} />
                        </div>
                        <h2 className="font-serif text-[28px] leading-[1.12] tracking-[-0.015em] font-normal [word-break:keep-all]">
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
                        allLightboxItems={allChapterItems as { photo: PortfolioPhoto; title: string }[]}
                        darkMode={darkMode}
                        onLightbox={(photo, items) => openLightbox(photo as unknown as Photo, items as { photo: Photo; title: string }[])}
                      />

                      {/* 서브챕터 */}
                      {chapter.sub_chapters?.map((sub) => (
                        <div key={sub.id} className="mt-14">
                          <div className="mb-5">
                            <p className={`t-eyebrow mb-2 ${microcopy}`}>Section</p>
                            <h3 className="font-serif text-[20px] tracking-tight font-normal [word-break:keep-all]">{sub.title}</h3>
                            {sub.description && (
                              <p className={`text-sm font-serif mt-1.5 [word-break:keep-all] whitespace-pre-wrap leading-relaxed ${subText}`}>
                                {sub.description}
                              </p>
                            )}
                          </div>
                          <MobilePortfolioChapterItems
                            items={sub.items || []}
                            allLightboxItems={allChapterItems as { photo: PortfolioPhoto; title: string }[]}
                            darkMode={darkMode}
                            onLightbox={(photo, items) => openLightbox(photo as unknown as Photo, items as { photo: Photo; title: string }[])}
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
              src={cfUrl(lightboxItems[lightboxIndex].photo.image_url, 'public')}
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
                    src={cfUrl(item.photo.image_url, 'grid')}
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
