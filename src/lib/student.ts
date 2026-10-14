/* What the student side reads: their modules, their latest application, the minimum mark. */

import { must } from './data'
import { supabase } from './supabase'
import type { Settings } from './types'

export type MyModule = { module_code: string; modules: { name: string } | null }

export type ApplicationStatus = 'pending' | 'under_review' | 'approved' | 'rejected'

export type MyApplication = {
  id: string
  status: ApplicationStatus
  results_path: string
  response_message: string | null
  submitted_at: string
  processed_at: string | null
  application_marks: { module_code: string; mark: number; applying: boolean; modules: { name: string } | null }[]
}

export const loadMyModules = async (uid: string) =>
  (await must(supabase.from('student_modules').select('module_code, modules(name)')
    .eq('student_id', uid).order('module_code').returns<MyModule[]>())) ?? []

export const loadMyApplication = async (uid: string) => {
  const rows = await must(supabase.from('applications')
    .select('id, status, results_path, response_message, submitted_at, processed_at, application_marks(module_code, mark, applying, modules(name))')
    .eq('student_id', uid).order('submitted_at', { ascending: false }).limit(1).returns<MyApplication[]>())
  return rows?.[0] ?? null
}

export const loadSettings = () =>
  must(supabase.from('settings').select('rate_per_session, min_mark, auto_decline, file_days').single<Settings>())

export const loadMyTutorModules = async (uid: string) =>
  (await must(supabase.from('tutor_modules').select('module_code, modules(name)')
    .eq('tutor_id', uid).order('module_code').returns<MyModule[]>())) ?? []

export const isOpen = (s: ApplicationStatus) => s === 'pending' || s === 'under_review'

/* Adds a module everyone can then pick. If the code already exists, you get that one. */
export async function addModule(code: string, name: string) {
  return must(supabase.rpc('add_module', { p_code: code, p_name: name.trim() })) as Promise<string>
}
