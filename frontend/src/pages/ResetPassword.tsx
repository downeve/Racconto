import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { Wordmark } from '../components/Wordmark'
import { FormField, UnderlineInput } from '../components/forms/FormField'

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

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
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
        setError(t('api.error.UNKNOWN_ERROR'))
      }
    }
    setLoading(false)
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-edit-canvas flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm text-center">
          <div className="mb-12">
            <Wordmark size="lg" asLink={false} />
          </div>
          <div className="bg-edit-paper border border-edit-line rounded-btn px-8 py-8">
            <AlertCircle size={24} strokeWidth={1.25} className="mx-auto mb-4 text-edit-danger" />
            <p className="t-eyebrow text-edit-danger mb-3">{t('reset.invalid.eyebrow')}</p>
            <p className="font-serif text-body text-edit-ink leading-relaxed mb-8 break-keep">
              {t('auth.resetPasswordInvalidToken')}
            </p>
            <div className="border-t border-edit-line pt-6">
              <Link
                to="/forgot-password"
                className="inline-block px-5 py-2 t-caption tracking-[0.08em]
                           bg-edit-ink text-edit-paper rounded-btn hover:bg-edit-ink/85 transition-colors"
              >
                {t('reset.invalid.retry')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-edit-canvas flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-12">
          <Wordmark size="lg" asLink={false} />
        </div>

        <header className="text-center mb-8">
          <p className="t-eyebrow text-edit-muted mb-3">{t('auth.resetPasswordTitle')}</p>
          <h1 className="font-serif text-h2 text-edit-ink font-normal tracking-tight">
            {t('auth.resetPasswordDesc')}
          </h1>
        </header>

        {success ? (
          <div className="bg-edit-paper border border-edit-line rounded-btn px-8 py-8 text-center">
            <CheckCircle size={24} strokeWidth={1.25} className="mx-auto mb-4 text-edit-ink/60" />
            <p className="t-eyebrow text-edit-muted mb-3">{t('reset.success.eyebrow')}</p>
            <p className="font-serif text-body text-edit-ink leading-relaxed mb-8 break-keep">
              {t('auth.resetPasswordSuccess')}
            </p>
            <div className="border-t border-edit-line pt-6">
              <Link
                to="/login"
                className="inline-block px-5 py-2 t-caption tracking-[0.08em]
                           bg-edit-ink text-edit-paper rounded-btn hover:bg-edit-ink/85 transition-colors"
              >
                {t('auth.backToLogin')}
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-edit-paper border border-edit-line rounded-btn px-8 py-6">
            <form onSubmit={handleSubmit}>
              <FormField label={t('auth.newPassword')} required noDivider>
                <UnderlineInput
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </FormField>

              <FormField label={t('auth.newPasswordConfirm')} required noDivider>
                <UnderlineInput
                  type="password"
                  autoComplete="new-password"
                  value={passwordConfirm}
                  onChange={e => setPasswordConfirm(e.target.value)}
                  required
                />
              </FormField>

              {error && (
                <p className="t-caption text-edit-danger flex items-start gap-2 pt-3">
                  <AlertCircle size={11} strokeWidth={1.5} className="shrink-0 mt-px" />
                  <span>{error}</span>
                </p>
              )}

              <div className="border-t border-edit-line pt-6 mt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-5 py-3 bg-edit-ink text-edit-paper
                             t-caption tracking-[0.08em] rounded-btn
                             hover:bg-edit-ink/85 disabled:opacity-50
                             transition-colors duration-150"
                >
                  {loading ? t('register.processing') : t('auth.resetPasswordSubmit')}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
