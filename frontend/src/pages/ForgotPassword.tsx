import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import AuthNavbar from '../components/AuthNavbar'

const API = import.meta.env.VITE_API_URL

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const { t, i18n } = useTranslation()

  const handleSubmit = async () => {
    if (!email) return
    setLoading(true)
    setError('')
    try {
      await axios.post(`${API}/auth/forgot-password`, { email, lang: i18n.language })
      setSent(true)
    } catch {
      setError(t('api.error.UNKNOWN_ERROR') || 'Error')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <AuthNavbar />
      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="bg-card rounded-card shadow p-8 w-full max-w-sm">
          <h2 className="font-serif font-bold text-h2 text-center mb-2 tracking-widest">Racconto</h2>
          <p className="text-center text-small text-muted mb-8">{t('auth.forgotPasswordTitle')}</p>

          {sent ? (
            <div className="space-y-4">
              <p className="text-small text-ink-2 text-center">{t('auth.forgotPasswordSent')}</p>
              <Link to="/login" className="block text-center text-small underline text-ink-2 hover:text-accent">
                {t('auth.backToLogin')}
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-small text-muted">{t('auth.forgotPasswordDesc')}</p>
              <input
                className="w-full border rounded-card px-3 py-2 text-body"
                type="email"
                placeholder={t('auth.mail')}
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
              {error && <p className="text-red-500 text-small">{error}</p>}
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="text-body btn-primary w-full"
              >
                {loading ? t('auth.forgotPasswordSending') : t('auth.forgotPasswordSend')}
              </button>
              <p className="text-center text-small">
                <Link to="/login" className="text-small underline text-ink-2 hover:text-accent">
                  {t('auth.backToLogin')}
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
