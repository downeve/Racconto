import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext' // AuthContext가 구현되어 있다고 가정
import ProjectCard from '../components/ProjectCard'
import CoverFallback from '../components/CoverFallback'
import { cfUrl } from '../utils/cfImage'

const API = import.meta.env.VITE_API_URL
const isElectron = typeof window !== 'undefined' && !!window.racconto

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
  updated_at: string
}

// 본인 팔로워 수 인라인 표시 — Portfolio 텍스트 옆에 한 줄로. 안내 문구는 title 툴팁.
function FollowerCountInline() {
  const { t } = useTranslation()
  const { data } = useQuery({
    queryKey: ['my-follower-count'],
    queryFn: async () => (await axios.get<{ follower_count: number }>(`${API}/follows/me/count`)).data,
    staleTime: 1000 * 60 * 5,
  })
  if (!data) return null
  return (
    <p
      className="text-small text-muted"
      title={t('follow.followersHint', "Only visible to you. Followers won't see this number.")}
    >
      <span className="font-semibold text-ink">{data.follower_count}</span>
      <span className="ml-1">{t('follow.followersLabel', 'followers')}</span>
    </p>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { t } = useTranslation()

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await axios.get<Project[]>(`${API}/projects/`)
      return res.data
    },
  })

  const publicProjects = projects.filter(p => p.is_public === 'true').slice(0, 3)

  const recentProjects = [...projects]
    .filter(p => p.status !== 'archived')
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 3)

  return (
    <div className="min-h-screen pb-20">
      <div className={`max-w-7xl mx-auto px-6 ${isElectron ? 'pt-4' : 'pt-space-md'}`}>
        
        {/* 1. Welcome Section */}
        <section className="mb-space-md">
          <p className="t-eyebrow text-muted mb-3">Welcome back</p>
          <h1 className="font-serif text-[1.25rem] font-normal text-ink-2 [word-break:keep-all]">
            {t('dashboard.title1')} {t('dashboard.title2')}
          </h1>
        </section>

        {/* 2. Quick Actions: 대시보드만의 기능적 섹션 */}
        <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-6 mb-space-md">
          {/* My Stories + Quick Start 합침 */}
          <div className="border-y border-hair py-8 flex flex-col gap-5">
            {/* 상단: My Stories */}
            <div>
              <div className="flex items-stretch">
                <div className="flex flex-col justify-between min-w-[140px]">
                  <div className="text-center">
                    <p className="text-body text-muted mb-2">My Stories</p>
                    <p className="font-serif text-[2.5rem] font-normal tracking-tight">{projects.length}</p>
                    <p className="text-muted text-body mt-1">{t('dashboard.totalStories')}</p>
                  </div>
                </div>
                <div className="w-px bg-hair self-stretch mx-5" />
                <div className="grid grid-cols-2 grid-rows-2 gap-x-4 gap-y-3 flex-1 self-center">
                  {[
                    { labelKey: 'status.in_progress', value: 'in_progress', color: 'bg-status-progress' },
                    { labelKey: 'status.completed',   value: 'completed',   color: 'bg-status-completed' },
                    { labelKey: 'status.published',   value: 'published',   color: 'bg-status-published'  },
                    { labelKey: 'status.archived',    value: 'archived',    color: 'bg-status-archived' },
                  ].map(({ labelKey, value, color }) => (
                    <div key={value} className="flex flex-col items-center gap-0.5">
                      <span className="flex items-center gap-1.5 t-eyebrow text-muted">
                        <span className={`w-2 h-2 rounded-full ${color}`} />
                        {t(labelKey)}
                      </span>
                      <span className="font-serif text-[1.25rem] font-medium text-ink">
                        {projects.filter(p => p.status === value).length}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <Link to="/projects" className="text-ink-2 text-body font-semibold hover:text-ink hover:underline underline-offset-4 mt-4 inline-block">
                {t('dashboard.projectList')}
              </Link>
            </div>

            <div className="border-t border-hair" />

            {/* 하단: Quick Start */}
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-body text-muted mb-2">Quick Start</p>
                {recentProjects[0] && (
                  <p className="text-muted text-body mb-3 truncate">
                    {t('dashboard.lastUpdated')} · {recentProjects[0].title}
                  </p>
                )}
                <p className="font-serif text-[1.75rem] font-normal tracking-tight mb-2">{t('dashboard.newProject')}</p>
              </div>
              <Link
                to="/projects"
                state={{ openForm: true }}
                className="inline-block text-body text-center btn-primary transition-all"
              >
                {t('dashboard.makeNewProject')}
              </Link>
            </div>
          </div>

          {/* 포트폴리오 바로가기 */}
          <div className="border-y border-hair py-8 flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-body text-muted">Portfolio</p>
              <FollowerCountInline />
            </div>
            <div className="relative flex-1 min-h-0">
              {publicProjects.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center gap-1">
                  <p className="text-ink-2 text-h2 font-serif">{t('dashboard.noPublicProjects')}</p>
                  <p className="text-muted text-h3">{t('dashboard.noPublicProjectsHint')}</p>
                </div>
              ) : (
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 gap-2">
                  {publicProjects[0] && (() => {
                    const p = publicProjects[0]
                    const to = p.slug ? `/${user?.username}/${p.slug}` : `/${user?.username}`
                    return (
                      <Link to={to} className="col-span-2 row-span-2 overflow-hidden bg-hair/50 block">
                        {p.cover_image_url
                          ? <img src={cfUrl(p.cover_image_url, 'cover')} alt={p.title} className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                          : <CoverFallback title={p.title} />
                        }
                      </Link>
                    )
                  })()}
                  {publicProjects.slice(1, 3).map(p => {
                    const to = p.slug ? `/${user?.username}/${p.slug}` : `/${user?.username}`
                    return (
                      <Link key={p.id} to={to} className="overflow-hidden bg-hair/50 block">
                        {p.cover_image_url
                          ? <img src={cfUrl(p.cover_image_url, 'grid')} alt={p.title} className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                          : <CoverFallback title={p.title} />
                        }
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
            <Link to={`/${user?.username}`} className="text-ink-2 text-body mt-2 font-semibold hover:underline underline-offset-4">
              {t('dashboard.goToPortfolio')}
            </Link>
          </div>
        </div>

        {/* 3. Recent Projects: Projects.tsx의 그리드 디자인 활용 */}
        <section>
          <div className="mb-space-sm border-b border-hair pb-4">
            <p className="text-body text-muted">{t('dashboard.recent')}</p>
          </div>

          {recentProjects.length > 0 ? (
            <div className="grid gap-8" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
              {recentProjects.map(project => (
                <div key={project.id} className="relative group self-start transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-1 hover:shadow-deep">
                  <ProjectCard project={project} />
                </div>
              ))}
            </div>
          ) : (
            <div className="py-space-xl text-center">
              <p className="font-serif text-h2 text-ink-2 mb-3">
                {t('dashboard.emptyTitle')}
              </p>
              <p className="text-muted text-body">
                {t('dashboard.emptySubtitle')}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}