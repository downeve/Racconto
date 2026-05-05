import { getDeviceType } from './utils/deviceDetect'
import App from './App'
import MobileApp from './MobileApp'
import TabletApp from './TabletApp'

export default function AppRouter() {
  const device = getDeviceType()
  if (device === 'mobile') return <MobileApp />
  if (device === 'tablet') return <TabletApp />
  return <App />
}
