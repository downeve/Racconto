import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function AuthNavbar() {
  const { i18n } = useTranslation()

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'ko' ? 'en' : 'ko'
    i18n.changeLanguage(nextLang)
    localStorage.setItem('app_language', nextLang)
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#F7F4F0]/90 backdrop-blur-sm border-b border-stone-200 text-stone-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link
          to="/"
          className="font-serif font-bold text-h3 text-ink tracking-widest"
          style={{ letterSpacing: '0.15em' }}
        >
          Racconto
        </Link>
        <button
          onClick={toggleLanguage}
          className="text-small font-semibold text-faint hover:text-ink-2 hover:underline transition-colors"
        >
          {i18n.language === 'ko' ? 'EN' : 'KO'}
        </button>
      </div>
    </nav>
  )
}
