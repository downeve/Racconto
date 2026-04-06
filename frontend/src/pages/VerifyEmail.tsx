import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setStatus('error')
      setMessage('유효하지 않은 인증 링크입니다')
      return
    }
    axios.get(`${API}/auth/verify-email?token=${token}`)
      .then(res => {
        setStatus('success')
        setMessage(res.data.message)
      })
      .catch(e => {
        setStatus('error')
        setMessage(e.response?.data?.detail || '인증에 실패했습니다')
      })
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow p-8 w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold tracking-widest mb-6">Racconto</h1>
        {status === 'loading' && (
          <p className="text-sm text-gray-500">인증 중...</p>
        )}
        {status === 'success' && (
          <>
            <p className="text-sm text-gray-600 mb-6">{message}</p>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-black text-white py-2 text-sm tracking-wider hover:bg-gray-800"
            >
              로그인
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
              로그인으로 이동
            </button>
          </>
        )}
      </div>
    </div>
  )
}