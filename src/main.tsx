import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { captureInstallPrompt } from './lib/push'
import { rememberCheckinFromUrl } from './lib/attendance'
import './styles.css'

registerSW({ immediate: true })
captureInstallPrompt()   // must be listening before the browser fires it
rememberCheckinFromUrl() // a scanned check-in link survives signing in

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
