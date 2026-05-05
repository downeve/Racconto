import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
//import MobileAppInfo from './pages/MobileAppInfo'
import MobilePublicPortfolio from './pages/mobile/MobilePublicPortfolio'
import MobileLandingPage from './pages/MobileLandingPage'

export default function MobileInfoApp() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/:username" element={<MobilePublicPortfolio />} />
          <Route path="*" element={<MobileLandingPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
