import { BrowserRouter, Routes, Route, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'

const MobileAppInfo          = lazy(() => import('./pages/MobileAppInfo'))
const MobileLandingPage      = lazy(() => import('./pages/MobileLandingPage'))
const MobilePublicPortfolio  = lazy(() => import('./pages/mobile/MobilePublicPortfolio'))
const MobileExplore          = lazy(() => import('./pages/mobile/MobileExplore'))
const MobileFeaturesPage     = lazy(() => import('./pages/MobileFeaturesPage'))
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      gcTime: 1000 * 60 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function MobileInfoApp() {
  return (
    <QueryClientProvider client={queryClient}>
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
          {/* /:username 패턴이 단일 segment 를 잡아먹어 /explore, /features 가 portfolio 404 로 흘러가는
              회귀를 막기 위해 명시적으로 위에 둠. */}
          <Route path="/explore" element={<MobileExplore />} />
          <Route path="/features" element={<MobileFeaturesPage />} />
          <Route path="/:username" element={<MobilePublicPortfolio />} />
          <Route path="/:username/:slug" element={<MobilePublicPortfolio />} />
          <Route path="*" element={<MobileLandingPage />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
    </QueryClientProvider>
  )
}
