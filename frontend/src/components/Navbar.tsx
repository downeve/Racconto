import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Wordmark } from './Wordmark'
import ThemeToggle from './ThemeToggle'

interface NavbarProps {
  onLogout: () => void
}

export default function Navbar({ onLogout }: NavbarProps) {
  const { t } = useTranslation()

  return (
    <nav className="fixed top-0 left-0 right-0 z-[60] bg-canvas/90 backdrop-blur-sm border-b border-edit-line">
      <div className="px-4 h-14 flex items-center justify-between">
        <Wordmark size="sm" tone="on-paper" />
        <div className="flex items-center gap-4">
          <Link
            to="/explore"
            className="text-small tracking-wider text-faint hover:text-accent"
          >
            {t('explore.menu', 'Explore')}
          </Link>
          <ThemeToggle />
          <button
            onClick={onLogout}
            className="text-small tracking-wider text-faint hover:text-accent hover:underline"
          >
            {t('auth.logout')}
          </button>
        </div>
      </div>
    </nav>
  )
}
