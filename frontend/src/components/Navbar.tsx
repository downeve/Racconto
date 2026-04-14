import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL
const isElectron = typeof window !== 'undefined' && !!window.racconto
const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

interface NavbarProps {
  onLogout: () => void
}

export default function Navbar({ onLogout }: NavbarProps) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [username, setUsername] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    axios.get(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setUsername(res.data.username || null))

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
      navigate(`/p/${username}`)
    } else {
      navigate('/p/@setup')
    }
  }

  if (isMobileDevice) {
    return (
      <nav className="fixed top-0 left-0 right-0 z-[60] bg-[#F7F4F0]/90 backdrop-blur-sm border-b border-stone-200 text-stone-900">
        <div className="px-4 h-14 flex items-center justify-between">
          <Link
            to="/"
            className="text-xl font-bold tracking-widest"
            style={{ fontFamily: "'Georgia', serif", letterSpacing: '0.15em' }}
          >
            Racconto
          </Link>
          <button
            onClick={onLogout}
            className="text-sm tracking-wider text-stone-400 hover:text-stone-900"
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
        <Link
          to="/"
          className="text-xl font-bold tracking-widest"
          style={{ fontFamily: "'Georgia', serif", letterSpacing: '0.15em', WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          Racconto
        </Link>
        <div
          className="flex gap-6 items-center"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <Link to="/projects" className="text-sm tracking-wider text-stone-600 hover:text-stone-900">{t('nav.projects')}</Link>
          <button
            onClick={handlePortfolioClick}
            className="text-sm tracking-wider text-stone-600 hover:text-stone-900"
          >
            {t('nav.portfolio')}
          </button>
          <Link to="/trash" className="text-sm tracking-wider text-stone-600 hover:text-stone-900">{t('nav.trash')}</Link>
          <Link to="/settings" className="text-sm tracking-wider text-stone-600 hover:text-stone-900">{t('nav.settings')}</Link>
          <button
            onClick={toggleLanguage}
            className="text-sm font-bold text-stone-400 hover:text-stone-700 transition-colors"
          >
            {i18n.language === 'ko' ? 'EN' : 'KO'}
          </button>
          <button
            onClick={onLogout}
            className="text-sm tracking-wider text-stone-400 hover:text-stone-900"
          >
            {t('auth.logout')}
          </button>
        </div>
      </div>
    </nav>
  )
}