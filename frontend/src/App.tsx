import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { useTranslation } from 'react-i18next'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import ProjectEdit from './pages/ProjectEdit'
import Trash from './pages/Trash'
import Settings from './pages/Settings'
import DeliveryPage from './pages/DeliveryPage'
import Register from './pages/Register'
import VerifyEmail from './pages/VerifyEmail'
import Admin from './pages/Admin'
import PublicPortfolio from './pages/PublicPortfolio'
import LandingPage from './pages/LandingPage'
import UploadToast from './components/UploadToast'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <div className="min-h-screen bg-[#F7F4F0]" />
  return isAuthenticated ? <>{children}</> : <Navigate to="/" />
}

function AppRoutes() {
  const { isAuthenticated, logout } = useAuth()
  const {t} = useTranslation()
  const location = useLocation()

  // 납품 링크 페이지 Navbar 숨김
  const hideNavbar = location.pathname.startsWith('/delivery/')

  const isElectron = typeof window !== 'undefined' && !!window.racconto

  return (
    <div className={`min-h-screen bg-[#F7F4F0] ${isElectron ? 'pt-14' : 'pt-14'}`}>

      {/* 모바일 차단 — 랜딩(/), 공개 포트폴리오(/p/), 납품(/delivery/) 제외 */}
      {!['/', ].includes(location.pathname) &&
       !location.pathname.startsWith('/p/') &&
       !location.pathname.startsWith('/delivery/') && (
        <div className="md:hidden fixed inset-0 bg-[#F7F4F0] z-50 flex items-center justify-center p-8 text-center">
          <div>
            <p className="text-3xl mb-4">📷</p>
            <p className="text-lg font-bold text-stone-900 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
              {t('landing.desktopOptimizationInfo')}
            </p>
            <p className="text-sm text-stone-500 leading-relaxed mb-6">
              {t('landing.desktopOptimizationDesc')}
            </p>
            {isAuthenticated && (
              <button
                onClick={logout}
                className="text-xs text-stone-400 hover:text-stone-600 underline underline-offset-2"
              >
                {t('auth.logout')}
              </button>
            )}
          </div>
        </div>
      )}

      {isAuthenticated && !hideNavbar && <Navbar onLogout={logout} />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/" element={
          isAuthenticated ? <Navigate to="/projects" /> : <LandingPage />
        } />
        <Route path="/projects" element={<PrivateRoute><Projects /></PrivateRoute>} />
        <Route path="/projects/:id" element={<PrivateRoute><ProjectDetail /></PrivateRoute>} />
        <Route path="/projects/:id/edit" element={<PrivateRoute><ProjectEdit /></PrivateRoute>} />
        <Route path="/trash" element={<PrivateRoute><Trash /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute><Admin /></PrivateRoute>} />

        {/* 납품 링크 - 비로그인 공개 페이지 */}
        <Route path="/delivery/:linkId" element={<DeliveryPage />} />

        {/* 공개 포트폴리오 - 비로그인 접근 가능 */}
        <Route path="/p/:username" element={<PublicPortfolio />} />
      </Routes>
      <UploadToast />
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App