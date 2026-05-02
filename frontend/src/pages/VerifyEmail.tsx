import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import AuthNavbar from '../components/AuthNavbar'
import { useAuth } from '../context/AuthContext'

const API = import.meta.env.VITE_API_URL

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
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
      setMessage(t('verify.error.invalidToken', '유효하지 않은 인증 링크입니다.'))
      return
    }
    const lang = i18n.language?.startsWith('ko') ? 'ko' : 'en'
    axios.get(`${API}/auth/verify-email?token=${token}&lang=${lang}`)
      .then(res => {
        setStatus('success')
        // 성공 시 서버에서 내려주는 메시지 그대로 출력
        //setMessage(res.data.message) 
        setMessage(t(`api.success.${res.data.message}`, '인증이 완료되었습니다.'))
      })
      .catch(e => {
        const code = e.response?.data?.detail
        setStatus('error')
        setMessage(t(`api.error.${code}`, t('verify.error.failed')))
      })
  }, [t, searchParams, isAuthenticated, isLoading, navigate])

  return (
    <div className="min-h-screen flex flex-col bg-canvas">

      <AuthNavbar />

      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="bg-white rounded-card shadow p-8 w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold tracking-widest mb-6"
          style={{ fontWeight: 700, letterSpacing: '0.08em', transform: 'translateY(1px)' }}
          >Racconto</h1>
          
          {status === 'loading' && (
            <p className="text-small text-muted">{t('verify.loading')}</p>
          )}
          
          {status === 'success' && (
            <>
              <p className="text-small text-gray-600 mb-6">{message}</p>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-stone-600 text-white px-4 py-2 text-sm tracking-wider hover:bg-stone-900 transition-[background,color,border] duration-150 ease-out rounded"
              >
                {t('verify.login')}
              </button>
            </>
          )}
          
          {status === 'error' && (
            <>
              <p className="text-sm text-red-500 mb-6">{message}</p>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-ink text-card py-2 text-small tracking-wider hover:bg-gray-800"
              >
                {t('verify.goToLogin')}
              </button>
            </>
          )}
        </div>
      </div>

    </div>
  )
}