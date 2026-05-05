import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { Sun, Moon, MapPin, X, ChevronLeft, ChevronRight } from 'lucide-react'
import MobilePortfolioChapterItems from '../../components/mobile/MobilePortfolioChapterItems'

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
  const [containerWidth, setContainerWidth] = useState(0)
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

  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      setContainerWidth(entries[0].contentRect.width)
    })
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const getAllChapterItems = (project: PortfolioProject) => {
    const items: { photo: Photo; title: string }[] = []
    project.chapters?.forEach((ch, idx) => {
      const chTitle = `${idx + 1}. ${ch.title}`
      ch.items?.filter(i => i.item_type === 'PHOTO').forEach(i => items.push({ photo: i as Photo, title: chTitle }))
      ch.sub_chapters?.forEach((sub, subIdx) => {
        const subTitle = `${idx + 1}.${subIdx + 1}. ${sub.title}`
        sub.items?.filter(i => i.item_type === 'PHOTO').forEach(i => items.push({ photo: i as Photo, title: subTitle }))
      })
    })
    return items
  }

  const openLightbox = (photo: Photo, items: { photo: Photo; title: string }[]) => {
    const idx = items.findIndex(item => item.photo === photo)
    setLightboxItems(items)
    setLightboxIndex(idx !== -1 ? idx : 0)
  }

  const bg = darkMode ? 'bg-stone-900 text-white' : 'bg-[#F7F4F0] text-stone-900'

  if (notFound) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${bg}`}>
        <p className="text-stone-400">{t('portfolio.notFound') || '포트폴리오를 찾을 수 없습니다.'}</p>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${bg}`} style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* 상단 바 */}
      <div className="flex items-center justify-between px-4 py-3">
        {selectedProject ? (
          <button onClick={() => setSelectedProject(null)} className="min-w-[44px] min-h-[44px] flex items-center justify-center">
            <ChevronLeft size={22} strokeWidth={1.5} />
          </button>
        ) : (
          <div className="min-w-[44px]" />
        )}
        <span className="font-serif text-lg font-semibold">{username}</span>
        <button
          onClick={() => setDarkMode(v => !v)}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center p-3"
        >
          {darkMode ? <Sun size={18} strokeWidth={1.5} /> : <Moon size={18} strokeWidth={1.5} />}
        </button>
      </div>

      <div ref={containerRef} className="px-4">
        {!selectedProject ? (
          // 프로젝트 목록
          <div className="flex flex-col gap-4 pb-8">
            {projects.map(project => (
              <div
                key={project.id}
                className={`rounded-xl overflow-hidden cursor-pointer ${darkMode ? 'bg-stone-800' : 'bg-white'} shadow-sm`}
                onClick={() => { setSelectedProject(project); window.scrollTo(0, 0) }}
              >
                {project.cover_image_url ? (
                  <img src={project.cover_image_url} className="w-full aspect-[3/2] object-cover" alt={project.title} />
                ) : (
                  <div className={`w-full aspect-[3/2] ${darkMode ? 'bg-stone-700' : 'bg-stone-100'}`} />
                )}
                <div className="p-3">
                  <p className="font-semibold text-sm">{project.title}</p>
                  {project.location && (
                    <p className={`flex items-center gap-1 text-xs mt-1 ${darkMode ? 'text-stone-400' : 'text-stone-400'}`}>
                      <MapPin size={11} strokeWidth={1.5} />{project.location}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // 선택된 프로젝트 상세
          <div className="pb-8">
            <h1 className="text-2xl font-serif font-semibold mb-1">{selectedProject.title}</h1>
            {selectedProject.location && (
              <p className={`flex items-center gap-1 text-xs mb-4 ${darkMode ? 'text-stone-400' : 'text-stone-400'}`}>
                <MapPin size={12} strokeWidth={1.5} />{selectedProject.location}
              </p>
            )}
            {selectedProject.chapters.map((chapter) => {
              const allChapterItems = getAllChapterItems(selectedProject)
              return (
                <div key={chapter.id} className="mb-8">
                  <h2 className="text-lg font-semibold mb-1">{chapter.title}</h2>
                  {chapter.description && <p className={`text-sm mb-3 ${darkMode ? 'text-stone-300' : 'text-stone-500'}`}>{chapter.description}</p>}
                  {containerWidth > 0 && (
                    <MobilePortfolioChapterItems
                      items={chapter.items as any}
                      allLightboxItems={allChapterItems as any}
                      darkMode={darkMode}
                      containerWidth={containerWidth}
                      onLightbox={(photo, items) => openLightbox(photo as Photo, items as any)}
                    />
                  )}
                  {chapter.sub_chapters?.map((sub) => (
                    <div key={sub.id} className="mt-4">
                      <h3 className="text-base font-medium mb-1">{sub.title}</h3>
                      {sub.description && <p className={`text-xs mb-2 ${darkMode ? 'text-stone-400' : 'text-stone-400'}`}>{sub.description}</p>}
                      {containerWidth > 0 && (
                        <MobilePortfolioChapterItems
                          items={sub.items as any}
                          allLightboxItems={allChapterItems as any}
                          darkMode={darkMode}
                          containerWidth={containerWidth}
                          onLightbox={(photo, items) => openLightbox(photo as Photo, items as any)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && lightboxItems[lightboxIndex] && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="flex items-center justify-between px-4 py-2 shrink-0">
            <button onClick={() => setLightboxIndex(null)} className="min-w-[44px] min-h-[44px] flex items-center justify-center">
              <X size={22} strokeWidth={1.5} className="text-white" />
            </button>
            <span className="text-white/60 text-sm">{lightboxIndex + 1} / {lightboxItems.length}</span>
            <div className="w-[44px]" />
          </div>
          <div className="flex-1 flex items-center justify-center relative"
            onTouchStart={e => { (e.currentTarget as any)._tx = e.touches[0].clientX }}
            onTouchEnd={e => {
              const startX = (e.currentTarget as any)._tx ?? 0
              const delta = e.changedTouches[0].clientX - startX
              if (delta < -50 && lightboxIndex < lightboxItems.length - 1) setLightboxIndex(v => v! + 1)
              if (delta > 50 && lightboxIndex > 0) setLightboxIndex(v => v! - 1)
            }}
          >
            <img src={lightboxItems[lightboxIndex].photo.image_url} style={{ width: '100%', height: '100dvh', objectFit: 'contain' }} draggable={false} />
            {lightboxIndex > 0 && (
              <button onClick={() => setLightboxIndex(v => v! - 1)} className="absolute left-2 min-w-[44px] min-h-[44px] flex items-center justify-center bg-black/30 rounded-full">
                <ChevronLeft size={22} strokeWidth={1.5} className="text-white" />
              </button>
            )}
            {lightboxIndex < lightboxItems.length - 1 && (
              <button onClick={() => setLightboxIndex(v => v! + 1)} className="absolute right-2 min-w-[44px] min-h-[44px] flex items-center justify-center bg-black/30 rounded-full">
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
