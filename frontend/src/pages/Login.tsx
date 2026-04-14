import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const { t, i18n } = useTranslation()

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'ko' ? 'en' : 'ko'
    i18n.changeLanguage(nextLang)
    localStorage.setItem('app_language', nextLang) 
  }

  const handleSubmit = async () => {
    if (!email || !password) return
    setLoading(true)
    setError('')
    const success = await login(email, password)
    if (success) {
      navigate('/projects')
    } else {
      setError((t('api.error.INVALID_CREDENTIALS')))
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F4F0]">

      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#F7F4F0]/90 backdrop-blur-sm border-b border-stone-200 text-stone-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link 
            to="/" 
            className="text-xl font-bold tracking-widest" 
            style={{ fontFamily: "'Georgia', serif", letterSpacing: '0.15em' }}
          >
            Racconto
          </Link>
          <button 
            onClick={toggleLanguage} 
            className="text-sm font-bold text-stone-400 hover:text-stone-700 transition-colors"
          >
            {i18n.language === 'ko' ? 'EN' : 'KO'}
          </button>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="bg-white rounded-lg shadow p-8 w-full max-w-sm">
          <h1 className="text-2xl font-bold text-center mb-8 tracking-widest font-serif">Racconto</h1>

          <div className="space-y-4">
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              type="email"
              placeholder={t('auth.mail')}
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              type="password"
              placeholder={t('auth.password')}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-stone-600 text-white px-4 py-2 text-sm tracking-wider hover:bg-stone-900 transition-colors rounded"
            >
              {loading ? t('auth.loggingIn') : t('auth.submit')}
            </button>
            <p className="text-center text-xs text-gray-500">
              {t('auth.noAccount')} {' '}
              <Link to="/register" className="underline">{t('auth.register')}</Link>
            </p>
          </div>
        </div>
      </div>
      
    </div>
  )
}