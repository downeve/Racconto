import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppRouter from './AppRouter.tsx'
import { ThemeProvider } from './theme/ThemeProvider'
import './i18n'

// 새 배포로 chunk 해시가 바뀐 상태에서 사용자가 오래 머문 탭이 다른 페이지로 이동하면
// Vite 의 dynamic import 가 구 해시 chunk(404)를 요청 → Suspense fallback 영구 표시(빈 화면).
// vite:preloadError 발생 시 자동 새로고침해 새 index.html + 새 chunk 받기.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AppRouter />
    </ThemeProvider>
  </StrictMode>,
)
