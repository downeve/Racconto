import { getDeviceType } from './utils/deviceDetect'
import App from './App'
import MobileInfoApp from './MobileInfoApp'

export default function AppRouter() {
  const device = getDeviceType()
  if (device === 'mobile') return <MobileInfoApp />
  return <App />
}
