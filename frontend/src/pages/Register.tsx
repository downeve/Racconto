import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { useTranslation } from 'react-i18next'

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
  const navigate = useNavigate()

  const { t, i18n } = useTranslation()

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'ko' ? 'en' : 'ko'
    i18n.changeLanguage(nextLang)
    localStorage.setItem('app_language', nextLang)
  }

  const handleSubmit = async () => {
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
      await axios.post(`${API}/auth/register`, { email, password })
      setSuccess(true)
    } catch (e: any) {
      // 서버에서 보내주는 에러 메시지가 있으면 띄우고, 없으면 기본 에러 번역문 출력
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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      
      {/* Navbar.tsx와 동일한 상단 헤더 */}
      <nav className="bg-black text-white px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-widest">Racconto</Link>
          <div className="flex gap-8 items-center">
            <button
              onClick={toggleLanguage}
              className="text-sm font-bold text-gray-300 hover:text-white transition-colors"
            >
              {i18n.language === 'ko' ? 'EN' : 'KO'}
            </button>
          </div>
        </div>
      </nav>

      {/* 메인 컨텐츠 영역 */}
      <div className="flex-1 flex items-center justify-center py-12">
        {success ? (
          // --- 회원가입 성공 (이메일 인증 대기) 화면 ---
          <div className="bg-white rounded-lg shadow p-8 w-full max-w-sm text-center">
            <h1 className="text-2xl font-bold tracking-widest mb-6">Racconto</h1>
            <p className="text-sm text-gray-600 mb-2">{t('register.success.title')}</p>
            <p className="text-sm text-gray-600 mb-6">{t('register.success.desc')}</p>
            {resendMessage && <p className="text-xs text-gray-500 mb-4">{resendMessage}</p>}
            <button
              onClick={handleResend}
              disabled={resending}
              className="w-full border border-black text-black py-2 text-sm tracking-wider hover:bg-gray-50 disabled:opacity-50 mb-3"
            >
              {resending ? t('register.sending') : t('register.resendEmail')}
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-black text-white py-2 text-sm tracking-wider hover:bg-gray-800"
            >
              {t('register.goToLogin')}
            </button>
          </div>
        ) : (
          // --- 회원가입 입력 폼 화면 ---
          <div className="bg-white rounded-lg shadow p-8 w-full max-w-sm">
            <h1 className="text-2xl font-bold text-center mb-8 tracking-widest">Racconto</h1>
            <div className="space-y-4">
              <input
                type="email"
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder={t('register.email')}
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <input
                type="password"
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder={t('register.password')}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <input
                type="password"
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder={t('register.passwordConfirm')}
                value={passwordConfirm}
                onChange={e => setPasswordConfirm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
              {error && <p className="text-red-500 text-xs">{error}</p>}
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-black text-white py-2 text-sm tracking-wider hover:bg-gray-800 disabled:bg-gray-400"
              >
                {loading ? t('register.processing') : t('register.submit')}
              </button>
              <p className="text-center text-xs text-gray-500">
                {t('register.hasAccount')}{' '}
                <Link to="/login" className="underline">{t('register.loginLink')}</Link>
              </p>
            </div>
          </div>
        )}
      </div>
      
    </div>
  )
}