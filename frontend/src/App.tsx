import { BrowserRouter, HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { useTranslation } from 'react-i18next'
import { useEffect, useRef } from 'react';
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import ProjectEdit from './pages/ProjectEdit'
import Trash from './pages/Trash'
import Settings from './pages/Settings'
import DeliveryPage from './pages/DeliveryPage'
import Register from './pages/Register'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Admin from './pages/Admin'
import PublicPortfolio from './pages/PublicPortfolio'
import LandingPage from './pages/LandingPage'
import ElectronLandingPage from './pages/ElectronLandingPage'
import FeaturesPage from './pages/FeaturesPage'
import MobileLandingPage from './pages/MobileLandingPage'
import MobileFeaturesPage from './pages/MobileFeaturesPage'
import AppDownload from './pages/AppDownload'
import ScrollToTop from './components/ScrollToTop';
import UploadToast from './components/UploadToast'
import ElectronSidebar from './components/ElectronSidebar'
import FeedbackWidget from './components/FeedbackWidget'
import { getDeviceType } from './utils/deviceDetect'
import { useState } from 'react'
import { ElectronSidebarProvider } from './context/ElectronSidebarContext'
import SocialCallback from './pages/auth/SocialCallback'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <div className="min-h-screen bg-edit-canvas" />
  return isAuthenticated ? <>{children}</> : <Navigate to="/" />
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth()
  if (isLoading) return <div className="min-h-screen bg-edit-canvas" />
  if (!isAuthenticated) return <Navigate to="/" replace />
  if (!user?.is_admin) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { isAuthenticated, logout, user } = useAuth()
  const { i18n } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()

  // 납품 링크 페이지 Navbar 숨김
  const hideNavbar = location.pathname.startsWith('/delivery/')

  const isElectron = typeof window !== 'undefined' && !!window.racconto
  const isMac = isElectron && window.racconto?.platform === 'darwin'
  const isMobileDevice = getDeviceType() === 'mobile'
  const [electronTab, setElectronTab] = useState<'photos' | 'story' | 'notes'>('photos')
  const [sidebarWidth, setSidebarWidth] = useState(() =>
    parseInt(localStorage.getItem('electron_sidebar_width') ?? '224', 10)
  )

  const userRef = useRef(user)
  useEffect(() => { userRef.current = user }, [user])

  // 프로젝트 진입 시 electronTab을 photos로 초기화 (이전 탭 값이 마운트 effect를 덮어쓰는 문제 방지)
  const prevPathRef = useRef(location.pathname)
  useEffect(() => {
    const prev = prevPathRef.current
    prevPathRef.current = location.pathname
    const isProjectDetail = /^\/projects\/[^/]+$/.test(location.pathname)
    const wasProjectDetail = /^\/projects\/[^/]+$/.test(prev)
    if (isProjectDetail && (!wasProjectDetail || prev !== location.pathname)) {
      setElectronTab('photos')
    }
  }, [location.pathname])

  useEffect(() => {
    if (!isElectron) return
    window.racconto!.onMenuNavigate((path: string) => {
      navigate(path)
    })
    window.racconto!.onMenuAction((action: string) => {
      if (action === 'logout') {
        logout()
      } else if (action === 'toggleLanguage') {
        const nextLang = i18n.language.startsWith('ko') ? 'en' : 'ko'
        i18n.changeLanguage(nextLang)
        localStorage.setItem('app_language', nextLang)
      } else if (action === 'portfolio') {
        const u = userRef.current
        if (u?.username) {
          navigate(`/${u.username}`, { state: { resetToList: true } })
        } else {
          navigate('/@setup')
        }
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isElectron) return
    const lang = i18n.language.startsWith('ko') ? 'ko' : i18n.language.startsWith('ja') ? 'ja' : 'en'
    window.racconto!.setMenuLanguage(lang)
  }, [i18n.language, isElectron])

  return (
    <div className={`min-h-screen bg-edit-canvas${isMobileDevice && isAuthenticated && !hideNavbar ? ' pt-14' : ''}`}>

      {isMobileDevice && isAuthenticated && !hideNavbar && <Navbar onLogout={logout} />}

      {/* 사이드바 — 인증된 상태, 모바일/납품 페이지 제외 */}
      {!isMobileDevice && isAuthenticated && !hideNavbar && (
        <ElectronSidebar
          activeTab={electronTab}
          onTabChange={setElectronTab}
          showTabs={true}
          width={sidebarWidth}
          onWidthChange={(w) => {
            setSidebarWidth(w)
            localStorage.setItem('electron_sidebar_width', String(w))
          }}
        />
      )}

      {/* macOS: 메인 콘텐츠 상단 드래그 존 — z-[5]로 낮게 설정해 위에 있는 UI는 정상 클릭됨 */}
      {isMac && (
        <div
          className="fixed top-0 left-0 right-0 h-9 z-[5]"
          onMouseDown={(e) => {
            if (e.button === 0) window.racconto?.startMove()
          }}
        />
      )}

      {/* 메인 콘텐츠 — 사이드바 너비만큼 밀기 (macOS floating 오프셋 6px 포함) */}
      <div style={!isMobileDevice && isAuthenticated && !hideNavbar ? { marginLeft: sidebarWidth + (isMac ? 6 : 0) } : {}}>
        <ScrollToTop />
        <FeedbackWidget />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/auth/social-callback" element={<SocialCallback />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : (isElectron ? <ElectronLandingPage /> : isMobileDevice ? <MobileLandingPage /> : <LandingPage />)} />
          <Route path="/features" element={isMobileDevice ? <MobileFeaturesPage /> : <FeaturesPage />} />
          <Route path="/projects" element={<PrivateRoute><Projects /></PrivateRoute>} />
          <Route path="/projects/:id" element={
            <PrivateRoute>
              <ProjectDetail electronTab={electronTab} />
            </PrivateRoute>
          } />
          <Route path="/projects/:id/edit" element={<PrivateRoute><ProjectEdit /></PrivateRoute>} />
          <Route path="/trash" element={<PrivateRoute><Trash /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
          <Route path="/racconto-admin" element={<AdminRoute><Admin /></AdminRoute>} />
          <Route path="/download" element={<AppDownload />} />
          <Route path="/delivery/:linkId" element={<DeliveryPage />} />
          <Route path="/:username/:slug" element={<PublicPortfolio />} />
          <Route path="/:username" element={<PublicPortfolio />} />
        </Routes>
      </div>
      <UploadToast />
    </div>
  )
}

function App() {
  const Router = window.racconto ? HashRouter : BrowserRouter

  const { i18n } = useTranslation();

  useEffect(() => {
    // i18n.language 값이 바뀔 때마다 html 태그의 lang 속성을 업데이트
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

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