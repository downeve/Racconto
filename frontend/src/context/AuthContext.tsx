import { createContext, useContext, useState, useEffect, useRef } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL

// 1. User 타입 정의 (필요에 따라 id 등 추가 가능)
interface User {
  email: string
  is_admin: boolean
}

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const interceptorRef = useRef<number | null>(null)
  const [user, setUser] = useState<User | null>(null)

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('userEmail')
    delete axios.defaults.headers.common['Authorization']
    setIsAuthenticated(false)
    // Electron 앱이면 감시 중지
    if (window.racconto?.logout) {
      window.racconto.logout()
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      if (window.racconto) {
        window.racconto.setAuthToken(token)
      }
      setIsAuthenticated(true)
      axios.get(`${API}/auth/me`).then(res => {
        setUser({ email: res.data.email, is_admin: res.data.is_admin ?? false })
      }).catch(() => {
        // 토큰 만료 등 — 401 인터셉터가 처리
      })
    } else {
      setIsLoading(false)
      return
    }
    setIsLoading(false)

    // axios 401 인터셉터 등록
    interceptorRef.current = axios.interceptors.response.use(
      res => res,
      err => {
        if (err.response?.status === 401) {
          logout()
        }
        return Promise.reject(err)
      }
    )

    // Electron 토큰 만료 IPC 수신
    if (window.racconto?.onAuthExpired) {
      window.racconto.onAuthExpired(() => {
        logout()
      })
    }

    return () => {
      if (interceptorRef.current !== null) {
        axios.interceptors.response.eject(interceptorRef.current)
      }
    }
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const formData = new FormData()
      formData.append('username', email)
      formData.append('password', password)
      const res = await axios.post(`${API}/auth/login`, formData)
      const token = res.data.access_token
      localStorage.setItem('token', token)
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      if (window.racconto) {
        window.racconto.setAuthToken(token)
      }
      setIsAuthenticated(true)
      const meRes = await axios.get(`${API}/auth/me`)
      setUser({ email, is_admin: meRes.data.is_admin ?? false })
      localStorage.setItem('userEmail', email)
      return true
    } catch {
      return false
    }
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}