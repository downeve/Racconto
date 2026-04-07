import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const { t, i18n } = useTranslation()

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'ko' ? 'en' : 'ko'
    i18n.changeLanguage(nextLang)
    localStorage.setItem('app_language', nextLang) 
  }

  const handleSubmit = async () => {
    if (!email || !password) return
    setLoading(true)
    setError('')
    const success = await login(email, password)
    if (success) {
      navigate('/projects')
    } else {
      setError((t('api.error.INVALID_CREDENTIALS')))
    }
    setLoading(false)
  }

  return (
    // 💡 전체를 하나의 컨테이너로 묶어서 Multiple Root Elements 에러를 해결합니다.
    <div className="min-h-screen flex flex-col">
      
      {/* 💡 Navbar.tsx 와 100% 동일한 클래스 구조의 헤더 (로고 & 언어 버튼만 유지) */}
      <nav className="bg-[#F7F4F0] border-b border-stone-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-widest font-serif">Racconto</Link>
          <div className="flex gap-8 items-center">
            <button onClick={toggleLanguage} className="text-sm font-bold text-stone-400 hover:text-stone-700 transition-colors">
              {i18n.language === 'ko' ? 'EN' : 'KO'}
            </button>
          </div>
        </div>
      </nav>

      {/* 💡 메인 로그인 폼 영역 (flex-1을 주어 남은 화면을 꽉 채우고 중앙에 배치) */}
      <div className="flex-1 flex items-center justify-center py-12">
        <div className="bg-white rounded-lg shadow p-8 w-full max-w-sm">
          <h1 className="text-2xl font-bold text-center mb-8 tracking-widest font-serif">Racconto</h1>

          <div className="space-y-4">
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              type="email"
              placeholder={t('auth.mail')}
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              type="password"
              placeholder={t('auth.password')}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-stone-900 text-white py-2 text-sm tracking-wider hover:bg-stone-700 disabled:bg-stone-300"
            >
              {loading ? t('auth.loggingIn') : t('auth.submit')}
            </button>
            <p className="text-center text-xs text-gray-500">
              {t('auth.noAccount')} {' '}
              <Link to="/register" className="underline">{t('auth.register')}</Link>
            </p>
          </div>
        </div>
      </div>
      
    </div>
  )
}