import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initializeAnalytics, setupAppLifecycleTracking } from './utils/analytics'

initializeAnalytics()
const removeAnalyticsLifecycleTracking = setupAppLifecycleTracking()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if (import.meta.hot) {
  import.meta.hot.dispose(removeAnalyticsLifecycleTracking)
}
