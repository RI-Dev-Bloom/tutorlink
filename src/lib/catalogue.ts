/* Rosebank's official catalogue: qualifications (by faculty), the modules in each with
   their year of study, plus the counts built on it (demand, who's missing, reach by faculty). */

import { must } from './data'
import { supabase } from './supabase'
import type { Kind } from './attendance'

export type Qualification = { code: string; name: string; hidden: boolean; faculty: string | null }
export type QualModule = { module_code: string; year: number | null; elective: boolean; modules: { name: string } | null }
export type Link = { qualification_code: string; module_code: string }
export type Demand = { module_code: string; students: number; tutors: number; qualifications: number }
export type Missing = { student_number: string; full_name: string; qualification_code: string | null; held: number }
export type FacultyReach = { faculty: string; students: number; checkins: number }

export const loadQualifications = async () =>
  (await must(supabase.from('qualifications').select('code, name, hidden, faculty').order('name').returns<Qualification[]>())) ?? []

export const loadQualificationModules = async (code: string) =>
  (await must(supabase.from('qualification_modules').select('module_code, year, elective, modules(name)')
    .eq('qualification_code', code).order('year').order('module_code').returns<QualModule[]>())) ?? []

/* Every qualification ↔ module link (about 800), for filtering modules by faculty or qualification. */
export const loadLinks = async () =>
  (await must(supabase.from('qualification_modules').select('qualification_code, module_code').range(0, 4999).returns<Link[]>())) ?? []

export const loadDemand = async () => ((await must(supabase.rpc('module_demand'))) ?? []) as Demand[]

export const loadMissing = async (semId: string, module: string, kind: Kind) =>
  ((await must(supabase.rpc('module_missing', { p_semester: semId, p_module: module, p_kind: kind }))) ?? []) as Missing[]

export const loadFacultyReach = async (semId: string, kind: Kind = 'tutorial') =>
  ((await must(supabase.rpc('attendance_by_faculty', { p_semester: semId, p_kind: kind }))) ?? []) as FacultyReach[]

/* "IIE Diploma in Information Technology in Software Development" → "Diploma in IT in Software Development". */
export const shortQual = (name: string) => name.replace(/^IIE /, '').replace(/Information Technology/g, 'IT')

/* Faculties in a steady order, from the qualifications list. */
export const facultiesOf = (qs: Qualification[]) =>
  [...new Set(qs.filter(q => !q.hidden && q.faculty).map(q => q.faculty!))].sort()

/* How many years a qualification runs, from the years its modules are in. */
export const yearsIn = (mods: QualModule[]) => Math.max(1, ...mods.map(m => m.year ?? 1))
