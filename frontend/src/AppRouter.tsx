import { getDeviceType } from './utils/deviceDetect'
import App from './App'
import MobileInfoApp from './MobileInfoApp'
import TabletApp from './TabletApp'

export default function AppRouter() {
  const device = getDeviceType()
  if (device === 'mobile') return <MobileInfoApp />
  if (device === 'tablet') return <TabletApp />
  return <App />
}
