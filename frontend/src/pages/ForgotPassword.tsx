import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { Wordmark } from '../components/Wordmark'
import { FormField, UnderlineInput } from '../components/forms/FormField'

const API = import.meta.env.VITE_API_URL

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const { t, i18n } = useTranslation()

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!email) return
    setLoading(true)
    setError('')
    try {
      await axios.post(`${API}/auth/forgot-password`, { email, lang: i18n.language })
      setSent(true)
    } catch {
      setError(t('api.error.UNKNOWN_ERROR'))
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-edit-canvas flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-12">
          <Wordmark size="lg" />
        </div>

        <header className="text-center mb-8">
          <p className="t-eyebrow text-edit-muted mb-3">{t('forgot.eyebrow')}</p>
          <h1 className="font-serif text-h2 text-edit-ink font-normal tracking-tight mb-3">
            {t('forgot.title')}
          </h1>
          {!sent && (
            <p className="text-body text-edit-muted leading-relaxed break-keep">
              {t('auth.forgotPasswordDesc')}
            </p>
          )}
        </header>

        {sent ? (
          <div className="bg-edit-paper border border-edit-line rounded-btn px-8 py-8 text-center">
            <CheckCircle size={24} strokeWidth={1.25} className="mx-auto mb-4 text-edit-ink/60" />
            <p className="t-eyebrow text-edit-muted mb-3">{t('forgot.sent.eyebrow')}</p>
            <p className="font-serif text-body text-edit-ink leading-relaxed mb-8 break-keep">
              {t('forgot.sent.desc', { email })}
            </p>
            <div className="border-t border-edit-line pt-6">
              <Link to="/login" className="t-caption text-edit-muted hover:text-edit-ink transition-colors">
                {t('auth.backToLogin')}
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-edit-paper border border-edit-line rounded-btn px-8 py-6">
            <form onSubmit={handleSubmit}>
              <FormField label={t('auth.mail')} required noDivider>
                <UnderlineInput
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
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
                  {loading ? t('auth.forgotPasswordSending') : t('auth.forgotPasswordSend')}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="mt-5 text-center">
          <Link to="/login"
                className="t-caption text-edit-muted hover:text-edit-ink transition-colors">
            {t('auth.backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  )
}
