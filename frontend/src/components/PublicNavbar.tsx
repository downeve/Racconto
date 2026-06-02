import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Wordmark } from './Wordmark'
import ThemeToggle from './ThemeToggle'

/**
 * 공개 페이지 네비게이션. 색은 의미 토큰만(상위 [data-theme] 스코프가 자동 라이트/다크 매핑).
 * 테마 토글(ThemeToggle)은 전역 사이트 테마를 전환 — 포트폴리오·랜딩·Explore 어디서나 동일.
 */
export default function PublicNavbar({
  username, compact, portfolio, showUsername, compactLogo, minimal,
}: {
  username?: string
  compact?: boolean
  portfolio?: boolean
  showUsername?: boolean
  compactLogo?: boolean
  minimal?: boolean
} = {}) {
  const { t, i18n } = useTranslation()

  const [isLangOpen, setIsLangOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const currentLang = (i18n.language || 'ko').substring(0, 2)

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

  const languages = [
    { code: 'ko', label: '한국어 (KO)' },
    { code: 'en', label: 'English (EN)' },
    { code: 'ja', label: '日本語 (JA)' },
  ]

  const navBar = 'fixed top-0 left-0 right-0 z-50 backdrop-blur-sm border-b border-hair bg-canvas/90 transition-[background,color,border] duration-150 ease-out'
  const navLink = 'text-body md:text-h3 transition-[background,color,border] duration-150 ease-out text-muted hover:text-ink hover:font-bold'

  const ToggleBtn = <ThemeToggle className="w-8 h-8" />

  if (portfolio) {
    return (
      <nav className={navBar}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Wordmark size={compactLogo ? 'md' : 'lg'} tone="on-paper" />
          <div className="flex items-center gap-3 sm:gap-6">
            {!minimal && (
              <>
                <Link to="/explore" className={navLink}>
                  {t('explore.menu', 'Explore')}
                </Link>
                {username && (
                  <Link to={`/${username}`} state={{ resetToList: true }} className={navLink}>
                    @{username}
                  </Link>
                )}
              </>
            )}
            {ToggleBtn}
          </div>
        </div>
      </nav>
    )
  }

  if (compact) {
    return (
      <nav className={navBar}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wordmark size="lg" tone="on-paper" />
            {username && showUsername !== false && (
              <Link to={`/${username}`} state={{ resetToList: true }}
                className="text-body transition-[background,color,border] duration-150 ease-out text-muted hover:text-ink hover:font-bold">
                @{username}
              </Link>
            )}
          </div>
          {ToggleBtn}
        </div>
      </nav>
    )
  }

  return (
    <nav className={navBar}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wordmark size="lg" tone="on-paper" />
            {username && (
              <Link to={`/${username}`} state={{ resetToList: true }} className={navLink}>
                @{username}
              </Link>
            )}
          </div>
        <div className="flex items-center gap-3 sm:gap-6">
          {/* 드롭다운 언어 선택기 */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsLangOpen(!isLangOpen)}
              className="flex items-center gap-1 t-eyebrow transition-colors duration-150 text-faint hover:text-ink-2"
            >
              {currentLang.toUpperCase()}
              <span className={`transition-transform duration-200 ${isLangOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {isLangOpen && (
              <div className="absolute right-0 mt-2 py-2 w-32 rounded-md shadow-lg border border-hair bg-card transition-all duration-150">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => changeLanguage(lang.code)}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      currentLang === lang.code
                        ? 'bg-canvas-2 text-ink font-bold'
                        : 'text-muted hover:bg-canvas-2 hover:text-ink'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 전역 테마 빠른 토글 — 공개 화면(랜딩·Explore·로그인) 비로그인 사용자도 사용 */}
          <ThemeToggle />

          {/* Explore 는 모바일에서도 노출 — 비로그인 모바일 사용자의 핵심 진입점 */}
          <Link to="/explore"
            className="inline-flex text-body md:text-h3 tracking-wider hover:font-bold transition-[background,color,border] duration-150 ease-out text-ink-2 hover:text-ink">
            {t('explore.menu', 'Explore')}
          </Link>
          <Link to="/download"
            className="hidden sm:inline-flex text-body md:text-h3 tracking-wider hover:font-bold transition-[background,color,border] duration-150 ease-out text-ink-2 hover:text-ink">
            {t('download.menu')}
          </Link>
          <Link to="/login"
            className="hidden sm:inline-flex text-body md:text-h3 tracking-wider hover:font-bold transition-[background,color,border] duration-150 ease-out text-ink-2 hover:text-ink">
            {t('auth.login')}
          </Link>
          <Link to="/register"
            className="hidden sm:inline-flex justify-center tracking-wider text-body btn-primary whitespace-nowrap min-w-[8.5rem]">
            {t('auth.register')}
          </Link>
        </div>
      </div>
    </nav>
  )
}
