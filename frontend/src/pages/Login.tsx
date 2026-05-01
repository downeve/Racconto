import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'
import AuthNavbar from '../components/AuthNavbar'

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
        </div>
      </div>
      
    </div>
  )
}