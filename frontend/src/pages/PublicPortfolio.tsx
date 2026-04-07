import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
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
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null)
  const [lightboxItems, setLightboxItems] = useState<{ photo: Photo; title: string }[]>([])
  const [lightboxChapter, setLightboxChapter] = useState<string | null>(null)
  const [darkMode, setDarkMode] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const { t } = useTranslation()

  const { isAuthenticated } = useAuth()

  useEffect(() => {
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
    const currentItem = items.find(item => item.photo.id === photo.id)
    setLightboxPhoto(photo)
    setLightboxItems(items)
    setLightboxChapter(currentItem?.title || null)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxPhoto || lightboxItems.length === 0) return
      if (e.key === 'Escape') { setLightboxPhoto(null); return }
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

  if (notFound) return (
    <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-500 mb-2">포트폴리오를 찾을 수 없어요</p>
        <p className="text-sm text-gray-400">@{username}</p>
      </div>
    </div>
  )

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300`}>
    {!isAuthenticated && (
      <div className={`border-b ${darkMode ? 'border-white/10' : 'border-gray-200'}`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className={`text-lg font-bold tracking-widest ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Racconto
          </Link>
          <a
            href={`/p/${username}`}
            className={`text-sm ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
          >
            @{username}
          </a>
        </div>
      </div>
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

      {lightboxPhoto && (
        <div
          className={`fixed inset-0 ${darkMode ? 'bg-[#1A1A1A]/95' : 'bg-[#F5F0EB]/95'} z-50 flex items-center justify-center transition-colors duration-300`}
          onClick={() => setLightboxPhoto(null)}
        >
          <button
            className={`absolute top-6 right-6 text-2xl z-10 ${darkMode ? 'text-white' : 'text-gray-900'} hover:opacity-50`}
            onClick={() => setLightboxPhoto(null)}
          >✕</button>
          <button
            className={`absolute left-6 text-5xl z-10 select-none ${darkMode ? 'text-white' : 'text-gray-900'} hover:opacity-50`}
            onClick={e => {
              e.stopPropagation()
              const idx = lightboxItems.findIndex(item => item.photo.id === lightboxPhoto.id)
              if (idx > 0) {
                setLightboxPhoto(lightboxItems[idx - 1].photo)
                setLightboxChapter(lightboxItems[idx - 1].title)
              }
            }}
          >‹</button>
          <div className="max-w-5xl max-h-screen p-12 flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <img
              src={lightboxPhoto.image_url} alt={lightboxPhoto.caption || ''}
              className="max-w-full max-h-[80vh] object-contain"
            />
            {lightboxPhoto.caption && (
              <p className={`text-sm mt-4 text-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {lightboxPhoto.caption}
              </p>
            )}
            <div className="text-center mt-2">
              {lightboxChapter && (
                <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} text-xs mb-1`}>{lightboxChapter}</p>
              )}
              <p className={`${darkMode ? 'text-gray-500' : 'text-gray-400'} text-xs`}>
                {lightboxItems.findIndex(item => item.photo.id === lightboxPhoto?.id) + 1} / {lightboxItems.length}
              </p>
            </div>
          </div>
          <button
            className={`absolute right-6 text-5xl z-10 select-none ${darkMode ? 'text-white' : 'text-gray-900'} hover:opacity-50`}
            onClick={e => {
              e.stopPropagation()
              const idx = lightboxItems.findIndex(item => item.photo.id === lightboxPhoto.id)
              if (idx < lightboxItems.length - 1) {
                setLightboxPhoto(lightboxItems[idx + 1].photo)
                setLightboxChapter(lightboxItems[idx + 1].title)
              }
            }}
          >›</button>
        </div>
      )}
    </div>
  )
}