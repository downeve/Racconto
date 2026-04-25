import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function PublicNavbar() {
  const { t, i18n } = useTranslation()

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'ko' ? 'en' : 'ko'
    i18n.changeLanguage(nextLang)
    localStorage.setItem('app_language', nextLang)
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-canvas/90 backdrop-blur-sm border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* 로고 — serif, regular weight, 가벼운 tracking, 1px 광학 보정 */}
          <Link
            to="/"
            className="font-serif text-h3 text-ink inline-block"
            style={{
              fontWeight: 700,
              letterSpacing: '0.08em',
              transform: 'translateY(1px)',
            }}
          >
            Racconto
          </Link>
        <div className="flex items-center gap-3 sm:gap-6">
          <Link
            to="/features"
            className="text-body sm:text-small tracking-wider text-ink-2 hover:text-accent hover:underline transition-colors"
          >
            {t('nav.features')}
          </Link>
          <button
            onClick={toggleLanguage}
            className="text-small font-semibold text-faint hover:text-ink-2 hover:underline tracking-widest transition-colors"
          >
            {i18n.language === 'ko' ? 'EN' : 'KO'}
          </button>
          <Link
            to="/login"
            className="hidden sm:inline-flex text-body sm:text-small tracking-wider text-ink-2 hover:text-accent hover:underline transition-colors"
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
