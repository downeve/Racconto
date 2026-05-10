import { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { Wordmark } from '../components/Wordmark'
import { FormField, UnderlineInput } from '../components/forms/FormField'
import { SocialAuthButtons } from '../components/auth/SocialAuthButtons'

const API = import.meta.env.VITE_API_URL

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const { t, i18n } = useTranslation()

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!email || !password || !passwordConfirm) return
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
      await axios.post(`${API}/auth/register`, {
        email,
        password,
        lang: i18n.language?.startsWith('ko') ? 'ko' : 'en',
      })
      setSuccess(true)
    } catch (e: any) {
      const code = e?.response?.data?.detail
      setError(t(`api.error.${code}`, t('register.error.signupFailed')))
    }
    setLoading(false)
  }

  const handleResend = async () => {
    setResending(true)
    try {
      await axios.post(`${API}/auth/resend-verification`, { email })
      setResendMessage(t('register.success.resend'))
    } catch {
      setResendMessage(t('register.error.resendFailed'))
    }
    setResending(false)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-edit-canvas flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm text-center">
          <div className="mb-12">
            <Wordmark asLink={false} />
          </div>
          <CheckCircle size={28} strokeWidth={1.25} className="mx-auto mb-6 text-edit-ink/60" />
          <p className="t-eyebrow text-edit-muted mb-3">{t('register.success.eyebrow')}</p>
          <h1 className="font-serif text-h2 text-edit-ink font-normal tracking-tight mb-4">
            {t('register.success.title')}
          </h1>
          <p className="text-body text-edit-muted leading-relaxed mb-8 break-keep">
            {t('register.success.desc')}
          </p>
          {resendMessage && (
            <p className="t-caption text-edit-muted mb-4">{resendMessage}</p>
          )}
          <button
            onClick={handleResend}
            disabled={resending}
            className="t-caption text-edit-muted hover:text-edit-ink transition-colors mb-3 block mx-auto"
          >
            {resending ? t('register.sending') : t('register.resendEmail')}
          </button>
          <Link to="/login" className="block t-caption text-edit-ink hover:opacity-70 transition-opacity">
            {t('auth.backToLogin')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-edit-canvas flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-12">
          <Wordmark asLink={false} />
        </div>

        <header className="text-center mb-10">
          <p className="t-eyebrow text-edit-muted mb-3">{t('auth.eyebrow.register')}</p>
          <h1 className="font-serif text-h2 text-edit-ink font-normal tracking-tight">
            {t('auth.title.register')}
          </h1>
        </header>

        <form onSubmit={handleSubmit} className="space-y-0">
          <FormField label={t('register.email')} required>
            <UnderlineInput
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </FormField>

          <FormField label={t('register.password')} required>
            <UnderlineInput
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </FormField>

          <FormField label={t('register.passwordConfirm')} required>
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

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-8 px-5 py-3 bg-edit-ink text-edit-paper
                       t-caption tracking-[0.08em] rounded-[1px]
                       hover:bg-edit-ink/85 disabled:opacity-50
                       transition-colors duration-150"
          >
            {loading ? t('register.processing') : t('register.submit')}
          </button>
        </form>

        <p className="mt-6 text-center t-caption text-edit-muted">
          {t('register.hasAccount')}
          <Link to="/login" className="text-edit-ink hover:opacity-70 transition-opacity ml-1">
            {t('register.loginLink')}
          </Link>
        </p>

        <SocialAuthButtons mode="register" className="mt-8" />
      </div>
    </div>
  )
}
