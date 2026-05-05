import { BrowserRouter, Routes, Route, useParams, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
//import MobileAppInfo from './pages/MobileAppInfo'
import MobilePublicPortfolio from './pages/mobile/MobilePublicPortfolio'
import MobileLandingPage from './pages/MobileLandingPage'

// 1. App.tsx에 정의된 시스템 라우트 경로들을 예약어로 등록
const RESERVED_WORDS = [
  'login', 'dashboard', 'register', 'verify-email', 
  'forgot-password', 'reset-password', 'features', 
  'projects', 'trash', 'settings', 'racconto-admin', 
  'download', 'delivery'
]

// 2. 파라미터를 가로채서 검사하는 Wrapper 컴포넌트 생성
function MobilePortfolioRouter() {
  const { username } = useParams()
  
  // 파라미터가 예약어 중 하나라면 모바일 랜딩 페이지로 돌려보냄
  if (username && RESERVED_WORDS.includes(username.toLowerCase())) {
    return <Navigate to="/" replace /> 
    // (또는 return <MobileLandingPage /> 하셔도 됩니다)
  }

  // 일반 유저네임이라면 정상적으로 포트폴리오 노출
  return <MobilePublicPortfolio />
}

export default function MobileInfoApp() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
        {/* 3. 기존의 MobilePublicPortfolio 대신 Wrapper를 연결 */}
          <Route path="/:username" element={<MobilePortfolioRouter />} />
          
          <Route path="/" element={<MobileLandingPage />} />
          <Route path="*" element={<MobileLandingPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
