/* Row shapes as the app reads them. */

export type Module = { code: string; name: string; hidden: boolean; high_risk: boolean }

export type Semester = { id: string; name: string; starts_on: string; ends_on: string; session_quota: number }

export type Settings = { rate_per_session: number; min_mark: number; auto_decline: boolean; file_days: number }

export type Lecturer = {
  id: string
  title: string
  full_name: string
  email: string
  must_change_password: boolean
  lecturer_modules: { module_code: string }[]
}

/* Today as YYYY-MM-DD on the phone's own clock (not UTC). */
export const todayISO = () => new Date().toLocaleDateString('en-CA')

export const fDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })

export const displayName = (p: { title?: string; full_name: string }) =>
  [p.title, p.full_name].filter(Boolean).join(' ')

export const rand = (n: number) => 'R' + Number(n).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
