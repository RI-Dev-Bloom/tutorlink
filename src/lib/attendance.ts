/* Attendance: check-ins, who was there, qualifications, and a student's own progress.
   The QR on the tutor's screen changes every 15 seconds; the database checks every scan. */

import { useEffect, useState } from 'react'
import { appLink, must } from './data'
import { supabase } from './supabase'

export type Live = {
  open: boolean
  mode?: 'class' | 'online'
  token?: string
  code?: string
  online_code?: string | null
  display_id?: string
  closes_at?: string
  count?: number
  // Only on the projector screen:
  module_code?: string
  module_name?: string
  venue?: string
  tutor?: string
}

export type Method = 'qr' | 'code' | 'online' | 'manual'

export type AttendanceRow = {
  id: string
  session_id: string
  student_id: string | null
  student_number: string
  full_name: string
  qualification_code: string | null
  method: Method
  checked_in_at: string
}

export type CheckInResult = {
  session_id: string
  module_code: string
  module_name: string
  venue: string
  tutor: string
  already: boolean
  checked_in_at: string
}

export type Qualification = { code: string; name: string; hidden: boolean }

export type MyAttendance = { module_code: string; module_name: string; attended: number; held: number; last_at: string | null }

export const METHOD: Record<Method, string> = { qr: 'QR', code: 'Code', online: 'Online', manual: 'Manual' }

export const checkinLink = (token: string) => `${appLink()}?checkin=${encodeURIComponent(token)}`
export const displayLink = (id: string) => `${appLink()}?show=${id}`

export const loadAttendance = async (sessionId: string) =>
  (await must(supabase.from('attendance').select('id, session_id, student_id, student_number, full_name, qualification_code, method, checked_in_at')
    .eq('session_id', sessionId).order('checked_in_at', { ascending: false }).returns<AttendanceRow[]>())) ?? []

export const loadOpenCheckin = async () => (await must(supabase.rpc('tutor_open_checkin'))) as string | null

export const loadQualifications = async () =>
  (await must(supabase.from('qualifications').select('code, name, hidden').order('code').returns<Qualification[]>())) ?? []

export const loadMyAttendance = async () => ((await must(supabase.rpc('my_attendance'))) ?? []) as MyAttendance[]

/* Polls the check-in every 3 seconds: the code changes every 15, and the count ticks up as students scan. */
export function useLive(fetch: () => PromiseLike<{ data: unknown; error: unknown }>, key: string, enabled = true) {
  const [live, setLive] = useState<Live | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!enabled) return
    let stop = false, timer = 0
    const tick = async () => {
      const { data, error: e } = await fetch()
      if (stop) return
      if (e) setError((e as { message?: string }).message ?? 'Couldn’t load the check-in')
      else { setError(''); setLive(data as Live) }
      if ((data as Live | null)?.open !== false) timer = window.setTimeout(tick, 3000)
    }
    tick()
    return () => { stop = true; clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled])
  return { live, error, setLive }
}

/* "7:42" style countdown until a time. */
export const minsLeft = (iso?: string) => {
  if (!iso) return ''
  const m = Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60000))
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`
}

export const hhmmOf = (iso: string) => new Date(iso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })

/* A check-in link scanned with the phone's own camera lands here before sign-in can drop it. */
const PENDING = 'tl.checkin'
export function rememberCheckinFromUrl() {
  const q = new URLSearchParams(window.location.search)
  const t = q.get('checkin')
  if (!t) return
  try { sessionStorage.setItem(PENDING, t) } catch { /* private mode */ }
  q.delete('checkin')
  history.replaceState(history.state, '', window.location.pathname + (q.size ? `?${q}` : ''))
}
export function takePendingCheckin() {
  try { const t = sessionStorage.getItem(PENDING); sessionStorage.removeItem(PENDING); return t } catch { return null }
}
