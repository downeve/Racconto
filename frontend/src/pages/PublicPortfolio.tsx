import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import PortfolioChapterItems, { type PortfolioPhoto } from '../components/PortfolioChapterItems'
import PublicNavbar from '../components/PublicNavbar'
import { Sun, Moon, MapPin } from 'lucide-react'
//import { Download } from 'lucide-react'
//import { exportToPDF } from '../utils/exportToPDF'

const API = import.meta.env.VITE_API_URL

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
  //const [isPdfExporting, setIsPdfExporting] = useState(false)
  //const [pdfProgress, setPdfProgress]       = useState('')

  // [새로운 코드]
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [lightboxItems, setLightboxItems] = useState<{ photo: Photo; title: string }[]>([])

  // 상태 밑에, 현재 선택된 아이템을 쉽게 쓰기 위해 변수 하나 추가
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

  // 3. 로그아웃 상태 & _setup 주소 방어 로직 추가
  useEffect(() => {
    if (!isAuthenticated && username === '@setup') {
      navigate('/', { replace: true }); // 뒤로가기 기록도 안 남기고 바로 홈으로 튕겨냄
    }
  }, [isAuthenticated, username, navigate]);

  useEffect(() => {
    // [수정] username이 아예 없거나 '@setup'인 경우 API 호출을 생략합니다.
    if (!username || username === '@setup') {
      setNotFound(false);
      return;
    }

    // 1. 서버에서 해당 유저의 포트폴리오 데이터와 설정을 함께 가져옵니다.
    axios.get(`${API}/portfolio/${username}`)
      .then(res => {
        setProjects(res.data.projects);
        
        // 💡 [핵심] 서버 응답에 포함된 테마 설정 적용
        // 백엔드 API가 theme 또는 portfolio_theme 정보를 준다고 가정합니다.
        if (res.data.theme === 'dark') {
          setDarkMode(true);
        } else {
          setDarkMode(false);
        }
      })
      .catch(err => {
        if (err.response?.status === 404) setNotFound(true);
      });
  }, [username]);

  const openProject = (project: PortfolioProject) => {
    setSelectedProject(project)
    window.scrollTo(0, 0)
  }

  const getAllChapterItems = (project: PortfolioProject) => {
    const items: { photo: Photo; title: string }[] = []
    project.chapters?.forEach((ch, idx) => {
      const chTitle = `Chapter ${idx + 1}: ${ch.title}`
      ch.items?.filter(i => i.item_type === 'PHOTO').forEach(i => {
        items.push({ photo: i as Photo, title: chTitle })
      })
      ch.sub_chapters?.forEach((sub, subIdx) => {
        const subTitle = `Chapter ${idx + 1}.${subIdx + 1}: ${sub.title}`
        sub.items?.filter(i => i.item_type === 'PHOTO').forEach(i => {
        items.push({ photo: i as Photo, title: subTitle })
      })
      })
    })
    return items
  }

  {/*
  const handleExportPDF = async () => {
    if (!selectedProject || isPdfExporting) return
    setIsPdfExporting(true)
    setPdfProgress('준비 중...')
    try {
      await exportToPDF(
        'portfolio-print-area',
        'portfolio-print-start',  // 출력 시작점 (title 영역)
        selectedProject.title,
        darkMode,
        (step) => setPdfProgress(step)
      )
    } catch (err) {
      console.error('PDF export failed:', err)
      alert('PDF 저장 중 오류가 발생했습니다.')
    } finally {
      setIsPdfExporting(false)
      setPdfProgress('')
    }
  }
  */}

  const openLightbox = (photo: Photo, items: { photo: Photo; title: string }[]) => {
    // 💡 photo.id 가 아니라 객체 자체(photo === photo)를 비교하여 중복 사진이라도 '클릭한 바로 그 사진'의 위치를 정확히 찾습니다.
    const idx = items.findIndex(item => item.photo === photo)
    setLightboxItems(items)
    setLightboxIndex(idx !== -1 ? idx : 0)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null || lightboxItems.length === 0) return
      if (e.key === 'Escape') { setLightboxIndex(null); return }
      
      if (e.key === 'ArrowRight' && lightboxIndex < lightboxItems.length - 1) {
        setLightboxIndex(prev => (prev !== null ? prev + 1 : null))
      }
      if (e.key === 'ArrowLeft' && lightboxIndex > 0) {
        setLightboxIndex(prev => (prev !== null ? prev - 1 : null))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxIndex, lightboxItems])

  const bg = darkMode ? 'bg-[#18140F] text-hair' : 'bg-canvas text-ink'
  const subText = darkMode ? 'text-faint' : 'text-muted'

  // 케이스 1: 먼저 사용자가 포트폴리오 설정을 안 했을 때 (@setup) 인지 확인합니다.
  if (username === '@setup' || !username) {
    return (
      <div className={`min-h-screen pt-14 flex flex-col ${darkMode ? 'bg-ink text-hair' : 'bg-canvas text-ink'}`}>
        <main className="flex-1 flex items-center justify-center px-6 pb-32">
          <div className="text-center">
            <h2 className="text-2xl text-ink-2 font-bold mb-3">
              {t('portfolio.startMessage')}
            </h2>
            <p className="text-ink-2 break-keep leading-relaxed text-sm">
              {t('portfolio.startMessage2')}
            </p>
          </div>
        </main>
      </div>
    );
  }

  // 케이스 2: _setup이 아닌데 못 찾았을 때 (진짜 에러 화면)
  if (notFound) {
    return (
      <div className={`fixed inset-0 z-[100] flex flex-col ${darkMode ? 'bg-ink text-hair' : 'bg-canvas text-ink'}`}>
        {/* 단순화된 헤더 (로고만 표시) */}
        <nav className="w-full bg-canvas border-b border-hair text-ink shrink-0">
          <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
            <Link 
              to="/" 
              className="text-xl font-bold tracking-widest" 
              style={{ letterSpacing: '0.15em' }}
            >
              Racconto
            </Link>
          </div>
        </nav>
        <main className="flex-1 flex items-center justify-center px-6 pb-32">
          <div className="text-center">
            <p className="text-muted">@{username}{t('portfolio.noUser')}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg} transition-[background,color,border] duration-150 ease-out`}>
      {!isAuthenticated && <PublicNavbar username={username} darkMode={darkMode} compact />}

      <div className="max-w-4xl mx-auto px-6 pt-space-md pb-space-xl">

        <div className="flex items-center justify-between mb-space-md">
          <div id="portfolio-print-start" className="flex items-center gap-4">
            <h2 className={`text-h2 font-bold font-serif tracking-wide mb-2 ${darkMode ? 'text-hair' : 'text-ink'}`}>
              {selectedProject ? selectedProject.title : `@${username}`}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {/*{selectedProject && (
              <button
                onClick={handleExportPDF}
                disabled={isPdfExporting}
                className={`inline-flex items-center gap-1 px-3 py-1 text-xs rounded-btn border
                  ${darkMode ? 'border-ink-2 text-faint' : 'border-faint text-muted'}
                  disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <Download size={12} strokeWidth={1.5} />
                {isPdfExporting ? pdfProgress : 'PDF'}
              </button>
            )}*/}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`inline-flex items-center gap-1 px-3 py-1 text-xs rounded-btn border ${darkMode ? 'border-ink-2 text-faint' : 'border-faint text-muted'}`}
            >
              {darkMode
                ? <><Sun size={12} strokeWidth={1.5} />{' '}{t('settings.themeBeige')}</>
                : <><Moon size={12} strokeWidth={1.5} />{' '}{t('settings.themeDark')}</>}
            </button>
          </div>
        </div>

        {!selectedProject && (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
            {projects.map(project => (
              <div
                key={project.id}
                className={`cursor-pointer group rounded-card overflow-hidden transition-shadow ${darkMode ? 'border border-white/10 hover:border-white/20' : 'shadow hover:shadow-deep'}`}
                onClick={() => openProject(project)}
              >
                <div className={`h-48 flex items-center justify-center ${darkMode ? 'bg-stone-800' : 'bg-hair'}`}>
                  {project.cover_image_url ? (
                    <img
                      src={project.cover_image_url}
                      alt={project.title}
                      className="w-full h-full object-cover group-hover:opacity-95 transition-opacity"
                    />
                  ) : (
                    <span className={`text-small ${subText}`}>No Cover</span>
                  )}
                </div>
                <div className={`p-4 ${darkMode ? 'bg-stone-900' : 'bg-canvas-2'}`}>
                  <h3 className={`font-semibold text-h3 font-serif [word-break:keep-all] ${darkMode ? 'text-hair' : 'text-ink-2'}`}>
                    {project.title}
                  </h3>
                  {project.location && (
                    <p className={`flex items-center gap-1 text-small mt-1 ${subText}`}><MapPin size={12} strokeWidth={1.5} />{project.location}</p>
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
              <div className="col-span-3 text-center py-20">
                <p className={subText}>{t('portfolio.noPublicProjects')}</p>
              </div>
            )}
          </div>
        )}

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
                <div key={chapter.id} className="pt-space-lg">
                  {/* 챕터 구분선 — 첫 챕터 제외 */}
                  {idx > 0 && (
                    <div className={`h-px mb-space-md ${darkMode ? 'bg-muted' : 'bg-faint'}`} />
                  )}
                  <div className="mb-space-md">
                    <div className="flex items-baseline gap-2 mb-2">
                    <p className={`text-small uppercase mb-3 ${subText}`}>
                      {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                    </p>
                    <h3
                      className="text-h2 font-bold font-serif mb-4 tracking-tight"
                    >
                      {chapter.title}
                    </h3>
                    </div>
                    {chapter.description && (
                      <p
                        className={`text-body font-serif max-w-xl [word-break:keep-all] ${subText}`}
                      >
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
                    {chapter.sub_chapters?.map((sub, subIdx) => (
                      <div key={sub.id} className="mt-space-md">
                        <div className={`h-px mb-10 w-1/3 ${darkMode ? 'bg-card/10' : 'bg-hair'}`} />
                        <div className="mb-8">
                          <div className="flex items-baseline gap-2 mb-2">
                          <p className={`text-caption uppercase mb-2 ${subText}`}>
                            {idx + 1}.{subIdx + 1}
                          </p>
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
              <div className="text-center py-20 text-faint">
                <p className="text-h3 mb-2">{t('portfolio.noChapters')}</p>
                <p className="text-h3">{t('portfolio.createChapterFirst')}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {lightboxIndex !== null && activeLightboxItem && (
        <div
          className={`fixed inset-0 ${darkMode ? 'bg-lightbox/[.97]' : 'bg-lightbox/[.97]'} z-50 flex items-center justify-center transition-[background,color,border] duration-150 ease-out`}
          onClick={() => setLightboxIndex(null)}
        >
          <button
            className={`absolute top-6 right-6 text-h2 z-10 p-3 ${darkMode ? 'text-hair' : 'text-hair'} hover:opacity-50`}
            onClick={() => setLightboxIndex(null)}
          >✕</button>
          
          {/* 첫 번째 사진이 아닐 때만 왼쪽 화살표 표시 */}
          {lightboxIndex > 0 && (
            <button
              className={`absolute left-6 text-display z-10 select-none ${darkMode ? 'text-hair' : 'text-hair'} hover:opacity-50`}
              onClick={e => {
                e.stopPropagation()
                setLightboxIndex(lightboxIndex - 1)
              }}
            >‹</button>
          )}

          <div className="w-full h-full p-4 flex flex-col items-center">
            <img
              src={activeLightboxItem.photo.image_url}
              alt={activeLightboxItem.photo.caption || ''}
              className="h-full w-auto object-contain"
              onClick={e => e.stopPropagation()}
            />
          </div>

          {/* 마지막 사진이 아닐 때만 오른쪽 화살표 표시 */}
          {lightboxIndex < lightboxItems.length - 1 && (
            <button
              className={`absolute right-6 text-display z-10 select-none ${darkMode ? 'text-hair' : 'text-hair'} hover:opacity-50`}
              onClick={e => {
                e.stopPropagation()
                setLightboxIndex(lightboxIndex + 1)
              }}
            >›</button>
          )}
        </div>
      )}
    </div>
  )
}