import { getDeviceType } from './utils/deviceDetect'
import App from './App'
import MobileInfoApp from './MobileInfoApp'
import LandingPage from './pages/LandingPage'
//import TabletApp from './TabletApp'

export default function AppRouter() {
  const device = getDeviceType()
  if (device === 'mobile') return <MobileInfoApp />
  if (device === 'tablet') return <LandingPage />
  return <App />
}
