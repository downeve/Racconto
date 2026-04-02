import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import axios from 'axios'
import { useTranslation } from 'react-i18next'

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

export default function Portfolio() {
  const [projects, setProjects] = useState<PortfolioProject[]>([])
  const [selectedProject, setSelectedProject] = useState<PortfolioProject | null>(null)
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null)
  const [darkMode, setDarkMode] = useState(false)
  const [lightboxChapter, setLightboxChapter] = useState<string | null>(null)
  const { t } = useTranslation()

  const location = useLocation()

  useEffect(() => {
    axios.get(`${API}/portfolio/`).then(res => setProjects(res.data))
    axios.get(`${API}/settings/`).then(res => {
      setDarkMode(res.data['portfolio_theme'] === 'dark')
    })
  }, [])

  useEffect(() => {
    setSelectedProject(null)
  }, [location])

  const openProject = (project: PortfolioProject) => {
    setSelectedProject(project)
    window.scrollTo(0, 0)
  }

  // 라이트박스용 상태 (Photo 배열이 아닌, 타이틀이 포함된 객체 배열로 관리)
  const [lightboxItems, setLightboxItems] = useState<{ photo: Photo; title: string }[]>([])
  
  const openLightbox = (photo: Photo, items: { photo: Photo; title: string }[]) => {
    const currentItem = items.find(item => item.photo.id === photo.id);
    setLightboxPhoto(photo);
    setLightboxItems(items);
    setLightboxChapter(currentItem?.title || null);
  };

  // 사진과 해당 사진의 챕터 제목을 함께 묶어서 배열로 반환하는 함수
  const getAllChapterItems = (project: PortfolioProject) => {
    const items: { photo: Photo; title: string }[] = [];
    
    project.chapters?.forEach((ch, idx) => {
      const chTitle = `Chapter ${idx + 1}: ${ch.title}`;
      
      // 메인 챕터 사진들 추가
      ch.photos?.forEach(p => items.push({ photo: p, title: chTitle }));
      
      // 서브 챕터 사진들 추가
      ch.sub_chapters?.forEach((sub, subIdx) => {
        const subTitle = `Chapter ${idx + 1}.${subIdx + 1}: ${sub.title}`;
        sub.photos?.forEach(p => items.push({ photo: p, title: subTitle }));
      });
    });
    
    return items;
  };

  // 키보드 이벤트
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxPhoto || lightboxItems.length === 0) return
      if (e.key === 'Escape') {
        setLightboxPhoto(null)
        return
      }
      
      const idx = lightboxItems.findIndex(item => item.photo.id === lightboxPhoto.id)
      
      if (e.key === 'ArrowRight' && idx < lightboxItems.length - 1) {
        setLightboxPhoto(lightboxItems[idx + 1].photo)
        setLightboxChapter(lightboxItems[idx + 1].title)
      }
      if (e.key === 'ArrowLeft' && idx > 0) {
        setLightboxPhoto(lightboxItems[idx - 1].photo)
        setLightboxChapter(lightboxItems[idx - 1].title)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxPhoto, lightboxItems])

  const bg = darkMode ? 'bg-[#1A1A1A] text-white' : 'bg-[#F5F0EB] text-gray-900'
  const cardBg = darkMode ? 'bg-[#2A2A2A]' : 'bg-white'
  const subText = darkMode ? 'text-gray-400' : 'text-gray-500'

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300`}>
      <div className="max-w-6xl mx-auto p-6">

        {/* 헤더 */}
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
            <h2 className="text-2xl font-bold tracking-wider">
              {selectedProject ? selectedProject.title : t('nav.portfolio')}
            </h2>
          </div>
          {/* 배경 토글 */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`px-3 py-1 text-xs rounded-full border ${darkMode ? 'border-gray-600 text-gray-400' : 'border-gray-300 text-gray-500'}`}
          >
            {darkMode ? '☀️ ' + t('settings.themeBeige') : '🌙 ' + t('settings.themeDark')}
          </button>
        </div>

        {/* 목록 뷰 */}
        {!selectedProject && (
          <div>
            <div className="grid grid-cols-3 gap-6">
              {projects.map(project => (
                <div
                  key={project.id}
                  className={`${cardBg} rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity`}
                  onClick={() => openProject(project)}
                >
                  {project.cover_image_url ? (
                    <img
                      src={project.cover_image_url}
                      alt={project.title}
                      className="w-full h-48 object-cover"
                    />
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
            </div>

            {projects.length === 0 && (
              <div className="text-center py-20">
                <p className={subText}>공개된 프로젝트가 없어요</p>
              </div>
            )}
          </div>
        )}

        {/* 상세 뷰 */}
        {selectedProject && (
          <div>
            {/* 프로젝트 헤더 */}
            <div className="mb-8">
              {selectedProject.location && (
                <p className={`text-sm ${subText} mb-2`}>📍 {selectedProject.location}</p>
              )}
              {selectedProject.description && (
                <p className={`text-sm ${subText}`}>{selectedProject.description}</p>
              )}
            </div>

            {/* 챕터가 있는 경우 */}
            {selectedProject.chapters.length > 0 ? (
              <div className="space-y-12">
                {selectedProject.chapters.map((chapter, idx) => (
                  <div key={chapter.id}>
                    {/* 최상위 챕터 */}
                    <div className="mb-4">
                      <p className={`text-xs ${subText} mb-1`}>Chapter {idx + 1}</p>
                      <h3 className="text-lg font-semibold">{chapter.title}</h3>
                      {chapter.description && (
                        <p className={`text-sm ${subText} mt-1`}>{chapter.description}</p>
                      )}
                    </div>

                    {/* 1. 메인 챕터 사진 그리드 */}
                    {chapter.photos && chapter.photos.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                        {chapter.photos.map(photo => (
                          <img
                            key={photo.id}
                            src={photo.image_url}
                            className="w-full aspect-[3/2] object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => openLightbox(photo, getAllChapterItems(selectedProject))}
                          />
                        ))}
                      </div>
                    )}

                    {/* 2. 서브 챕터 전체 (들여쓰기 및 이미지 크기 축소) */}
                    {chapter.sub_chapters?.map((sub, subIdx) => (
                      <div key={sub.id} className="ml-4 md:ml-8 mb-8"> {/* 전체 들여쓰기 */}
                        <div className="mb-3 border-l-4 border-blue-400 pl-4">
                          <p className={`text-xs ${subText} mb-1`}>Sub-Chapter {idx + 1}.{subIdx + 1}</p>
                          <h4 className="text-base font-semibold">{sub.title}</h4>
                        </div>
                        {/* 이미지 크기를 더 작게 하기 위해 grid-cols-4 적용 */}
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-3 pl-4">
                          {sub.photos.map(photo => (
                            <img
                              key={photo.id}
                              src={photo.image_url}
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
              /* 챕터가 없는 경우 - 안내 메시지 */
              <div className="text-center py-20 text-gray-400">
                <p className="text-lg mb-2">{t('portfolio.noChapters')}</p>
                <p className="text-sm">{t('portfolio.createChapterFirst')}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 라이트박스 */}
      {lightboxPhoto && (
        <div
          // 👇 bg-black 제거 후 테마에 따른 배경색 적용 (투명도 95% 유지)
          className={`fixed inset-0 ${darkMode ? 'bg-[#1A1A1A]/95' : 'bg-[#F5F0EB]/95'} z-50 flex items-center justify-center transition-colors duration-300`}
          onClick={() => setLightboxPhoto(null)}
        >
          {/* 닫기 버튼: 테마에 따라 색상 변경 */}
          <button
            className={`absolute top-6 right-6 text-2xl z-10 ${darkMode ? 'text-white' : 'text-gray-900'} hover:opacity-50`}
            onClick={() => setLightboxPhoto(null)}
          >
            ✕
          </button>

          {/* 이전 버튼: 테마에 따라 색상 변경 */}
          <button
            className={`absolute left-6 text-5xl z-10 select-none ${darkMode ? 'text-white' : 'text-gray-900'} hover:opacity-50`}
            onClick={e => {
              e.stopPropagation()
              // 👇 수정: lightboxPhotos 대신 lightboxItems 사용
              const idx = lightboxItems.findIndex(item => item.photo.id === lightboxPhoto.id)
              if (idx > 0) {
                setLightboxPhoto(lightboxItems[idx - 1].photo)
                setLightboxChapter(lightboxItems[idx - 1].title)
              }
            }}
          >
            ‹
          </button>

          {/* 이미지 컨테이너 */}
          <div
            className="max-w-5xl max-h-screen p-12 flex flex-col items-center"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={lightboxPhoto.image_url}
              alt={lightboxPhoto.caption || ''}
              className="max-w-full max-h-[80vh] object-contain"
            />
            
            {/* 캡션: 테마에 따라 글자색 변경 */}
            {lightboxPhoto.caption && (
              <p className={`text-sm mt-4 text-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {lightboxPhoto.caption}
              </p>
            )}

            {/* 챕터 정보 + 페이지 번호 */}
            <div className="text-center mt-2">
              {lightboxChapter && (
                <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} text-xs mb-1`}>
                  {lightboxChapter}
                </p>
              )}
              <p className={`${darkMode ? 'text-gray-500' : 'text-gray-400'} text-xs`}>
                {lightboxItems.findIndex(item => item.photo.id === lightboxPhoto?.id) + 1} / {lightboxItems.length}              </p>
            </div>
          </div>

          {/* 다음 버튼: 테마에 따라 색상 변경 */}
          <button
            className={`absolute right-6 text-5xl z-10 select-none ${darkMode ? 'text-white' : 'text-gray-900'} hover:opacity-50`}
            onClick={e => {
              e.stopPropagation()
              // 👇 수정: lightboxPhotos 대신 lightboxItems 사용
              const idx = lightboxItems.findIndex(item => item.photo.id === lightboxPhoto.id)
              if (idx < lightboxItems.length - 1) {
                setLightboxPhoto(lightboxItems[idx + 1].photo)
                setLightboxChapter(lightboxItems[idx + 1].title)
              }
            }}
          >
            ›
          </button>
        </div>
      )}
    </div>
  )
}