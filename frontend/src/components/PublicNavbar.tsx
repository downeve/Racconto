import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function PublicNavbar({ username, darkMode, compact }: { username?: string; darkMode?: boolean; compact?: boolean } = {}) {
  const { t, i18n } = useTranslation()

  // 🚨 누락되었던 부분 추가: 상태(State)와 참조(Ref) 선언
  const [isLangOpen, setIsLangOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // i18n.language가 없을 경우를 대비해 기본값 'ko' 설정
  const currentLang = (i18n.language || 'ko').substring(0, 2);

  // 언어 변경 함수
  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang)
    localStorage.setItem('app_language', lang)
    setIsLangOpen(false) // 변경 후 드롭다운 닫기
  }

  // 외부 클릭 시 드롭다운 닫기 로직
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

  if (compact) {
    return (
      <nav className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-sm border-b transition-[background,color,border] duration-150 ease-out ${dm ? 'bg-ink/90 border-hair/20' : 'bg-canvas/90 border-stone-200'}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className={`font-serif text-h2 inline-block transition-[background,color,border] duration-150 ease-out ${dm ? 'text-hair' : 'text-ink'}`}
              style={{ fontWeight: 700, letterSpacing: '0.08em', transform: 'translateY(1px)' }}
            >
              Racconto
            </Link>
            {username && (
              <Link
                to={`/${username}`}
                state={{ resetToList: true }}
                className={`text-body transition-[background,color,border] duration-150 ease-out ${dm ? 'text-faint hover:text-hair' : 'text-muted hover:text-ink'} hover:font-bold`}
              >
                @{username}
              </Link>
            )}
          </div>
          {/* 기능 소개 페이지 일시 숨김 처리
          <Link
            to="/features"
            className={`text-body sm:text-h3 tracking-wider transition-[background,color,border] duration-150 ease-out hover:font-bold ${dm ? 'text-faint hover:text-hair' : 'text-ink-2 hover:text-ink'}`}
          >
            {t('nav.features')}
          </Link>
          */}
        </div>
      </nav>
    )
  }

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-sm border-b transition-[background,color,border] duration-150 ease-out ${dm ? 'bg-ink/90 border-hair/20' : 'bg-canvas/90 border-stone-200'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* 로고 — serif, regular weight, 가벼운 tracking, 1px 광학 보정 */}
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className={`font-serif text-h2 md:text-h2 inline-block transition-[background,color,border] duration-150 ease-out ${dm ? 'text-hair' : 'text-ink'}`}
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
                to={`/${username}`}
                state={{ resetToList: true }}
                className={`texy-body md:text-h3 transition-[background,color,border] duration-150 ease-out ${dm ? 'text-faint hover:text-hair' : 'text-muted hover:text-ink'} hover:font-bold`}
              >
                @{username}
              </Link>
            )}
          </div>
        <div className="flex items-center gap-3 sm:gap-6">
          {/* 기능 소개 페이지 일시 숨김 처리
          <Link
            to="/features"
            className={`text-body md:text-h3 tracking-wider hover:font-bold transition-[background,color,border] duration-150 ease-out ${dm ? 'text-faint hover:text-hair' : 'text-ink-2 hover:text-ink'}`}
          >
            {t('nav.features')}
          </Link>
          */}

          <div className="flex items-center gap-3 sm:gap-6">
          {/* 드롭다운 언어 선택기 */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsLangOpen(!isLangOpen)}
              className={`flex items-center gap-1 text-body md:text-h3 font-semibold tracking-widest transition-colors duration-150 ${dm ? 'text-faint hover:text-hair' : 'text-faint hover:text-ink-2'}`}
            >
              {currentLang.toUpperCase()}
              <span className={`text-[10px] transition-transform duration-200 ${isLangOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {isLangOpen && (
              <div className={`absolute right-0 mt-2 py-2 w-32 rounded-md shadow-lg border transition-all duration-150 ${dm ? 'bg-ink border-hair/20' : 'bg-white border-stone-200'}`}>
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => changeLanguage(lang.code)}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      currentLang === lang.code
                        ? (dm ? 'bg-hair/10 text-hair font-bold' : 'bg-stone-100 text-ink font-bold')
                        : (dm ? 'text-faint hover:bg-hair/5 hover:text-hair' : 'text-muted hover:bg-stone-50 hover:text-ink')
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
            className={`hidden sm:inline-flex texty-body md:text-h3 tracking-wider hover:font-bold transition-[background,color,border] duration-150 ease-out ${dm ? 'text-faint hover:text-hair' : 'text-ink-2 hover:text-ink'}`}
          >
            {t('download.menu')}
          </Link>
          <Link
            to="/login"
            className={`hidden sm:inline-flex texty-body md:text-h3 tracking-wider hover:font-bold transition-[background,color,border] duration-150 ease-out ${dm ? 'text-faint hover:text-hair' : 'text-ink-2 hover:text-ink'}`}
          >
            {t('auth.login')}
          </Link>
          <Link
            to="/register"
            className="hidden sm:inline-flex tracking-wider text-body btn-primary whitespace-nowrap"
          >
            {t('auth.register')}
          </Link>
        </div>
      </div>
    </nav>
  )
}
