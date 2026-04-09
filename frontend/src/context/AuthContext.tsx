import { createContext, useContext, useState, useEffect, useRef } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const interceptorRef = useRef<number | null>(null)

  const logout = () => {
    localStorage.removeItem('token')
    delete axios.defaults.headers.common['Authorization']
    setIsAuthenticated(false)
  }

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      if (window.racconto) {
        window.racconto.setAuthToken(token)
      }
      setIsAuthenticated(true)
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
      return true
    } catch {
      return false
    }
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}