import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import AuthNavbar from '../components/AuthNavbar'

const API = import.meta.env.VITE_API_URL

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  const { t } = useTranslation()

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setStatus('error')
      setMessage(t('verify.error.invalidToken', '유효하지 않은 인증 링크입니다.'))
      return
    }
    axios.get(`${API}/auth/verify-email?token=${token}`)
      .then(res => {
        setStatus('success')
        // 성공 시 서버에서 내려주는 메시지 그대로 출력
        //setMessage(res.data.message) 
        setMessage(t(`api.success.${res.data.message}`, '인증이 완료되었습니다.'))
      })
      .catch(e => {
        setStatus('error')
        // 서버 에러 메시지가 있으면 우선 출력하고, 없으면 다국어 처리
        setMessage(e.response?.data?.detail || t('verify.error.failed'))
      })
  }, [t, searchParams])

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F4F0]">

      <AuthNavbar />

      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="bg-white rounded-card shadow p-8 w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold tracking-widest mb-6">Racconto</h1>
          
          {status === 'loading' && (
            <p className="text-sm text-gray-500">{t('verify.loading')}</p>
          )}
          
          {status === 'success' && (
            <>
              <p className="text-sm text-gray-600 mb-6">{message}</p>
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
                className="w-full bg-black text-white py-2 text-sm tracking-wider hover:bg-gray-800"
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