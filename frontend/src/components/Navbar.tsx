import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL
const isElectron = typeof window !== 'undefined' && !!window.racconto
const isMobileDevice = /Android.*Mobile|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

interface NavbarProps {
  onLogout: () => void
}

export default function Navbar({ onLogout }: NavbarProps) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [username, setUsername] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e: MouseEvent) => {
      const el = document.getElementById('user-avatar-dropdown')
      if (el && !el.contains(e.target as Node)) setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    axios.get(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setUsername(res.data.username || null)
      setEmail(res.data.email || null)
    })

    // 💡 [추가] 'usernameChanged' 이벤트가 발생하면 새 유저네임으로 상태 업데이트
    const handleUsernameChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      setUsername(customEvent.detail || null);
    };

    window.addEventListener('usernameChanged', handleUsernameChange);

    // 컴포넌트가 언마운트될 때 리스너 정리
    return () => {
      window.removeEventListener('usernameChanged', handleUsernameChange);
    };
  }, [])

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'ko' ? 'en' : 'ko'
    i18n.changeLanguage(nextLang)
    localStorage.setItem('app_language', nextLang)
  }

  const handlePortfolioClick = () => {
    if (username) {
      navigate(`/p/${username}`, { state: { resetToList: true } })
    } else {
      navigate('/p/@setup')
    }
  }

  const avatarInitial = email ? email[0].toUpperCase() : '?'

  if (isMobileDevice) {
    return (
      <nav className="fixed top-0 left-0 right-0 z-[60] bg-canvas/90 backdrop-blur-sm border-b border-stone-200 text-stone-900">
        <div className="px-4 h-14 flex items-center justify-between">
          <Link
            to="/"
            className="text-body font-serif text-ink tracking-widest"
            style={{ letterSpacing: '0.15em' }}
          >
            Racconto
          </Link>
          <button
            onClick={onLogout}
            className="text-small tracking-wider text-faint hover:text-accent hover:underline"
          >
            {t('auth.logout')}
          </button>
        </div>
      </nav>
    )
  }

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 bg-[#F7F4F0]/90 backdrop-blur-sm border-b border-stone-200 text-stone-900"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div
        className="max-w-7xl mx-auto h-14 flex items-center justify-between"
        style={{ paddingLeft: isElectron ? '5rem' : '1.5rem', paddingRight: '1.5rem' }}
      >
        {/* 좌측: 로고 + 주 내비 */}
        <div
          className="flex items-center gap-8"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
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
          <Link
            to="/projects"
            className="text-small uppercase text-muted hover:text-ink-2 hover:font-bold"
          >
            {t('nav.projects')}
          </Link>
          <button
            onClick={handlePortfolioClick}
            className="text-small uppercase text-muted hover:text-ink-2 hover:font-bold"
          >
            {t('nav.portfolio')}
          </button>
        </div>

        {/* 우측: 아바타 드롭다운 */}
        <div
          id="user-avatar-dropdown"
          className="relative"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button
            onClick={() => setDropdownOpen(v => !v)}
            className="w-8 h-8 rounded-full bg-ink-2 text-card text-small font-bold flex items-center justify-center hover:bg-muted transition-[background,color,border] duration-150 ease-out"
          >
            {avatarInitial}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-card rounded-card shadow border border-hair py-1 z-50">
              {email && (
                <div className="px-3 py-2 text-small text-muted border-b border-hair truncate">
                  {email}
                </div>
              )}
              <Link
                to="/settings"
                onClick={() => setDropdownOpen(false)}
                className="w-full text-left px-3 py-2 text-small text-ink-2 hover:bg-hair/30 flex items-center gap-2"
              >
                {t('nav.settings')}
              </Link>
              <Link
                to="/trash"
                onClick={() => setDropdownOpen(false)}
                className="w-full text-left px-3 py-2 text-small text-ink-2 hover:bg-hair/30 items-center gap-2 block"
              >
                {t('nav.trash')}
              </Link>
              <div className="border-t border-hair my-1" />
              <button
                onClick={() => { toggleLanguage(); setDropdownOpen(false) }}
                className="w-full text-left px-3 py-2 text-small text-muted hover:bg-hair/30"
              >
                {i18n.language === 'ko' ? 'English' : '한국어'}
              </button>
              <button
                onClick={() => { setDropdownOpen(false); onLogout() }}
                className="w-full text-left px-3 py-2 text-small text-red-400 hover:bg-red-50"
              >
                {t('auth.logout')}
              </button>
            </div>
          )}
        </div>

      </div>
    </nav>
  )
}