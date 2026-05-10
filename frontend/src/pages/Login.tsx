import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'
import { AlertCircle } from 'lucide-react'
import { Wordmark } from '../components/Wordmark'
import { FormField, UnderlineInput } from '../components/forms/FormField'
import { SocialAuthButtons } from '../components/auth/SocialAuthButtons'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!email || !password) return
    setLoading(true)
    setError('')
    const success = await login(email, password)
    if (success) {
      navigate('/dashboard')
    } else {
      setError(t('api.error.INVALID_CREDENTIALS'))
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-edit-canvas flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-12">
          <Wordmark asLink={false} />
        </div>

        <header className="text-center mb-10">
          <p className="t-eyebrow text-edit-muted mb-3">{t('auth.eyebrow.login')}</p>
          <h1 className="font-serif text-h2 text-edit-ink font-normal tracking-tight">
            {t('auth.title.login')}
          </h1>
        </header>

        <form onSubmit={handleSubmit} className="space-y-0">
          <FormField label={t('auth.mail')} required>
            <UnderlineInput
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </FormField>

          <FormField label={t('auth.password')} required>
            <UnderlineInput
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
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
            {loading ? t('auth.loggingIn') : t('auth.submit')}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between t-caption">
          <Link to="/forgot-password"
                className="text-edit-muted hover:text-edit-ink transition-colors">
            {t('auth.forgotPassword')}
          </Link>
          <Link to="/register"
                className="text-edit-muted hover:text-edit-ink transition-colors">
            {t('auth.signup')}
          </Link>
        </div>

        <SocialAuthButtons mode="login" className="mt-10" />
      </div>
    </div>
  )
}
