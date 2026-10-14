/* Tutors, their sessions and the quota — shared by admin's Overview, Tutors and tutor pages. */

import { must } from './data'
import { supabase } from './supabase'
import { todayISO, type Semester } from './types'

export type SessionStatus = 'scheduled' | 'logged' | 'confirmed' | 'paid' | 'cancelled'

export type Session = {
  id: string
  tutor_id: string
  module_code: string
  semester_id: string
  slot_id: string | null
  session_date: string
  starts_at: string | null
  ends_at: string | null
  venue: string
  students_attended: number | null
  status: SessionStatus
  rate: number | null      // per hour, frozen when confirmed
  hours: number            // length; 1 when the session has no times
  amount: number | null    // rate × hours, once confirmed
  paid_at: string | null
}

export type Slot = {
  id: string
  module_code: string
  weekday: number
  starts_at: string
  ends_at: string
  venue: string
  starts_on: string
  until: string
}

export type TutorRow = {
  id: string
  full_name: string
  student_number: string | null
  email: string
  tutor_modules: { module_code: string; approved_at: string; modules: { name: string } | null }[]
}

/* One tutor's page — used by admin's tutor page and by the tutor's own screens. */
export type Register = { id: string; module_code: string; session_id: string | null; storage_path: string; file_name: string; uploaded_at: string }

export type TutorData = {
  tutor: TutorRow
  sessions: Session[]
  slots: Slot[]
  override: number | null
  registers: Register[]
}

export async function loadTutor(id: string, semId: string | null): Promise<TutorData> {
  const [tutor, sessions, slots, override, registers] = await Promise.all([
    must(supabase.from('profiles').select('id, full_name, student_number, email, tutor_modules(module_code, approved_at, modules(name))').eq('id', id).single<TutorRow>()),
    must(supabase.from('sessions').select(SESSION_COLS).eq('tutor_id', id).order('session_date').returns<Session[]>()),
    must(supabase.from('schedule_slots').select('id, module_code, weekday, starts_at, ends_at, venue, starts_on, until').eq('tutor_id', id).order('weekday').returns<Slot[]>()),
    semId ? must(supabase.from('tutor_quota_overrides').select('session_quota').eq('tutor_id', id).eq('semester_id', semId).maybeSingle<{ session_quota: number }>()) : null,
    must(supabase.from('registers').select('id, module_code, session_id, storage_path, file_name, uploaded_at').eq('tutor_id', id).order('uploaded_at', { ascending: false }).limit(20).returns<Register[]>()),
  ])
  if (!tutor) throw new Error('Tutor not found')
  return { tutor, sessions: sessions ?? [], slots: slots ?? [], override: override?.session_quota ?? null, registers: registers ?? [] }
}

export const SESSION_COLS = 'id, tutor_id, module_code, semester_id, slot_id, session_date, starts_at, ends_at, venue, students_attended, status, rate, hours, amount, paid_at'

export const loadSemesters = async () =>
  (await must(supabase.from('semesters').select('*').order('starts_on', { ascending: false }).returns<Semester[]>())) ?? []

/* The semester we're in; between semesters, the next one; otherwise the latest. */
export function currentSemester(list: Semester[]): Semester | null {
  const today = todayISO()
  return list.find(s => s.starts_on <= today && today <= s.ends_on)
    ?? [...list].reverse().find(s => s.starts_on > today)
    ?? list[0] ?? null
}

export const loadTutors = async () =>
  (await must(supabase.from('profiles')
    .select('id, full_name, student_number, email, tutor_modules(module_code, approved_at, modules(name))')
    .eq('is_tutor', true).order('full_name').returns<TutorRow[]>())) ?? []

/* Every session that isn't settled yet, plus this semester's — enough for counts and money. */
export const loadOpenSessions = async (semesterId: string | null) => {
  let q = supabase.from('sessions').select(SESSION_COLS)
  q = semesterId ? q.or(`status.in.(scheduled,logged,confirmed),semester_id.eq.${semesterId}`) : q.in('status', ['scheduled', 'logged', 'confirmed'])
  return (await must(q.order('session_date').returns<Session[]>())) ?? []
}

export const loadOverrides = async (semesterId: string) =>
  (await must(supabase.from('tutor_quota_overrides').select('tutor_id, session_quota').eq('semester_id', semesterId)
    .returns<{ tutor_id: string; session_quota: number }[]>())) ?? []

export const isPast = (s: Pick<Session, 'session_date'>) => s.session_date <= todayISO()

/* Waiting for admin: the tutor marked it, or it has happened and nobody marked it. */
export const needsConfirming = (s: Session) => s.status === 'logged' || (s.status === 'scheduled' && s.session_date < todayISO())

export const counts = (s: Session, semesterId: string | null) => s.semester_id === semesterId && s.status !== 'cancelled'

/* Pay works per semester: a confirmed session counts towards the tutor's pay, and Rosebank pays
   the whole semester's total once the semester has ended. ('paid' is from the old per-session flow.) */
export const isEarned = (s: Session) => s.status === 'confirmed' || s.status === 'paid'

/* What sessions would pay at today's hourly rate (for ones not confirmed yet). */
export const estimate = (list: Session[], rate: number) => list.reduce((n, s) => n + Number(s.hours ?? 1) * rate, 0)
export const totalHours = (list: Session[]) => list.reduce((n, s) => n + Number(s.hours ?? 1), 0)

export const earned = (list: Session[], semesterId: string | null) =>
  list.filter(s => isEarned(s) && s.semester_id === semesterId).reduce((n, s) => n + Number(s.amount ?? 0), 0)

/* Which week of the semester a date falls in (1 = the first week). */
export const semWeek = (sem: Semester, iso: string) =>
  Math.floor((new Date(iso + 'T00:00:00').getTime() - new Date(sem.starts_on + 'T00:00:00').getTime()) / (7 * 86_400_000)) + 1

export const semWeeks = (sem: Semester) => semWeek(sem, sem.ends_on)

export const hhmm = (t: string | null) => (t ? t.slice(0, 5) : '')

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export const fDay = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })

export const when = (s: Session) => [fDay(s.session_date), s.starts_at ? `${hhmm(s.starts_at)}–${hhmm(s.ends_at)}` : ''].filter(Boolean).join(' · ')
