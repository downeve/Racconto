import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import AuthNavbar from '../components/AuthNavbar'

const API = import.meta.env.VITE_API_URL

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const { t } = useTranslation()

  const handleSubmit = async () => {
    if (!password || !passwordConfirm) return
    if (password !== passwordConfirm) {
      setError(t('register.error.passwordMismatch'))
      return
    }
    if (password.length < 8) {
      setError(t('register.error.passwordLength'))
      return
    }
    setLoading(true)
    setError('')
    try {
      await axios.post(`${API}/auth/reset-password`, { token, new_password: password })
      setSuccess(true)
    } catch (e: any) {
      const detail = e?.response?.data?.detail
      if (detail === 'INVALID_TOKEN') {
        setError(t('auth.resetPasswordInvalidToken'))
      } else {
        setError(t('api.error.UNKNOWN_ERROR') || 'Error')
      }
    }
    setLoading(false)
  }

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col bg-canvas">
        <AuthNavbar />
        <div className="flex-1 flex items-center justify-center px-4 py-20">
          <div className="bg-card rounded-card shadow p-8 w-full max-w-sm text-center space-y-4">
            <p className="text-small text-muted">{t('auth.resetPasswordInvalidToken')}</p>
            <Link to="/forgot-password" className="text-small underline text-ink-2 hover:text-accent">
              {t('auth.forgotPassword')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <AuthNavbar />
      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="bg-card rounded-card shadow p-8 w-full max-w-sm">
          <h2 className="font-serif font-bold text-h2 text-center mb-2 tracking-widest">Racconto</h2>
          <p className="text-center text-small text-muted mb-8">{t('auth.resetPasswordTitle')}</p>

          {success ? (
            <div className="space-y-4">
              <p className="text-small text-ink-2 text-center">{t('auth.resetPasswordSuccess')}</p>
              <Link to="/login" className="block text-center text-small underline text-ink-2 hover:text-accent">
                {t('auth.backToLogin')}
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-small text-muted">{t('auth.resetPasswordDesc')}</p>
              <input
                className="w-full border rounded-card px-3 py-2 text-body"
                type="password"
                placeholder={t('auth.newPassword')}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
              <input
                className="w-full border rounded-card px-3 py-2 text-body"
                type="password"
                placeholder={t('auth.newPasswordConfirm')}
                value={passwordConfirm}
                onChange={e => setPasswordConfirm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
              {error && <p className="text-red-500 text-small">{error}</p>}
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="text-body btn-primary w-full"
              >
                {loading ? t('register.processing') : t('auth.resetPasswordSubmit')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
