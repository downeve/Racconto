import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { Sun, Moon, MapPin, X, ChevronLeft, ChevronRight } from 'lucide-react'
import MarkdownRenderer from '../../components/MarkdownRenderer'
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
          {blockPhotos.map(photo => (
            <div
              key={photo.id}
              className="w-full overflow-hidden rounded-photo cursor-pointer"
              onClick={() => onLightbox(photo as Photo, allLightboxItems)}
            >
              <img
                src={cfUrl(photo.image_url, 'grid')}
                alt={photo.caption || ''}
                loading="lazy"
                className="w-full object-cover hover:opacity-90 transition-opacity block"
              />
              {photo.caption && (
                <p className={`text-xs mt-1 px-0.5 ${darkMode ? 'text-stone-400' : 'text-stone-400'}`}>
                  {photo.caption}
                </p>
              )}
            </div>
          ))}
        </div>
      )
    } else {
      elements.push(
        <div
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
            <p className={`text-xs mt-1 px-0.5 ${darkMode ? 'text-stone-400' : 'text-stone-400'}`}>
              {item.caption}
            </p>
          )}
        </div>
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
    project.chapters?.forEach((ch, idx) => {
      ch.items?.filter(i => i.item_type === 'PHOTO').forEach(i => items.push({ photo: i as Photo, title: ch.title }))
      ch.sub_chapters?.forEach((sub) => {
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

  const bg = darkMode ? 'bg-card-surface text-white' : 'bg-[#F7F4F0] text-stone-900'
  const subText = darkMode ? 'text-stone-400' : 'text-stone-500'
  const barBg = darkMode
    ? 'bg-card-surface/95 border-b border-white/10'
    : 'bg-[#F7F4F0]/95 border-b border-stone-200/60'

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
      <div
        className={`sticky top-0 z-10 ${barBg} backdrop-blur-sm`}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          {selectedProject ? (
            <button
              onClick={() => { setSelectedProject(null); window.scrollTo(0, 0) }}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <ChevronLeft size={22} strokeWidth={1.5} />
            </button>
          ) : (
            <div className="min-w-[44px]" />
          )}
          <span className="font-serif text-lg font-semibold">{username}</span>
          <button
            onClick={() => setDarkMode(v => !v)}
            aria-label="다크 모드 전환"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center p-3"
          >
            {darkMode ? <Sun size={18} strokeWidth={1.5} /> : <Moon size={18} strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      <div ref={containerRef} className="px-4">
        {!selectedProject ? (
          // ── 프로젝트 목록 ──────────────────────────────────
          <div className="flex flex-col gap-4 pb-8 pt-4">
            {projects.map(project => (
              <div
                key={project.id}
                className={`rounded-xl overflow-hidden cursor-pointer border shadow-sm hover:shadow transition-shadow ${darkMode ? 'bg-card-cover border-white/10' : 'bg-white border-stone-200/60'}`}
                onClick={() => { setSelectedProject(project); window.scrollTo(0, 0) }}
              >
                {project.cover_image_url ? (
                  <img src={project.cover_image_url} className="w-full aspect-[3/2] object-cover" alt={project.title} />
                ) : (
                  <div className={`w-full aspect-[3/2] flex items-center justify-center ${darkMode ? 'bg-card-cover' : 'bg-stone-100'}`}>
                    <span className={`font-serif text-[3.5rem] leading-none font-light select-none ${darkMode ? 'text-stone-600' : 'text-stone-300'}`}>
                      {project.title.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="p-3">
                  <p className="font-semibold text-sm">{project.title}</p>
                  {project.location && (
                    <p className={`flex items-center gap-1 text-xs mt-1 ${subText}`}>
                      <MapPin size={11} strokeWidth={1.5} />{project.location}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {projects.length === 0 && (
              <EmptyState heading={t('portfolio.noPublicProjects')} darkMode={darkMode} />
            )}
          </div>
        ) : (
          // ── 프로젝트 상세 ──────────────────────────────────
          <div className="pb-12 pt-4">
            {/* 프로젝트 헤더 */}
            <h1 className="text-2xl font-serif font-semibold mb-1">{selectedProject.title}</h1>
            {selectedProject.location && (
              <p className={`flex items-center gap-1 text-xs mb-3 ${subText}`}>
                <MapPin size={12} strokeWidth={1.5} />{selectedProject.location}
              </p>
            )}
            {selectedProject.description && (
              <p className={`text-sm font-serif mb-6 [word-break:keep-all] leading-relaxed ${subText}`}>
                {selectedProject.description}
              </p>
            )}

            {/* 챕터 목록 */}
            {selectedProject.chapters.length > 0 ? (
              <div>
                {selectedProject.chapters.map((chapter, idx) => {
                  const allChapterItems = getAllChapterItems(selectedProject)
                  return (
                    <div key={chapter.id} className={idx > 0 ? 'pt-space-xl' : ''}>
                      {/* 챕터 헤더 */}
                      <div className="mb-5">
                        <div className="mb-1">
                          <h2 className="text-xl font-serif font-bold tracking-tight">{chapter.title}</h2>
                        </div>
                        {chapter.description && (
                          <p className={`text-sm font-serif [word-break:keep-all] leading-relaxed ${subText}`}>
                            {chapter.description}
                          </p>
                        )}
                        <div className={`mt-4 h-px w-10 ${darkMode ? 'bg-stone-700' : 'bg-stone-200'}`} />
                      </div>

                      {/* 챕터 아이템 */}
                      <SimpleMobileItems
                        items={chapter.items || []}
                        darkMode={darkMode}
                        allLightboxItems={allChapterItems}
                        onLightbox={openLightbox}
                      />

                      {/* 서브챕터 */}
                      {chapter.sub_chapters?.map((sub, subIdx) => (
                        <div key={sub.id} className="mt-space-xl">
                          <div className="mb-4">
                            <div className="mb-1">
                              <h3 className="text-base font-serif font-semibold">{sub.title}</h3>
                            </div>
                            {sub.description && (
                              <p className={`text-xs font-serif [word-break:keep-all] leading-relaxed ${subText}`}>
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
          className="fixed inset-0 bg-black/95 z-50 flex flex-col"
          style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex items-center justify-between px-4 py-2 shrink-0">
            <button
              aria-label="닫기"
              onClick={() => setLightboxIndex(null)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <X size={22} strokeWidth={1.5} className="text-white" />
            </button>
            <span className="text-white/60 text-sm">{lightboxIndex + 1} / {lightboxItems.length}</span>
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
                className="absolute left-2 min-w-[44px] min-h-[44px] flex items-center justify-center bg-black/30 rounded-full"
              >
                <ChevronLeft size={22} strokeWidth={1.5} className="text-white" />
              </button>
            )}
            {lightboxIndex < lightboxItems.length - 1 && (
              <button
                aria-label="다음 사진"
                onClick={() => setLightboxIndex(v => v! + 1)}
                className="absolute right-2 min-w-[44px] min-h-[44px] flex items-center justify-center bg-black/30 rounded-full"
              >
                <ChevronRight size={22} strokeWidth={1.5} className="text-white" />
              </button>
            )}
          </div>

          {lightboxItems[lightboxIndex].photo.caption && (
            <div className="shrink-0 px-4 py-2 text-white/60 text-sm text-center">
              {lightboxItems[lightboxIndex].photo.caption}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
