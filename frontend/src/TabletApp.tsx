import App from './App'
import { TabletTouchProvider } from './context/TabletTouchContext'

export default function TabletApp() {
  return (
    <TabletTouchProvider>
      <App />
    </TabletTouchProvider>
  )
}
