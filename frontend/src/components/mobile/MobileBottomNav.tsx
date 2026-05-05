import { useLocation, useNavigate } from 'react-router-dom'
import { Camera, Aperture, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'

const TABS = [
  { key: 'projects', path: '/projects', Icon: Camera, labelKey: 'common.projects' },
  { key: 'portfolio', path: null, Icon: Aperture, labelKey: 'common.portfolio' },
  { key: 'settings', path: '/settings', Icon: Settings, labelKey: 'common.settings' },
]

export default function MobileBottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user } = useAuth()

  const getPortfolioPath = () => user?.username ? `/${user.username}` : '/projects'

  const isActive = (key: string) => {
    if (key === 'projects') return location.pathname === '/projects' || location.pathname.startsWith('/projects/')
    if (key === 'portfolio') return user?.username ? location.pathname === `/${user.username}` : false
    if (key === 'settings') return location.pathname === '/settings'
    return false
  }

  return (
    <nav
      className="flex items-center bg-[#F7F4F0] border-t border-stone-200 shrink-0"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {TABS.map(({ key, path, Icon, labelKey }) => {
        const active = isActive(key)
        return (
          <button
            key={key}
            onClick={() => navigate(path ?? getPortfolioPath())}
            className={`flex flex-col items-center justify-center gap-1 flex-1 min-h-[56px] transition-colors ${active ? 'text-stone-900' : 'text-stone-400'}`}
          >
            <Icon size={22} strokeWidth={1.5} />
            <span className="text-[10px] font-medium">{t(labelKey)}</span>
          </button>
        )
      })}
    </nav>
  )
}
