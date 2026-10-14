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
  title?: string | null
  topic?: string | null
  kind?: Kind
}

export type Kind = 'tutorial' | 'lecture'
export const KIND_LABEL: Record<Kind, string> = { tutorial: 'Tutorials', lecture: 'Lectures' }

/* Quick picks for a session's title; anything else can be typed. */
export const SESSION_TITLES = ['Introduction', 'Revision', 'Refresher', 'Practical', 'Test prep', 'Q&A']

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
  title: string | null
  topic: string | null
  kind: Kind
}

export type MyAttendance = { module_code: string; module_name: string; kind: Kind; attended: number; held: number; last_at: string | null }

export const METHOD: Record<Method, string> = { qr: 'QR', code: 'Code', online: 'Online', manual: 'Manual' }

export const checkinLink = (token: string) => `${appLink()}?checkin=${encodeURIComponent(token)}`
export const displayLink = (id: string) => `${appLink()}?show=${id}`

export const loadAttendance = async (sessionId: string) =>
  (await must(supabase.from('attendance').select('id, session_id, student_id, student_number, full_name, qualification_code, method, checked_in_at')
    .eq('session_id', sessionId).order('checked_in_at', { ascending: false }).returns<AttendanceRow[]>())) ?? []

export const loadOpenCheckin = async () => (await must(supabase.rpc('tutor_open_checkin'))) as string | null

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

/* ---------- views for lecturers, admin and tutors (slice 10) ---------- */
// The database counts, as the person asking: lecturers get their modules, tutors their own sessions.

export type Totals = { sessions: number; checkins: number; students: number }
export type ModuleSummary = { module_code: string; module_name: string; sessions: number; checkins: number; students: number }
export type RosterRow = { student_number: string; full_name: string; qualification_code: string | null; attended: number; held: number; last_at: string | null }

export const loadTotals = async (semId: string, kind: Kind = 'tutorial') =>
  (((await must(supabase.rpc('attendance_totals', { p_semester: semId, p_kind: kind }))) as Totals[] | null) ?? [])[0] ?? { sessions: 0, checkins: 0, students: 0 }

export const loadSummary = async (semId: string, kind: Kind = 'tutorial') =>
  ((await must(supabase.rpc('attendance_summary', { p_semester: semId, p_kind: kind }))) ?? []) as ModuleSummary[]

export const loadRoster = async (semId: string, module: string, kind: Kind = 'tutorial') =>
  ((await must(supabase.rpc('attendance_roster', { p_semester: semId, p_module: module, p_kind: kind }))) ?? []) as RosterRow[]

export type HeldSession = {
  id: string; session_date: string; starts_at: string | null; ends_at: string | null; venue: string
  students_attended: number | null; status: string; hours: number; title: string | null; topic: string | null
  tutor: { full_name: string; title: string } | null
}
export const loadHeld = async (semId: string, module: string, kind: Kind = 'tutorial') =>
  ((await must(supabase.from('sessions')
    .select('id, session_date, starts_at, ends_at, venue, students_attended, status, hours, title, topic, tutor:profiles!sessions_tutor_id_fkey(full_name, title)')
    .eq('semester_id', semId).eq('module_code', module).eq('kind', kind).in('status', ['logged', 'confirmed', 'paid'])
    .order('session_date', { ascending: false }).returns<HeldSession[]>())) ?? [])

type ExportRow = {
  student_number: string; full_name: string; qualification_code: string | null; method: Method; checked_in_at: string
  session: { session_date: string; starts_at: string | null; module_code: string; venue: string; kind: Kind; title: string | null; topic: string | null
    tutor: { full_name: string; title: string } | null }
}

/* Every check-in for a semester (optionally one module), a page at a time: one request returns at most 1 000 rows. */
export async function loadCheckins(semId: string, module?: string, kind: Kind = 'tutorial') {
  const all: ExportRow[] = []
  for (let from = 0; ; from += 1000) {
    let q = supabase.from('attendance')
      .select('student_number, full_name, qualification_code, method, checked_in_at, session:sessions!inner(session_date, starts_at, module_code, venue, semester_id, status, kind, title, topic, tutor:profiles!sessions_tutor_id_fkey(full_name, title))')
      .eq('session.semester_id', semId).eq('session.kind', kind).in('session.status', ['logged', 'confirmed', 'paid'])
    if (module) q = q.eq('session.module_code', module)
    const page = (await must(q.order('checked_in_at').range(from, from + 999).returns<ExportRow[]>())) ?? []
    all.push(...page)
    if (page.length < 1000) return all
  }
}

const runBy = (t: { full_name: string; title: string } | null) => t ? [t.title, t.full_name].filter(Boolean).join(' ') : ''

export const checkinRows = (rows: ExportRow[]) => [
  ['Date', 'Time', 'Module', 'Type', 'Title', 'Topic', 'Run by', 'Venue', 'Student number', 'Name', 'Qualification', 'Checked in by'],
  ...rows.map(r => [r.session.session_date, hhmmOf(r.checked_in_at), r.session.module_code, r.session.kind === 'lecture' ? 'Lecture' : 'Tutorial',
    r.session.title ?? '', r.session.topic ?? '', runBy(r.session.tutor), r.session.venue,
    r.student_number, r.full_name, r.qualification_code ?? '', METHOD[r.method]]),
]
