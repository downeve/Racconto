import { useTranslation } from 'react-i18next'
import { Wordmark } from './Wordmark'

export default function AuthNavbar() {
  const { i18n } = useTranslation()

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'ko' ? 'en' : 'ko'
    i18n.changeLanguage(nextLang)
    localStorage.setItem('app_language', nextLang)
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-canvas/90 backdrop-blur-sm border-b border-edit-line">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Wordmark size="lg" tone="on-paper" />
        <button
          onClick={toggleLanguage}
          className="text-body md:text-h3 font-semibold text-faint hover:text-ink-2 hover:font-bold transition-[background,color,border] duration-150 ease-out"
        >
          {i18n.language === 'ko' ? 'EN' : 'KO'}
        </button>
      </div>
    </nav>
  )
}
