import { useEffect, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext' // AuthContext가 구현되어 있다고 가정
import ProjectCard from '../components/ProjectCard'
import Heading from '../components/Heading'

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
    <div className="min-h-screen bg-[#F7F4F0] text-stone-900 pb-20 font-cssfont">
      <div className="max-w-7xl mx-auto px-6 pt-16">
        
        {/* 1. Welcome Section: LandingPage의 감성을 이어받음 */}
        <section className="mb-16">
          <p className="text-sm tracking-[0.3em] text-stone-400 uppercase mb-4">
            Welcome back
          </p>
          <h1 className="text-3xl md:text-4xl font-bold mb-6 text-stone-900 leading-tight break-keep">
            {t('dashboard.title1')}<br />
            {t('dashboard.title2')}
          </h1>
          <p className="text-stone-500 italic text-lg">
            "Every photo has a story to tell."
          </p>
        </section>

        {/* 2. Quick Actions: 대시보드만의 기능적 섹션 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {/* 전체 통계 확인 */}
          <div className="bg-white p-8 rounded shadow-sm border border-stone-100 flex flex-col justify-between">
            <div>
              <h3 className="text-stone-400 text-xs tracking-widest uppercase mb-2">My Stories</h3>
              <p className="text-3xl font-bold">{projects.length}</p>
              <p className="text-stone-500 text-sm mt-1">{t('dashboard.projectOngoing')}</p>
            </div>
            <Link to="/projects" className="text-stone-900 text-sm font-semibold hover:underline mt-6 inline-block">
              {t('dashboard.projectList')}
            </Link>
          </div>
          
          {/* 포트폴리오 바로가기: PublicPortfolio.tsx와 연결 */}
          <div className="bg-stone-700 text-white p-8 rounded shadow-md flex flex-col justify-between">
            <div>
              <h3 className="text-stone-400 text-xs tracking-widest uppercase mb-2">Portfolio</h3>
              <p className="text-lg mb-2">{t('dashboard.portSharing')}</p>
            </div>
            <Link to={`/p/${user?.username}`} className="text-white text-sm font-semibold hover:underline underline-offset-4 hover:text-stone-300">
              {t('dashboard.goToPortfolio')}
            </Link>
          </div>

          {/* 새 프로젝트 생성 바로가기 */}
          <div className="bg-white p-8 rounded shadow-sm border border-stone-100 flex flex-col justify-between">
            <div>
              <h3 className="text-stone-400 text-xs tracking-widest uppercase mb-2">Quick Start</h3>
              <p className="text-lg mb-2">{t('dashboard.newProject')}</p>
            </div>
            <Link 
            to="/projects" 
            state={{ openForm: true }} // [추가] state를 통해 신호 전달
            className="inline-block bg-stone-700 text-white text-center py-2.5 px-4 text-sm rounded hover:bg-stone-800 transition-all"
            >
                {t('dashboard.makeNewProject')}
            </Link>
          </div>
        </div>

        {/* 3. Recent Projects: Projects.tsx의 그리드 디자인 활용 */}
        <section>
          <div className="flex items-end justify-between mb-8 border-b border-stone-200 pb-4">
            <Heading level={2} className="!mb-0">
              {t('dashboard.recent')}
            </Heading>
          </div>

          {recentProjects.length > 0 ? (
            <div className="grid gap-8" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
              {recentProjects.map(project => (
                <div key={project.id} className="transition-transform hover:-translate-y-1 duration-300">
                  <ProjectCard project={project} />
                </div>
              ))}
            </div>
          ) : (
            /* 프로젝트가 없을 때의 Empty State */
            <div className="bg-white/50 border-2 border-dashed border-stone-200 rounded-lg py-24 text-center">
              <p className="text-stone-400 text-lg mb-6">아직 기록된 이야기가 없습니다.</p>
              <Link to="/projects" className="bg-stone-900 text-white px-8 py-3 rounded text-sm tracking-widest hover:bg-stone-700 transition-all">
                첫 번째 프로젝트 시작하기
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}