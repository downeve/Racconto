import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'

const API = import.meta.env.VITE_API_URL

interface Photo {
  id: string
  image_url: string
  caption: string | null
}

interface Chapter {
  id: string
  title: string
  description: string | null
  photos: Photo[]
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

  // [새로운 코드]
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [lightboxItems, setLightboxItems] = useState<{ photo: Photo; title: string }[]>([])
  
  // 상태 밑에, 현재 선택된 아이템을 쉽게 쓰기 위해 변수 하나 추가
  const activeLightboxItem = lightboxIndex !== null ? lightboxItems[lightboxIndex] : null

  const { t } = useTranslation()

  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  // 💡 3. 로그아웃 상태 & _setup 주소 방어 로직 추가
  useEffect(() => {
    if (!isAuthenticated && username === '@setup') {
      navigate('/', { replace: true }); // 뒤로가기 기록도 안 남기고 바로 홈으로 튕겨냄
    }
  }, [isAuthenticated, username, navigate]);

  useEffect(() => {
    // 💡 [수정] username이 아예 없거나 '@setup'인 경우 API 호출을 생략합니다.
    if (!username || username === '@setup') {
      setNotFound(false);
      return;
    }

    axios.get(`${API}/portfolio/public/${username}`)
      .then(res => setProjects(res.data.projects))
      .catch(() => setNotFound(true))
  }, [username])

  const openProject = (project: PortfolioProject) => {
    setSelectedProject(project)
    window.scrollTo(0, 0)
  }

  const getAllChapterItems = (project: PortfolioProject) => {
    const items: { photo: Photo; title: string }[] = []
    project.chapters?.forEach((ch, idx) => {
      const chTitle = `Chapter ${idx + 1}: ${ch.title}`
      ch.photos?.forEach(p => items.push({ photo: p, title: chTitle }))
      ch.sub_chapters?.forEach((sub, subIdx) => {
        const subTitle = `Chapter ${idx + 1}.${subIdx + 1}: ${sub.title}`
        sub.photos?.forEach(p => items.push({ photo: p, title: subTitle }))
      })
    })
    return items
  }

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

  const bg = darkMode ? 'bg-[#1A1A1A] text-white' : 'bg-[#F5F0EB] text-gray-900'
  const cardBg = darkMode ? 'bg-[#2A2A2A]' : 'bg-white'
  const subText = darkMode ? 'text-gray-400' : 'text-gray-500'

