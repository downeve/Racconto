import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import MobileAppInfo from './pages/MobileAppInfo'
import MobilePublicPortfolio from './pages/mobile/MobilePublicPortfolio'
import Login from './pages/Login'
import Register from './pages/Register'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'

export default function MobileInfoApp() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          <Route path="/:username" element={<MobilePublicPortfolio />} />
          <Route path="*" element={<MobileAppInfo />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
