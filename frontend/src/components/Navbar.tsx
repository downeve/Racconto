import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

interface NavbarProps {
  onLogout: () => void
}

export default function Navbar({ onLogout }: NavbarProps) {
  const { t } = useTranslation()

  return (
    <nav className="fixed top-0 left-0 right-0 z-[60] bg-canvas/90 backdrop-blur-sm border-b border-stone-200 text-stone-900">
      <div className="px-4 h-14 flex items-center justify-between">
        <Link
          to="/"
          className="text-body font-serif text-ink tracking-widest"
          style={{ letterSpacing: '0.15em' }}
        >
          Racconto
        </Link>
        <button
          onClick={onLogout}
          className="text-small tracking-wider text-faint hover:text-accent hover:underline"
        >
          {t('auth.logout')}
        </button>
      </div>
    </nav>
  )
}
