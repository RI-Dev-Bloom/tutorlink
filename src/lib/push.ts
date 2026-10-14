/* Push notifications and installing the app.
   iPhone only allows web push once the app is on the home screen (iOS 16.4+), so the
   two go together: install first, then turn notifications on. */

import { supabase } from './supabase'

const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY

export type PushState = 'unsupported' | 'install-first' | 'blocked' | 'off' | 'on'

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
export const isInstalled = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && !!VAPID

export async function pushState(): Promise<PushState> {
  if (isIOS() && !isInstalled()) return 'install-first'
  if (!supported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'blocked'
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  return sub && Notification.permission === 'granted' ? 'on' : 'off'
}

const toBytes = (b64: string) => {
  const s = atob((b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(s, c => c.charCodeAt(0))
}

/* This phone now belongs to whoever is signed in, even if someone else turned notifications on here before. */
async function save(sub: PushSubscription) {
  const j = sub.toJSON()
  const { error } = await supabase.rpc('claim_push', {
    p_endpoint: sub.endpoint, p_p256dh: j.keys!.p256dh, p_auth: j.keys!.auth, p_user_agent: navigator.userAgent,
  })
  if (error) throw error
}

/* Must run straight from a tap: phones only show the "Allow notifications?" prompt then. */
export async function turnOnPush(): Promise<PushState> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off'
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
    ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toBytes(VAPID) })
  await save(sub)
  return 'on'
}

export async function turnOffPush() {
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}

/* Called on sign-out: this phone stops getting this person's notifications. */
export async function forgetThisDevice() {
  try {
    if (!supported()) return
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    if (sub) await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  } catch { /* signing out matters more */ }
}

/* On every start: if notifications are on, make sure the server still has this phone for this person
   (the browser can rotate the address, or someone else may have used the phone before). */
export async function resyncPush() {
  try {
    if ((await pushState()) !== 'on') return
    const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription()
    if (sub) await save(sub)
  } catch { /* not worth bothering anyone about */ }
}

/* Android/desktop Chrome hand us an install prompt we can trigger from our own button. */
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
let deferred: InstallPrompt | null = null
const listeners = new Set<() => void>()
export function captureInstallPrompt() {
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e as InstallPrompt; listeners.forEach(f => f()) })
  window.addEventListener('appinstalled', () => { deferred = null; listeners.forEach(f => f()) })
}
export const canPromptInstall = () => !!deferred
export const onInstallChange = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f) } }
export async function promptInstall() {
  if (!deferred) return false
  await deferred.prompt()
  const { outcome } = await deferred.userChoice
  deferred = null; listeners.forEach(f => f())
  return outcome === 'accepted'
}
