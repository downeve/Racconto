import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { Wordmark } from '../components/Wordmark'
import { Spinner } from '../components/Spinner'

const API = import.meta.env.VITE_API_URL

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (isLoading) return
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true })
      return
    }
    const token = searchParams.get('token')
    if (!token) {
      setStatus('error')
      setMessage(t('verify.error.invalidToken'))
      return
    }
    const lang = i18n.language?.startsWith('ko') ? 'ko' : 'en'
    axios.get(`${API}/auth/verify-email?token=${token}&lang=${lang}`)
      .then(res => {
        setStatus('success')
        setMessage(t(`api.success.${res.data.message}`, t('verify.success.title')))
      })
      .catch(e => {
        const code = e.response?.data?.detail
        setStatus('error')
        setMessage(t(`api.error.${code}`, t('verify.error.failed')))
      })
  }, [t, searchParams, i18n.language, isAuthenticated, isLoading, navigate])

  return (
    <div className="min-h-screen bg-edit-canvas flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm text-center">
        <div className="mb-12">
          <Wordmark size="lg" asLink={false} />
        </div>

        {status === 'verifying' && (
          <>
            <Spinner size={20} className="mx-auto mb-6 text-edit-muted" />
            <p className="t-eyebrow text-edit-muted mb-3">{t('verify.verifying.eyebrow')}</p>
            <p className="font-serif text-body text-edit-ink leading-relaxed">
              {t('verify.verifying.desc')}
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle size={28} strokeWidth={1.25} className="mx-auto mb-6 text-edit-ink/60" />
            <p className="t-eyebrow text-edit-muted mb-3">{t('verify.success.eyebrow')}</p>
            <h1 className="font-serif text-h2 text-edit-ink font-normal tracking-tight mb-4">
              {t('verify.success.title')}
            </h1>
            <p className="text-body text-edit-muted leading-relaxed mb-8 break-keep">
              {message}
            </p>
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-2.5 t-caption tracking-[0.08em]
                         bg-edit-ink text-edit-paper rounded-[1px]
                         hover:bg-edit-ink/85 transition-colors"
            >
              {t('verify.goToLogin')}
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle size={28} strokeWidth={1.25} className="mx-auto mb-6 text-edit-danger" />
            <p className="t-eyebrow text-edit-danger mb-3">{t('verify.error.eyebrow')}</p>
            <p className="font-serif text-body text-edit-ink leading-relaxed mb-8 break-keep">
              {message}
            </p>
            <button
              onClick={() => navigate('/login')}
              className="t-caption text-edit-muted hover:text-edit-ink transition-colors"
            >
              {t('verify.goToLogin')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
