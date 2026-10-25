import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { captureInstallPrompt, pushBusy } from './lib/push'
import { rememberCheckinFromUrl } from './lib/attendance'
import './styles.css'

// A home-screen app is usually resumed, not reloaded, so it would keep running an old version for
// days. Look for a new one each time the app comes back to the front (and hourly while open);
// when one is found it takes over and the page reloads itself (autoUpdate).
registerSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    if (!reg) return
    const check = () => { if (navigator.onLine && !pushBusy) reg.update().catch(() => { /* offline or busy: try next time */ }) }
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check() })
    setInterval(check, 60 * 60 * 1000)
  },
})
captureInstallPrompt()   // must be listening before the browser fires it
rememberCheckinFromUrl() // a scanned check-in link survives signing in

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
