import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import AuthNavbar from '../components/AuthNavbar'

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
      await axios.post(`${API}/auth/register`, {
        email,
        password,
        lang: i18n.language?.startsWith('ko') ? 'ko' : 'en'  // ← 추가
      })
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
    <div className="min-h-screen flex flex-col bg-[#F7F4F0]">

      <AuthNavbar />

      <div className="flex-1 flex items-center justify-center px-4 py-20">
        {success ? (
          // --- 회원가입 성공 (이메일 인증 대기) 화면 ---
          <div className="bg-card rounded-card shadow p-8 w-full max-w-sm text-center">
            <h2 className="font-serif font-bold text-h2 tracking-widest mb-6">Racconto</h2>
            <p className="text-body text-ink-2 mb-2">{t('register.success.title')}</p>
            <p className="text-small text-ink-2 mb-6">{t('register.success.desc')}</p>
            {resendMessage && <p className="text-small text-muted mb-4">{resendMessage}</p>}
            <button
              onClick={handleResend}
              disabled={resending}
              className="w-full rounded-btn text-body btn-secondary-on-card tracking-wider disabled:opacity-50 mb-3"
            >
              {resending ? t('register.sending') : t('register.resendEmail')}
            </button>
            <button
              onClick={() => navigate('/login')}
              className="text-body btn-primary w-full"
            >
              {t('register.goToLogin')}
            </button>
          </div>
        ) : (
          // --- 회원가입 입력 폼 화면 ---
          <div className="bg-white rounded-card shadow p-8 w-full max-w-sm">
            <h2 className="text-h2 font-serif font-bold text-center mb-8 tracking-widest">Racconto</h2>
            <div className="space-y-4">
              <input
                type="email"
                className="w-full border px-3 py-2 text-body rounded-card"
                placeholder={t('register.email')}
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <input
                type="password"
                className="w-full border px-3 py-2 text-body rounded-card"
                placeholder={t('register.password')}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <input
                type="password"
                className="w-full border px-3 py-2 text-body rounded-card"
                placeholder={t('register.passwordConfirm')}
                value={passwordConfirm}
                onChange={e => setPasswordConfirm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
              {error && <p className="text-red-500 text-small">{error}</p>}
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full text-body btn-primary tracking-wider transition-[background,color,border] duration-150 ease-out"
              >
                {loading ? t('register.processing') : t('register.submit')}
              </button>
              <p className="text-center text-small text-muted">
                {t('register.hasAccount')}{' '}
                <Link to="/login" className="underline text-small hover:text-accent">{t('register.loginLink')}</Link>
              </p>
            </div>
          </div>
        )}
      </div>
      
    </div>
  )
}