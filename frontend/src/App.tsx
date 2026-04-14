import { BrowserRouter, HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
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
import ElectronSidebar from './components/ElectronSidebar'
import { useState } from 'react'
import { ElectronSidebarProvider } from './context/ElectronSidebarContext'

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
  const isMobileDevice = /Android.*Mobile|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  const [electronTab, setElectronTab] = useState<'photos' | 'story' | 'notes'>('photos')

  return (
    <div className="min-h-screen bg-[#F7F4F0] pt-14">
      {/* 모바일 기기 차단 — UA 기반 감지 */}
      {isMobileDevice &&
      !['/', '/login', '/register', '/verify-email'].includes(location.pathname) &&
      !location.pathname.startsWith('/p/') &&
      !location.pathname.startsWith('/delivery/') && (
        <div className="fixed inset-0 bg-[#F7F4F0] z-50 flex items-center justify-center p-8 text-center">
          <div>
            <p className="text-3xl mb-4">📷</p>
            <p className="text-lg font-bold text-stone-900 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
              {t('landing.desktopOptimizationInfo')}
            </p>
            <p className="text-sm text-stone-500 leading-relaxed mb-6">
              {t('landing.desktopOptimizationDesc')}
            </p>
            <div className="flex flex-col gap-3 items-center mb-6">
              <a
                href="https://racconto.app"
                className="text-sm font-medium text-stone-700 border border-stone-300 rounded-full px-5 py-2 hover:bg-stone-100 transition-colors"
              >
                {t('landing.openInBrowser')}
              </a>
              <a
                href="https://racconto.app#download"
                className="text-sm font-medium text-white bg-stone-800 rounded-full px-5 py-2 hover:bg-stone-700 transition-colors"
              >
                {t('landing.downloadDesktopApp')}
              </a>
            </div>
          </div>
        </div>
      )}

      {isAuthenticated && !hideNavbar && <Navbar onLogout={logout} />}

      {/* Electron 사이드바 — 인증된 상태, 납품/공개 페이지 제외 */}
      {isElectron && isAuthenticated && !hideNavbar && (
        <ElectronSidebar
          activeTab={electronTab}
          onTabChange={setElectronTab}
          showTabs={true}
        />
      )}

      {/* 메인 콘텐츠 — Electron일 때 사이드바 너비만큼 밀기 */}
      <div className={isElectron && isAuthenticated && !hideNavbar ? 'ml-56' : ''}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/" element={isAuthenticated ? <Navigate to="/projects" replace /> : <LandingPage />} />
          <Route path="/projects" element={<PrivateRoute><Projects /></PrivateRoute>} />
          <Route path="/projects/:id" element={
            <PrivateRoute>
              <ProjectDetail electronTab={electronTab} />
            </PrivateRoute>
          } />
          <Route path="/projects/:id/edit" element={<PrivateRoute><ProjectEdit /></PrivateRoute>} />
          <Route path="/trash" element={<PrivateRoute><Trash /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
          <Route path="/admin" element={<PrivateRoute><Admin /></PrivateRoute>} />
          <Route path="/delivery/:linkId" element={<DeliveryPage />} />
          <Route path="/p/:username" element={<PublicPortfolio />} />
        </Routes>
      </div>
      <UploadToast />
    </div>
  )
}

function App() {
  const Router = window.racconto ? HashRouter : BrowserRouter
  return (
    <AuthProvider>
      <ElectronSidebarProvider>
        <Router>
          <AppRoutes />
        </Router>
      </ElectronSidebarProvider>
    </AuthProvider>
  )
}

export default App