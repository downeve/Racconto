import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import axios from 'axios'

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
  const [lightboxPhotos, setLightboxPhotos] = useState<Photo[]>([])
  const [darkMode, setDarkMode] = useState(false)
  const [lightboxChapter, setLightboxChapter] = useState<string | null>(null)

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

  const openLightbox = (photo: Photo, photos: Photo[], chapterTitle?: string) => {
    setLightboxPhoto(photo)
    setLightboxPhotos(photos)
    setLightboxChapter(chapterTitle || null)
  }

  // 키보드 이벤트
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxPhoto) return
      if (e.key === 'Escape') setLightboxPhoto(null)
      if (e.key === 'ArrowRight') {
        const idx = lightboxPhotos.findIndex(p => p.id === lightboxPhoto.id)
        if (idx < lightboxPhotos.length - 1) setLightboxPhoto(lightboxPhotos[idx + 1])
      }
      if (e.key === 'ArrowLeft') {
        const idx = lightboxPhotos.findIndex(p => p.id === lightboxPhoto.id)
        if (idx > 0) setLightboxPhoto(lightboxPhotos[idx - 1])
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxPhoto, lightboxPhotos])

  const bg = darkMode ? 'bg-[#1A1A1A] text-white' : 'bg-[#F5F0EB] text-gray-900'
  const cardBg = darkMode ? 'bg-[#2A2A2A]' : 'bg-white'
  const subText = darkMode ? 'text-gray-400' : 'text-gray-500'

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300`}>
      <div className="max-w-5xl mx-auto p-6">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            {selectedProject && (
              <button
                onClick={() => setSelectedProject(null)}
                className={`text-sm ${subText} hover:text-current`}
              >
                ← 목록
              </button>
            )}
            <h2 className="text-2xl font-bold tracking-wider">
              {selectedProject ? selectedProject.title : 'Portfolio'}
            </h2>
          </div>
          {/* 배경 토글 */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`px-3 py-1 text-xs rounded-full border ${darkMode ? 'border-gray-600 text-gray-400' : 'border-gray-300 text-gray-500'}`}
          >
            {darkMode ? '☀️ 라이트' : '🌙 다크'}
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
                    <div className="mb-4">
                      <p className={`text-xs ${subText} mb-1`}>Chapter {idx + 1}</p>
                      <h3 className="text-lg font-semibold">{chapter.title}</h3>
                      {chapter.description && (
                        <p className={`text-sm ${subText} mt-1`}>{chapter.description}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {chapter.photos.map(photo => (
                        <img
                          key={photo.id}
                          src={photo.image_url}
                          alt={photo.caption || ''}
                          className="w-full object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => openLightbox(photo, chapter.photos, `Chapter ${idx + 1}: ${chapter.title}`)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* 챕터가 없는 경우 - 전체 그리드 */
              <div className="grid grid-cols-3 gap-3">
                {selectedProject.photos.map(photo => (
                  <img
                    key={photo.id}
                    src={photo.image_url}
                    alt={photo.caption || ''}
                    className="w-full object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => openLightbox(photo, selectedProject.photos)}
                  />
                ))}
              </div>
            )}

            {/* 기타 섹션 (챕터에 없는 포트폴리오 사진) */}
            {selectedProject.chapters.length > 0 && selectedProject.extra_photos.length > 0 && (
              <div className="mt-12">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">기타</h3>
                  <p className={`text-xs ${subText} mt-1`}>챕터에 포함되지 않은 사진</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {selectedProject.extra_photos.map(photo => (
                    <img
                      key={photo.id}
                      src={photo.image_url}
                      alt={photo.caption || ''}
                      className="w-full object-contain bg-gray-100 rounded cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => openLightbox(photo, selectedProject.extra_photos, '기타')}
                    />
                  ))}
                </div>
              </div>
            )}

            {selectedProject.photos.length === 0 && selectedProject.chapters.length === 0 && (
              <div className="text-center py-20">
                <p className={subText}>포트폴리오로 선택된 사진이 없어요</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 라이트박스 */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center"
          onClick={() => setLightboxPhoto(null)}
        >
          {/* 닫기 버튼 */}
          <button
            className="absolute top-6 right-6 text-white text-2xl hover:text-gray-300 z-10"
            onClick={() => setLightboxPhoto(null)}
          >
            ✕
          </button>

          {/* 이전 버튼 */}
          <button
            className="absolute left-6 text-white text-5xl hover:text-gray-300 z-10 select-none"
            onClick={e => {
              e.stopPropagation()
              const idx = lightboxPhotos.findIndex(p => p.id === lightboxPhoto.id)
              if (idx > 0) setLightboxPhoto(lightboxPhotos[idx - 1])
            }}
          >
            ‹
          </button>

          {/* 이미지 */}
          <div
            className="max-w-5xl max-h-screen p-12 flex flex-col items-center"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={lightboxPhoto.image_url}
              alt={lightboxPhoto.caption || ''}
              className="max-w-full max-h-[80vh] object-contain"
            />
            {lightboxPhoto.caption && (
              <p className="text-white text-sm mt-4 text-center">{lightboxPhoto.caption}</p>
            )}
            {/* 챕터 정보 + 페이지 번호 */}
            <div className="text-center mt-2">
              {lightboxChapter && (
                <p className="text-gray-400 text-xs mb-1">{lightboxChapter}</p>
              )}
              <p className="text-gray-500 text-xs">
                {lightboxPhotos.findIndex(p => p.id === lightboxPhoto.id) + 1} / {lightboxPhotos.length}
              </p>
            </div>
          </div>

          {/* 다음 버튼 */}
          <button
            className="absolute right-6 text-white text-5xl hover:text-gray-300 z-10 select-none"
            onClick={e => {
              e.stopPropagation()
              const idx = lightboxPhotos.findIndex(p => p.id === lightboxPhoto.id)
              if (idx < lightboxPhotos.length - 1) setLightboxPhoto(lightboxPhotos[idx + 1])
            }}
          >
            ›
          </button>
        </div>
      )}
    </div>
  )
}