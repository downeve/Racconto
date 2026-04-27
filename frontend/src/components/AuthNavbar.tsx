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
        <button
          onClick={toggleLanguage}
          className="text-small font-semibold text-faint hover:text-ink-2 hover:font-bold transition-[background,color,border] duration-150 ease-out"
        >
          {i18n.language === 'ko' ? 'EN' : 'KO'}
        </button>
      </div>
    </nav>
  )
}
