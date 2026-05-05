import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ElectronSidebarProvider } from './context/ElectronSidebarContext'
import { MobileLayoutProvider } from './context/MobileLayoutContext'
import { useTranslation } from 'react-i18next'
import { useEffect } from 'react'
import ScrollToTop from './components/ScrollToTop'

import Login from './pages/Login'
import Register from './pages/Register'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import MobileLandingPage from './pages/MobileLandingPage'
import MobileFeaturesPage from './pages/MobileFeaturesPage'
import DeliveryPage from './pages/DeliveryPage'
import MobileProjectList from './pages/mobile/MobileProjectList'
import MobileProjectDetail from './pages/mobile/MobileProjectDetail'
import MobilePublicPortfolio from './pages/mobile/MobilePublicPortfolio'
import MobileSettings from './pages/mobile/MobileSettings'
import MobileTrash from './pages/mobile/MobileTrash'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <div className="min-h-screen bg-[#F7F4F0]" />
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function MobileAppRoutes() {
  const { isAuthenticated } = useAuth()
  const { i18n } = useTranslation()

  useEffect(() => {
    document.documentElement.lang = i18n.language
  }, [i18n.language])

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/features" element={<MobileFeaturesPage />} />
        <Route path="/delivery/:linkId" element={<DeliveryPage />} />
        <Route
          path="/"
          element={isAuthenticated ? <Navigate to="/projects" replace /> : <MobileLandingPage />}
        />
        <Route path="/projects" element={<PrivateRoute><MobileProjectList /></PrivateRoute>} />
        <Route path="/projects/:id" element={<PrivateRoute><MobileProjectDetail /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><MobileSettings /></PrivateRoute>} />
        <Route path="/trash" element={<PrivateRoute><MobileTrash /></PrivateRoute>} />
        <Route path="/:username" element={<MobilePublicPortfolio />} />
      </Routes>
    </>
  )
}

export default function MobileApp() {
  return (
    <AuthProvider>
      <ElectronSidebarProvider>
        <MobileLayoutProvider>
          <BrowserRouter>
            <MobileAppRoutes />
          </BrowserRouter>
        </MobileLayoutProvider>
      </ElectronSidebarProvider>
    </AuthProvider>
  )
}
