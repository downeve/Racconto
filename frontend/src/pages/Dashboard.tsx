import { useEffect, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext' // AuthContext가 구현되어 있다고 가정
import ProjectCard from '../components/ProjectCard'

const API = import.meta.env.VITE_API_URL

interface Project {
  id: string
  slug: string | null
  title: string
  title_en: string
  description: string
  status: string
  location: string
  cover_image_url: string
  is_public: string
  created_at: string
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const { user } = useAuth()
  const { t } = useTranslation()

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await axios.get(`${API}/projects/`)
        setProjects(res.data)
      } catch (err) {
        console.error("Failed to fetch projects", err)
      }
    }
    fetchProjects()
  }, [])

  // 최근 작업한 프로젝트 최대 3개만 추출 (Projects.tsx의 데이터 활용)
  const recentProjects = projects.slice(0, 3)

  return (
    <div className="min-h-screen bg-[#F7F4F0] text-stone-900 pb-20">
      <div className="max-w-7xl mx-auto px-6 pt-space-md">
        
        {/* 1. Welcome Section: LandingPage의 감성을 이어받음 */}
        <section className="mb-space-md">
          <p className="text-small tracking-[0.3em] text-faint uppercase mb-4">
            Welcome back
          </p>
          <p className="font-serif text-h2 md:text-h1 font-bold mb-6 text-ink-2 leading-tight break-keep">
            {t('dashboard.title1')}<br />
            {t('dashboard.title2')}
          </p>
          <p className="font-serif text-muted italic text-h3">
            "Every photo has a story to tell."
          </p>
        </section>

        {/* 2. Quick Actions: 대시보드만의 기능적 섹션 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-space-md">
          {/* 전체 통계 확인 */}
          <div className="bg-card p-8 rounded-card shadow border border-hair flex flex-col justify-between">
            <div>
              <p className="text-faint text-body tracking-widest uppercase mb-2">My Stories</p>
              <p className="text-h2 font-bold">{projects.length}</p>
              <p className="text-muted text-body mt-1">{t('dashboard.projectOngoing')}</p>
            </div>
            <Link to="/projects" className="text-ink-2 text-body font-semibold hover:text-ink hover:underline mt-6 inline-block">
              {t('dashboard.projectList')}
            </Link>
          </div>
          
          {/* 포트폴리오 바로가기: PublicPortfolio.tsx와 연결 */}
          <div className="bg-canvas-4 p-8 rounded-card border border-hair shadow flex flex-col justify-between">
            <div>
              <p className="text-ink text-body tracking-widest uppercase mb-2">Portfolio</p>
              <p className="text-h2 text-ink-2 mb-2">{t('dashboard.portSharing')}</p>
            </div>
            <Link to={`/p/${user?.username}`} className="text-ink-2 text-body font-semibold hover:underline underline-offset-4">
              {t('dashboard.goToPortfolio')}
            </Link>
          </div>

          {/* 새 프로젝트 생성 바로가기 */}
          <div className="bg-card p-8 rounded-card shadow border border-hair flex flex-col justify-between">
            <div>
              <p className="text-faint text-body tracking-widest uppercase mb-2">Quick Start</p>
              <p className="text-h2 mb-2">{t('dashboard.newProject')}</p>
            </div>
            <Link 
            to="/projects" 
            state={{ openForm: true }} // [추가] state를 통해 신호 전달
            className="inline-block text-body text-center btn-primary transition-all"
            >
                {t('dashboard.makeNewProject')}
            </Link>
          </div>
        </div>

        {/* 3. Recent Projects: Projects.tsx의 그리드 디자인 활용 */}
        <section>
          <div className="flex items-end justify-between mb-space-sm border-b border-hair pb-space-xs">
            <p className="text-h2 text-ink font-serif">{t('dashboard.recent')}</p>
          </div>

          {recentProjects.length > 0 ? (
            <div className="grid gap-8" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
              {recentProjects.map(project => (
                <div key={project.id}>
                  <ProjectCard project={project} />
                </div>
              ))}
            </div>
          ) : (
            /* 프로젝트가 없을 때의 Empty State */
            <div className="bg-card border-2 border-dashed border-hair rounded-card py-space-lg text-center">
              <p className="text-muted text-h2 mb-space-xs">{t('dashboard.noProjects')}</p>
              <Link to="/projects" state={{ openForm: true }} className="text-body btn-primary tracking-widest transition-all">
                {t('dashboard.startNew')}
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}