import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL

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
      navigate('/settings')
    }
  }

  return (
    <nav className="bg-[#F7F4F0] text-stone-900 border-b border-stone-200 px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link to="/" className="text-xl font-bold tracking-widest" style={{ fontFamily: 'Georgia, serif' }}>Racconto</Link>
        <div className="flex gap-8 items-center">
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