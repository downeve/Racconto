import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function PublicNavbar({ username, darkMode, compact }: { username?: string; darkMode?: boolean; compact?: boolean } = {}) {
  const { t, i18n } = useTranslation()

  // i18n.language가 없을 경우를 대비해 기본값 'ko' 설정
  const currentLang = (i18n.language || 'ko').substring(0, 2);

  const toggleLanguage = () => {
    const langMap: Record<string, string> = {
      'ko': 'en',
      'en': 'ja',
      'ja': 'ko'
    };
    
    const nextLang = langMap[currentLang] || 'ko';

    i18n.changeLanguage(nextLang)
    localStorage.setItem('app_language', nextLang)
  }

  // 3. 버튼에 표시할 라벨 생성 로직
  const getLangLabel = () => {
    switch (currentLang) {
      case 'ko': return 'EN / JA';
      case 'en': return 'JA / KO';
      case 'ja': return 'KO / EN';
      default: return 'EN / JA';
    }
  };

  const dm = darkMode ?? false

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
          {/* 언어 토글 버튼 수정 부분 */}
          <button
            onClick={toggleLanguage}
            className={`text-body md:text-h3 font-semibold tracking-widest hover:font-bold transition-[background,color,border] duration-150 ease-out ${dm ? 'text-faint hover:text-hair' : 'text-faint hover:text-ink-2'}`}
          >
            {getLangLabel()}
          </button>
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
