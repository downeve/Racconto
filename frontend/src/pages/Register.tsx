import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'

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

  const handleSubmit = async () => {
    if (!email || !password || !passwordConfirm) return
    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다')
      return
    }
    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다')
      return
    }
    setLoading(true)
    setError('')
    try {
      await axios.post(`${API}/auth/register`, { email, password })
      setSuccess(true)
    } catch (e: any) {
      setError(e.response?.data?.detail || '회원가입에 실패했습니다')
    }
    setLoading(false)
  }

  const handleResend = async () => {
    setResending(true)
    try {
      await axios.post(`${API}/auth/resend-verification`, { email })
      setResendMessage('재발송했습니다. 이메일을 확인해주세요.')
    } catch {
      setResendMessage('재발송에 실패했습니다. 잠시 후 다시 시도해주세요.')
    }
    setResending(false)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold tracking-widest mb-6">Racconto</h1>
          <p className="text-sm text-gray-600 mb-2">인증 이메일을 발송했습니다.</p>
          <p className="text-sm text-gray-600 mb-6">이메일을 확인하고 인증을 완료해주세요.</p>
          {resendMessage && <p className="text-xs text-gray-500 mb-4">{resendMessage}</p>}
          <button
            onClick={handleResend}
            disabled={resending}
            className="w-full border border-black text-black py-2 text-sm tracking-wider hover:bg-gray-50 disabled:opacity-50 mb-3"
          >
            {resending ? '발송 중...' : '인증 이메일 재발송'}
          </button>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-black text-white py-2 text-sm tracking-wider hover:bg-gray-800"
          >
            로그인으로 이동
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-8 tracking-widest">Racconto</h1>
        <div className="space-y-4">
          <input
            type="email"
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="이메일"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <input
            type="password"
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="비밀번호 (8자 이상)"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <input
            type="password"
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="비밀번호 확인"
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
            {loading ? '처리 중...' : '회원가입'}
          </button>
          <p className="text-center text-xs text-gray-500">
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="underline">로그인</Link>
          </p>
        </div>
      </div>
    </div>
  )
}