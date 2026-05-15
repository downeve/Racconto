import { BrowserRouter, Routes, Route, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import { AuthProvider } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'

const MobileAppInfo          = lazy(() => import('./pages/MobileAppInfo'))
const MobileLandingPage      = lazy(() => import('./pages/MobileLandingPage'))
const MobilePublicPortfolio  = lazy(() => import('./pages/mobile/MobilePublicPortfolio'))
const AppDownload            = lazy(() => import('./pages/AppDownload'))

function MobileSocialCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const token = searchParams.get('token')
    const error = searchParams.get('error')

    if (error) {
      navigate('/login?error=social_login_failed', { replace: true })
      return
    }
    if (token) {
      localStorage.setItem('token', token)
      navigate('/mobile-app-info', { replace: true })
    } else {
      navigate('/login?error=no_token', { replace: true })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500">로그인 처리 중...</p>
    </div>
  )
}

export default function MobileInfoApp() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<div className="min-h-screen bg-edit-canvas" />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={<Navigate to="/mobile-app-info" replace />} />
          <Route path="/auth/social-callback" element={<MobileSocialCallback />} />
          <Route path="/mobile-app-info" element={<MobileAppInfo />} />
          <Route path="/download" element={<AppDownload />} />
          <Route path="/:username" element={<MobilePublicPortfolio />} />
          <Route path="*" element={<MobileLandingPage />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}
