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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#F7F4F0]/90 backdrop-blur-sm border-b border-stone-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link
          to="/"
          className="text-xl font-bold tracking-widest"
          style={{ fontFamily: "'Georgia', serif", letterSpacing: '0.15em' }}
        >
          Racconto
        </Link>
        <div className="flex items-center gap-3 sm:gap-6">
          <Link
            to="/features"
            className="text-xs sm:text-sm tracking-wider text-stone-600 hover:text-stone-900 transition-colors"
          >
            {t('nav.features')}
          </Link>
          <button
            onClick={toggleLanguage}
            className="text-xs font-bold text-stone-400 hover:text-stone-700 tracking-widest transition-colors"
          >
            {i18n.language === 'ko' ? 'EN' : 'KO'}
          </button>
          <Link
            to="/login"
            className="hidden sm:inline-flex text-xs sm:text-sm tracking-wider text-stone-600 hover:text-stone-900 transition-colors"
          >
            {t('auth.login')}
          </Link>
          <Link
            to="/register"
            className="hidden sm:inline-flex text-xs sm:text-sm tracking-wider bg-stone-900 text-white px-3 py-1.5 sm:px-4 sm:py-2 hover:bg-stone-700 transition-colors rounded whitespace-nowrap"
          >
            {t('auth.register')}
          </Link>
        </div>
      </div>
    </nav>
  )
}
