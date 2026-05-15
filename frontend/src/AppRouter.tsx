import { lazy, Suspense } from 'react'
import { getDeviceType } from './utils/deviceDetect'
import App from './App'
import MobileInfoApp from './MobileInfoApp'
//import TabletApp from './TabletApp'

const LandingPage = lazy(() => import('./pages/LandingPage'))

export default function AppRouter() {
  const device = getDeviceType()
  if (device === 'mobile') return <MobileInfoApp />
  if (device === 'tablet') return <Suspense fallback={<div className="min-h-screen bg-edit-canvas" />}><LandingPage /></Suspense>
  return <App />
}