  // 💡 케이스 1: 먼저 사용자가 포트폴리오 설정을 안 했을 때 (@setup) 인지 확인합니다.
  if (username === '@setup' || !username) {
    return (
      <div className={`min-h-screen pt-14 flex flex-col ${darkMode ? 'bg-stone-900 text-white' : 'bg-[#F7F4F0] text-stone-900'}`}>
        <main className="flex-1 flex items-center justify-center px-6 pb-32">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: "'Georgia', serif" }}>
              {t('portfolio.startMessage')}
            </h2>
            <p className="text-stone-600 break-keep leading-relaxed text-sm">
              {t('portfolio.startMessage2')}
            </p>
          </div>
        </main>
      </div>
    );
  }

  // 💡 케이스 2: _setup이 아닌데 못 찾았을 때 (진짜 에러 화면)
  if (notFound) {
    return (
      <div className={`fixed inset-0 z-[100] flex flex-col ${darkMode ? 'bg-stone-900 text-white' : 'bg-[#F7F4F0] text-stone-900'}`}>
        {/* 단순화된 헤더 (로고만 표시) */}
        <nav className="w-full bg-[#F7F4F0] border-b border-stone-200 text-stone-900 shrink-0">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
            <Link 
              to="/" 
              className="text-xl font-bold tracking-widest" 
              style={{ fontFamily: "'Georgia', serif", letterSpacing: '0.15em' }}
            >
              Racconto
            </Link>
          </div>
        </nav>
        <main className="flex-1 flex items-center justify-center px-6 pb-32">
          <div className="text-center">
            <p className="text-gray-500">@{username}{t('portfolio.noUser')}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300`}>
    {/* 💡 [수정된 부분] 로그아웃 상태일 때 보여주는 헤더를 fixed로 띄워 상단 빈 공간을 덮어버립니다. */}
      {!isAuthenticated && (
        <nav className={`fixed top-0 left-0 right-0 z-[60] border-b backdrop-blur-md transition-colors duration-300 ${
          darkMode ? 'bg-[#1A1A1A]/90 border-white/10' : 'bg-[#F5F0EB]/90 border-gray-200'
        }`}>
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
            {/* Navbar.tsx와 동일한 텍스트 크기(text-xl)와 자간(0.15em) 적용 */}
            <Link 
              to="/" 
              className={`text-xl font-bold tracking-widest ${darkMode ? 'text-white' : 'text-gray-900'}`}
              style={{ fontFamily: "'Georgia', serif", letterSpacing: '0.15em' }}
            >
              Racconto
            </Link>
            <Link
              to={`/p/${username}`}
              className={`text-sm ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
            >
              @{username}
            </Link>
          </div>
        </nav>
      )}

      <div className="max-w-6xl mx-auto p-6">

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            {selectedProject && (
              <button
                onClick={() => setSelectedProject(null)}
                className={`text-sm ${subText} hover:text-current`}
              >
                {t('nav.backToList')}
              </button>
            )}
            <h2 className={`text-2xl font-bold tracking-wide mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {selectedProject ? selectedProject.title : `@${username}`}
            </h2>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`px-3 py-1 text-xs rounded-full border ${darkMode ? 'border-gray-600 text-gray-400' : 'border-gray-300 text-gray-500'}`}
          >
            {darkMode ? '☀️ ' + t('settings.themeBeige') : '🌙 ' + t('settings.themeDark')}
          </button>
        </div>

        {!selectedProject && (
          <div className="grid grid-cols-3 gap-6">
            {projects.map(project => (
              <div
                key={project.id}
                className={`${cardBg} rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity`}
                onClick={() => openProject(project)}
              >
                {project.cover_image_url ? (
                  <img src={project.cover_image_url} alt={project.title} className="w-full h-48 object-cover" />
                ) : (
                  <div className={`w-full h-48 flex items-center justify-center ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <span className={`text-sm ${subText}`}>No Cover</span>
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-sm mb-1">{project.title}</h3>
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
          <div>
            <div className="mb-8">
              {selectedProject.location && (
                <p className={`text-sm ${subText} mb-2`}>📍 {selectedProject.location}</p>
              )}
              {selectedProject.description && (
                <p className={`text-sm ${subText}`}>{selectedProject.description}</p>
              )}
            </div>

            {selectedProject.chapters.length > 0 ? (
              <div className="space-y-12">
                {selectedProject.chapters.map((chapter, idx) => (
                  <div key={chapter.id}>
                    <div className="mb-4">
                      <p className={`text-xs ${subText} mb-1`}>{t('story.chapter')} {idx + 1}</p>
                      <h3 className="text-lg font-semibold">{chapter.title}</h3>
                      {chapter.description && (
                        <p className={`text-sm ${subText} mt-1`}>{chapter.description}</p>
                      )}
                    </div>
                    {chapter.photos && chapter.photos.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                        {chapter.photos.map(photo => (
                          <img key={photo.id} src={photo.image_url}
                            loading="lazy"
                            className="w-full aspect-[3/2] object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => openLightbox(photo, getAllChapterItems(selectedProject))}
                          />
                        ))}
                      </div>
                    )}
                    {chapter.sub_chapters?.map((sub, subIdx) => (
                      <div key={sub.id} className="ml-4 md:ml-8 mb-8">
                        <div className="mb-3 border-l-4 border-blue-400 pl-4">
                          <p className={`text-xs ${subText} mb-1`}>{t('story.chapter')} {idx + 1}.{subIdx + 1}</p>
                          <h4 className="text-base font-semibold">{sub.title}</h4>
                        </div>
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-3 pl-4">
                          {sub.photos.map(photo => (
                            <img key={photo.id} src={photo.image_url}
                              loading="lazy"
                              className="w-full aspect-[3/2] object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => openLightbox(photo, getAllChapterItems(selectedProject))}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-gray-400">
                <p className="text-lg mb-2">{t('portfolio.noChapters')}</p>
                <p className="text-sm">{t('portfolio.createChapterFirst')}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {lightboxIndex !== null && activeLightboxItem && (
        <div
          className={`fixed inset-0 ${darkMode ? 'bg-[#1A1A1A]/95' : 'bg-[#F5F0EB]/95'} z-50 flex items-center justify-center transition-colors duration-300`}
          onClick={() => setLightboxIndex(null)}
        >
          <button
            className={`absolute top-6 right-6 text-2xl z-10 ${darkMode ? 'text-white' : 'text-gray-900'} hover:opacity-50`}
            onClick={() => setLightboxIndex(null)}
          >✕</button>
          
          {/* 💡 첫 번째 사진이 아닐 때만 왼쪽 화살표 표시 */}
          {lightboxIndex > 0 && (
            <button
              className={`absolute left-6 text-5xl z-10 select-none ${darkMode ? 'text-white' : 'text-gray-900'} hover:opacity-50`}
              onClick={e => {
                e.stopPropagation()
                setLightboxIndex(lightboxIndex - 1)
              }}
            >‹</button>
          )}

          <div className="max-w-5xl max-h-screen p-12 flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <img
              src={activeLightboxItem.photo.image_url} alt={activeLightboxItem.photo.caption || ''}
              className="max-w-full max-h-[80vh] object-contain"
            />
            
            {/* 💡 텍스트 영역: 중앙 배치 유지하되 안쪽 텍스트는 왼쪽 정렬(text-start) */}
            <div className="text-start mt-4 w-full">
              <p className="mb-1.5 leading-relaxed flex items-center flex-wrap">
                {/* 1. 챕터 정보 (조금 작고 흐리게) */}
                {activeLightboxItem.title && (
                  <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} text-xs mr-3 shrink-0`}>
                    {activeLightboxItem.title}
                  </span>
                )}
                
                {/* 2. 사진 캡션 (기본 크기와 색상) */}
                {activeLightboxItem.photo.caption && (
                  <span className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {activeLightboxItem.photo.caption}
                  </span>
                )}
              </p>
              
              {/* 3. 사진 인덱스 (1 / 6) */}
              <p className={`${darkMode ? 'text-gray-500' : 'text-gray-400'} text-xs`}>
                {lightboxIndex + 1} / {lightboxItems.length}
              </p>
            </div>
          </div>

          {/* 💡 마지막 사진이 아닐 때만 오른쪽 화살표 표시 */}
          {lightboxIndex < lightboxItems.length - 1 && (
            <button
              className={`absolute right-6 text-5xl z-10 select-none ${darkMode ? 'text-white' : 'text-gray-900'} hover:opacity-50`}
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