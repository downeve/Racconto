import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function PublicNavbar({ username, darkMode, compact }: { username?: string; darkMode?: boolean; compact?: boolean } = {}) {
  const { t, i18n } = useTranslation()

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'ko' ? 'en' : 'ko'
    i18n.changeLanguage(nextLang)
    localStorage.setItem('app_language', nextLang)
  }

  const dm = darkMode ?? false

  if (compact) {
    return (
      <nav className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-sm border-b transition-colors duration-300 ${dm ? 'bg-ink/90 border-hair/20' : 'bg-canvas/90 border-stone-200'}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className={`font-serif text-h3 inline-block transition-colors ${dm ? 'text-hair' : 'text-ink'}`}
              style={{ fontWeight: 700, letterSpacing: '0.08em', transform: 'translateY(1px)' }}
            >
              Racconto
            </Link>
            {username && (
              <Link
                to={`/p/${username}`}
                state={{ resetToList: true }}
                className={`text-small transition-colors ${dm ? 'text-faint hover:text-hair' : 'text-muted hover:text-ink'} hover:font-bold`}
              >
                @{username}
              </Link>
            )}
          </div>
          <Link
            to="/features"
            className={`text-body sm:text-small tracking-wider transition-colors hover:font-bold ${dm ? 'text-faint hover:text-hair' : 'text-ink-2 hover:text-ink'}`}
          >
            {t('nav.features')}
          </Link>
        </div>
      </nav>
    )
  }

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-sm border-b transition-colors duration-300 ${dm ? 'bg-ink/90 border-hair/20' : 'bg-canvas/90 border-stone-200'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* 로고 — serif, regular weight, 가벼운 tracking, 1px 광학 보정 */}
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className={`font-serif text-h3 inline-block transition-colors ${dm ? 'text-hair' : 'text-ink'}`}
              style={{
                fontWeight: 700,
                letterSpacing: '0.08em',
                transform: 'translateY(1px)',
              }}
            >
              Racconto
            </Link>
            {username && (
              <Link
                to={`/p/${username}`}
                state={{ resetToList: true }}
                className={`text-small transition-colors ${dm ? 'text-faint hover:text-hair' : 'text-muted hover:text-ink'} hover:font-bold`}
              >
                @{username}
              </Link>
            )}
          </div>
        <div className="flex items-center gap-3 sm:gap-6">
          <Link
            to="/features"
            className={`text-body sm:text-small tracking-wider transition-colors hover:font-bold ${dm ? 'text-faint hover:text-hair' : 'text-ink-2 hover:text-ink'}`}
          >
            {t('nav.features')}
          </Link>
          <button
            onClick={toggleLanguage}
            className={`text-small font-semibold tracking-widest transition-colors hover:font-bold ${dm ? 'text-faint hover:text-hair' : 'text-faint hover:text-ink-2'}`}
          >
            {i18n.language === 'ko' ? 'EN' : 'KO'}
          </button>
          <Link
            to="/login"
            className={`hidden sm:inline-flex text-body sm:text-small tracking-wider transition-colors hover:font-bold ${dm ? 'text-faint hover:text-hair' : 'text-ink-2 hover:text-ink'}`}
          >
            {t('auth.login')}
          </Link>
          <Link
            to="/register"
            className="hidden sm:inline-flex tracking-wider text-small btn-primary transition-colors whitespace-nowrap"
          >
            {t('auth.register')}
          </Link>
        </div>
      </div>
    </nav>
  )
}
