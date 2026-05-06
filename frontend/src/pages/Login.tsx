import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'
import AuthNavbar from '../components/AuthNavbar'

const API_BASE = import.meta.env.VITE_API_URL || 'https://racconto.app/api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const { t } = useTranslation()

  const handleSubmit = async () => {
    if (!email || !password) return
    setLoading(true)
    setError('')
    const success = await login(email, password)
    if (success) {
      navigate('/dashboard')
    } else {
      setError((t('api.error.INVALID_CREDENTIALS')))
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas">

      <AuthNavbar />

      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="bg-card rounded-card shadow p-8 w-full max-w-sm">
          <h2 className="font-serif font-bold text-h2 text-center mb-8 tracking-widest"
          style={{ fontWeight: 700, letterSpacing: '0.08em', transform: 'translateY(1px)' }}
          >Racconto</h2>

          <div className="space-y-4">
            <input
              className="w-full border rounded-card px-3 py-2 text-body"
              type="email"
              placeholder={t('auth.mail')}
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
            <input
              className="w-full border rounded-card px-3 py-2 text-body"
              type="password"
              placeholder={t('auth.password')}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
            {error && <p className="text-red-500 text-small">{error}</p>}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="text-body btn-primary w-full"
            >
              {loading ? t('auth.loggingIn') : t('auth.submit')}
            </button>
            <p className="text-center text-small text-muted">
              {t('auth.noAccount')} {'  '}
              <Link to="/register" className="text-small underline text-ink-2 hover:text-accent">{t('auth.register')}</Link>
            </p>
            <p className="text-center text-small text-muted">
              {t('auth.forgotPassword')} {'  '}
              <Link to="/forgot-password" className="text-small underline text-ink-2 hover:text-accent">{t('auth.forgotPasswordTitle')}</Link>
            </p>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">{t('auth.or', '또는')}</span>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <a
                href={`${API_BASE}/auth/google/login`}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="text-sm font-medium text-gray-700">{t('auth.google', 'Google로 로그인')}</span>
              </a>

              <a
                href={`${API_BASE}/auth/apple/login`}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <span className="text-sm font-medium">{t('auth.apple', 'Apple로 로그인')}</span>
              </a>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  )
}