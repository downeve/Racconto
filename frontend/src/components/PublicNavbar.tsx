import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sun, Moon } from 'lucide-react'
import { Wordmark } from './Wordmark'

export default function PublicNavbar({ username, darkMode, compact, portfolio, onToggleDark, showUsername, compactLogo }: { username?: string; darkMode?: boolean; compact?: boolean; portfolio?: boolean; onToggleDark?: () => void; showUsername?: boolean; compactLogo?: boolean } = {}) {
  const { t, i18n } = useTranslation()

  const [isLangOpen, setIsLangOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const currentLang = (i18n.language || 'ko').substring(0, 2);

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang)
    localStorage.setItem('app_language', lang)
    setIsLangOpen(false)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLangOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const dm = darkMode ?? false

  const languages = [
    { code: 'ko', label: '한국어 (KO)' },
    { code: 'en', label: 'English (EN)' },
    { code: 'ja', label: '日本語 (JA)' },
  ]

  if (portfolio) {
    return (
      <nav className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-sm border-b transition-[background,color,border] duration-150 ease-out ${dm ? 'bg-ink/90 border-hair/20' : 'bg-canvas/90 border-edit-line'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Wordmark size={compactLogo ? 'md' : 'lg'} tone={dm ? 'on-ink' : 'on-paper'} />
          <div className="flex items-center gap-3 sm:gap-6">
            {username && (
              <Link
                to={`/${username}`}
                state={{ resetToList: true }}
                className={`text-body md:text-h3 transition-[background,color,border] duration-150 ease-out ${dm ? 'text-faint hover:text-hair' : 'text-muted hover:text-ink'} hover:font-bold`}
              >
                @{username}
              </Link>
            )}
            {onToggleDark && (
              <button
                onClick={onToggleDark}
                aria-label="다크 모드 전환"
                className={`inline-flex items-center gap-1 px-3 py-1 text-xs rounded-btn border ${dm ? 'border-ink-2 text-faint' : 'border-faint text-muted'}`}
              >
                {dm
                  ? <><Sun size={12} strokeWidth={1.5} /> {t('settings.themeBeige')}</>
                  : <><Moon size={12} strokeWidth={1.5} /> {t('settings.themeDark')}</>}
              </button>
            )}
          </div>
        </div>
      </nav>
    )
  }

  if (compact) {
    return (
      <nav className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-sm border-b transition-[background,color,border] duration-150 ease-out ${dm ? 'bg-ink/90 border-hair/20' : 'bg-canvas/90 border-edit-line'}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wordmark size="lg" tone={dm ? 'on-ink' : 'on-paper'} />
            {username && showUsername !== false && (
              <Link
                to={`/${username}`}
                state={{ resetToList: true }}
                className={`text-body transition-[background,color,border] duration-150 ease-out ${dm ? 'text-faint hover:text-hair' : 'text-muted hover:text-ink'} hover:font-bold`}
              >
                @{username}
              </Link>
            )}
          </div>
          {onToggleDark && (
            <button
              onClick={onToggleDark}
              aria-label="다크 모드 전환"
              className={`inline-flex items-center gap-1 px-3 py-1 text-xs rounded-btn border ${dm ? 'border-ink-2 text-faint' : 'border-faint text-muted'}`}
            >
              {dm
                ? <><Sun size={12} strokeWidth={1.5} /> {t('settings.themeBeige')}</>
                : <><Moon size={12} strokeWidth={1.5} /> {t('settings.themeDark')}</>}
            </button>
          )}
        </div>
      </nav>
    )
  }

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-sm border-b transition-[background,color,border] duration-150 ease-out ${dm ? 'bg-ink/90 border-hair/20' : 'bg-canvas/90 border-edit-line'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wordmark size="lg" tone={dm ? 'on-ink' : 'on-paper'} />
            {username && (
              <Link
                to={`/${username}`}
                state={{ resetToList: true }}
                className={`text-body md:text-h3 transition-[background,color,border] duration-150 ease-out ${dm ? 'text-faint hover:text-hair' : 'text-muted hover:text-ink'} hover:font-bold`}
              >
                @{username}
              </Link>
            )}
          </div>
        <div className="flex items-center gap-3 sm:gap-6">
          {/* 드롭다운 언어 선택기 */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsLangOpen(!isLangOpen)}
              className={`flex items-center gap-1 t-eyebrow transition-colors duration-150 ${dm ? 'text-faint hover:text-hair' : 'text-faint hover:text-ink-2'}`}
            >
              {currentLang.toUpperCase()}
              <span className={`transition-transform duration-200 ${isLangOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {isLangOpen && (
              <div className={`absolute right-0 mt-2 py-2 w-32 rounded-md shadow-lg border transition-all duration-150 ${dm ? 'bg-ink border-hair/20' : 'bg-edit-paper border-edit-line'}`}>
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => changeLanguage(lang.code)}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      currentLang === lang.code
                        ? (dm ? 'bg-hair/10 text-hair font-bold' : 'bg-edit-faint/10 text-ink font-bold')
                        : (dm ? 'text-faint hover:bg-hair/5 hover:text-hair' : 'text-muted hover:bg-edit-faint/5 hover:text-ink')
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Link
            to="/download"
            className={`hidden sm:inline-flex text-body md:text-h3 tracking-wider hover:font-bold transition-[background,color,border] duration-150 ease-out ${dm ? 'text-faint hover:text-hair' : 'text-ink-2 hover:text-ink'}`}
          >
            {t('download.menu')}
          </Link>
          <Link
            to="/login"
            className={`hidden sm:inline-flex text-body md:text-h3 tracking-wider hover:font-bold transition-[background,color,border] duration-150 ease-out ${dm ? 'text-faint hover:text-hair' : 'text-ink-2 hover:text-ink'}`}
          >
            {t('auth.login')}
          </Link>
          <Link
            to="/register"
            className="hidden sm:inline-flex justify-center tracking-wider text-body btn-primary whitespace-nowrap min-w-[8.5rem]"
          >
            {t('auth.register')}
          </Link>
        </div>
      </div>
    </nav>
  )
}
