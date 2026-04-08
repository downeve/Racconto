import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { useTranslation } from 'react-i18next'

const API = import.meta.env.VITE_API_URL

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  const { t, i18n } = useTranslation()

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'ko' ? 'en' : 'ko'
    i18n.changeLanguage(nextLang)
    localStorage.setItem('app_language', nextLang)
  }

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
    <div className="min-h-screen flex flex-col bg-gray-50">

      {/* Navbar.tsx와 동일한 상단 헤더 */}
      <nav className="bg-[#F7F4F0] text-stone-900 border-b border-stone-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-widest" style={{ fontFamily: 'Georgia, serif' }}>Racconto</Link>
            <button
              onClick={toggleLanguage}
              className="text-sm font-bold text-stone-400 hover:text-stone-700 transition-colors"
            >
              {i18n.language === 'ko' ? 'EN' : 'KO'}
            </button>
        </div>
      </nav>

      {/* 메인 컨텐츠 영역 */}
      <div className="flex-1 flex items-center justify-center py-12">
        <div className="bg-white rounded-lg shadow p-8 w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold tracking-widest mb-6">Racconto</h1>
          
          {status === 'loading' && (
            <p className="text-sm text-gray-500">{t('verify.loading')}</p>
          )}
          
          {status === 'success' && (
            <>
              <p className="text-sm text-gray-600 mb-6">{message}</p>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-black text-white py-2 text-sm tracking-wider hover:bg-gray-800"
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