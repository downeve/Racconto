import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { Sun, Moon, MapPin, X, ChevronLeft, ChevronRight } from 'lucide-react'
import CoverFallback from '../../components/CoverFallback'
import MarkdownRenderer from '../../components/MarkdownRenderer'
import PhotoReveal from '../../components/PhotoReveal'
import EmptyState from '../../components/EmptyState'
import { cfUrl } from '../../utils/cfImage'

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
  location: string | null; photos: Photo[]; chapters: Chapter[]; extra_photos: Photo[]
}

// ── 심플 아이템 렌더러 ────────────────────────────────────────
interface SimpleItemsProps {
  items: ChapterItem[]
  darkMode: boolean
  allLightboxItems: { photo: Photo; title: string }[]
  onLightbox: (photo: Photo, items: { photo: Photo; title: string }[]) => void
}

function SimpleMobileItems({ items, darkMode, allLightboxItems, onLightbox }: SimpleItemsProps) {
  const rendered = new Set<string>()
  const elements: React.ReactNode[] = []

  items.forEach((item, i) => {
    if (item.item_type === 'TEXT') {
      elements.push(
        <div key={`text-${i}`} className="my-5">
          <MarkdownRenderer
            content={item.text_content || ''}
            darkMode={darkMode}
            className="leading-[2.1] [word-break:keep-all] font-serif text-sm"
          />
        </div>
      )
      return
    }

    const bid = item.block_id
    if (bid) {
      if (rendered.has(bid)) return
      rendered.add(bid)

      const blockPhotos = items
        .filter(p => p.item_type === 'PHOTO' && p.block_id === bid)
        .sort((a, b) => (a.order_in_block ?? 0) - (b.order_in_block ?? 0))

      elements.push(
        <div key={`block-${bid}`} className="space-y-2 mb-2">
          {blockPhotos.map((photo, pi) => (
            <PhotoReveal
              key={photo.id}
              className="w-full overflow-hidden rounded-photo cursor-pointer"
              delay={pi * 60}
              onClick={() => onLightbox(photo as Photo, allLightboxItems)}
            >
              <img
                src={cfUrl(photo.image_url, 'grid')}
                alt={photo.caption || ''}
                loading="lazy"
                className="w-full object-cover hover:opacity-90 transition-opacity block"
              />
              {photo.caption && (
                <p className={`t-caption mt-2.5 ${darkMode ? 'text-d-faint' : 'text-faint'}`}>
                  {photo.caption}
                </p>
              )}
            </PhotoReveal>
          ))}
        </div>
      )
    } else {
      elements.push(
        <PhotoReveal
          key={`photo-${item.id ?? i}`}
          className="w-full overflow-hidden rounded-photo cursor-pointer mb-2"
          onClick={() => onLightbox(item as Photo, allLightboxItems)}
        >
          <img
            src={cfUrl(item.image_url, 'grid')}
            alt={item.caption || ''}
            loading="lazy"
            className="w-full object-cover hover:opacity-90 transition-opacity block"
          />
          {item.caption && (
            <p className={`t-caption mt-2.5 ${darkMode ? 'text-d-faint' : 'text-faint'}`}>
              {item.caption}
            </p>
          )}
        </PhotoReveal>
      )
    }
  })

  return <>{elements}</>
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────

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
  const containerRef = useRef<HTMLDivElement>(null)

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
        setDarkMode(res.data.theme === 'dark')
      })
      .catch(err => { if (err.response?.status === 404) setNotFound(true) })
  }, [username])

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

  const bg       = darkMode ? 'bg-d-bg text-d-hair'  : 'bg-canvas text-ink'
  const subText  = darkMode ? 'text-d-soft'          : 'text-muted'
  const microcopy = darkMode ? 'text-d-faint'        : 'text-faint'
  const barBg    = darkMode
    ? 'bg-d-bg/85 border-b border-d-line'
    : 'bg-canvas/85 border-b border-hair/60'

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
      {/* Sticky top bar */}
      <header
        className={`sticky top-0 z-10 ${barBg} backdrop-blur-md`}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="h-12 px-3 flex items-center justify-between">
          {selectedProject ? (
            <button
              onClick={() => { setSelectedProject(null); window.scrollTo(0, 0) }}
              className="min-w-11 min-h-11 flex items-center justify-center -ml-2 opacity-70"
            >
              <ChevronLeft size={20} strokeWidth={1.5} />
            </button>
          ) : (
            <span className="w-11" />
          )}
          <button
            onClick={() => setDarkMode(v => !v)}
            aria-label="다크 모드 전환"
            className="min-w-11 min-h-11 flex items-center justify-center opacity-60"
          >
            {darkMode ? <Sun size={16} strokeWidth={1.5} /> : <Moon size={16} strokeWidth={1.5} />}
          </button>
        </div>
      </header>

      <div ref={containerRef} className="px-4">
        {!selectedProject ? (
          // ── 프로젝트 목록 ──────────────────────────────────
          <>
          <section className="pt-10 pb-6">
            <p className={`t-eyebrow mb-1.5 ${microcopy}`}>Portfolio</p>
            <h1 className="font-serif text-[28px] leading-[1.05] tracking-tight font-normal">
              @{username}
            </h1>
          </section>
          <div className="flex flex-col gap-12 pb-8">
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
          // ── 프로젝트 상세 ──────────────────────────────────
          <div className="pb-12 pt-4">
            {/* 프로젝트 헤더 */}
            <p className={`t-eyebrow mb-1.5 ${microcopy}`}>Portfolio</p>
            <h1 className="font-serif text-[26px] leading-[1.1] font-normal tracking-tight mb-2 [word-break:keep-all]">
              {selectedProject.title}
            </h1>
            {selectedProject.location && (
              <p className={`t-loc mb-5 ${subText}`}>
                <MapPin size={10} strokeWidth={1.5} />{selectedProject.location}
              </p>
            )}
            {selectedProject.description && (
              <p className={`font-serif text-[15px] leading-[1.65] italic mb-6 [word-break:keep-all] ${subText}`}>
                {selectedProject.description}
              </p>
            )}

            {/* 챕터 목록 */}
            {selectedProject.chapters.length > 0 ? (
              <div>
                {selectedProject.chapters.map((chapter, idx) => {
                  const allChapterItems = getAllChapterItems(selectedProject)
                  return (
                    <div key={chapter.id} className={idx > 0 ? 'pt-24' : ''}>
                      {/* 챕터 헤더 */}
                      <div className="mb-5">
                        <p className={`t-eyebrow mb-1.5 ${microcopy}`}>Chapter</p>
                        <h2 className="font-serif text-[22px] tracking-tight font-normal [word-break:keep-all]">{chapter.title}</h2>
                        {chapter.description && (
                          <p className={`text-sm font-serif mt-2 [word-break:keep-all] leading-relaxed ${subText}`}>
                            {chapter.description}
                          </p>
                        )}
                      </div>

                      {/* 챕터 아이템 */}
                      <SimpleMobileItems
                        items={chapter.items || []}
                        darkMode={darkMode}
                        allLightboxItems={allChapterItems}
                        onLightbox={openLightbox}
                      />

                      {/* 서브챕터 */}
                      {chapter.sub_chapters?.map((sub) => (
                        <div key={sub.id} className="mt-16">
                          <div className="mb-4">
                            <p className={`t-eyebrow mb-1.5 ${microcopy}`}>Section</p>
                            <h3 className="font-serif text-[18px] tracking-tight font-medium [word-break:keep-all]">{sub.title}</h3>
                            {sub.description && (
                              <p className={`text-xs font-serif mt-1.5 [word-break:keep-all] leading-relaxed ${subText}`}>
                                {sub.description}
                              </p>
                            )}
                          </div>
                          <SimpleMobileItems
                            items={sub.items || []}
                            darkMode={darkMode}
                            allLightboxItems={allChapterItems}
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
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && lightboxItems[lightboxIndex] && (
        <div
          className="fixed inset-0 bg-[oklch(0.12_0.012_60/0.98)] z-50 flex flex-col"
          style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex items-center justify-between px-4 py-2 shrink-0">
            <button
              aria-label="닫기"
              onClick={() => setLightboxIndex(null)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <X size={22} strokeWidth={1.5} className="text-d-faint" />
            </button>
            <span className="t-numeral text-d-faint">{lightboxIndex + 1} / {lightboxItems.length}</span>
            <div className="w-[44px]" />
          </div>

          <div
            className="flex-1 flex items-center justify-center relative"
            onTouchStart={e => { (e.currentTarget as any)._tx = e.touches[0].clientX }}
            onTouchEnd={e => {
              const startX = (e.currentTarget as any)._tx ?? 0
              const delta = e.changedTouches[0].clientX - startX
              if (delta < -50 && lightboxIndex < lightboxItems.length - 1) setLightboxIndex(v => v! + 1)
              if (delta > 50 && lightboxIndex > 0) setLightboxIndex(v => v! - 1)
            }}
          >
            <img
              src={lightboxItems[lightboxIndex].photo.image_url}
              alt={lightboxItems[lightboxIndex].photo.caption || ''}
              style={{ width: '100%', height: '100dvh', objectFit: 'contain' }}
              draggable={false}
            />
            {lightboxIndex > 0 && (
              <button
                aria-label="이전 사진"
                onClick={() => setLightboxIndex(v => v! - 1)}
                className="absolute left-2 min-w-[44px] min-h-[44px] flex items-center justify-center bg-d-line/50"
              >
                <ChevronLeft size={22} strokeWidth={1.5} className="text-d-faint" />
              </button>
            )}
            {lightboxIndex < lightboxItems.length - 1 && (
              <button
                aria-label="다음 사진"
                onClick={() => setLightboxIndex(v => v! + 1)}
                className="absolute right-2 min-w-[44px] min-h-[44px] flex items-center justify-center bg-d-line/50"
              >
                <ChevronRight size={22} strokeWidth={1.5} className="text-d-faint" />
              </button>
            )}
          </div>

          {lightboxItems[lightboxIndex].photo.caption && (
            <div className="shrink-0 px-4 py-2 text-center">
              <span className="t-caption text-d-faint">
                {lightboxItems[lightboxIndex].photo.caption}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
