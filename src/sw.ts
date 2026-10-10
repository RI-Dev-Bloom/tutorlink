/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute, type PrecacheEntry } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<PrecacheEntry | string> }

// The app itself: cached so it opens instantly and survives a bad signal.
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Google Fonts: the stylesheet changes rarely, the font files never.
registerRoute(({ url }) => url.origin === 'https://fonts.googleapis.com', new StaleWhileRevalidate({ cacheName: 'font-css' }))
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({ cacheName: 'font-files', plugins: [new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 })] }),
)

// New versions take over straight away (registerType: 'autoUpdate').
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

/* ---------- push notifications (Phase 1) -------------------
   The send-push Edge Function delivers { title, body, url }. */

self.addEventListener('push', e => {
  const data = (() => { try { return e.data?.json() ?? {} } catch { return { body: e.data?.text() } } })()
  e.waitUntil(self.registration.showNotification(data.title || 'TutorLink', {
    body: data.body || '',
    icon: 'pwa-192x192.png',
    badge: 'pwa-64x64.png',
    data: { url: data.url || self.registration.scope },
  }))
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = new URL(e.notification.data?.url || '', self.registration.scope).href
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const open = wins.find(w => w.url.startsWith(self.registration.scope))
    if (open) { await open.focus(); return open.navigate(url) }
    return self.clients.openWindow(url)
  })())
})
