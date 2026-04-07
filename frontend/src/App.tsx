import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
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

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <div className="min-h-screen bg-gray-50" />
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

function AppRoutes() {
  const { isAuthenticated, logout } = useAuth()
  const location = useLocation()

  // 납품 링크 페이지에서는 Navbar 숨김
  const hideNavbar = location.pathname.startsWith('/delivery/')

  return (
    <div className="min-h-screen bg-gray-50">
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