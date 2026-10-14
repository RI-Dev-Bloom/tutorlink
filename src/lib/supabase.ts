import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY — copy .env.example to .env')
}

// The publishable key is meant to be public; the database rules (RLS) do the protecting.
export const supabase = createClient(url, key, {
  auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

/* Database errors come back in Postgres wording; turn the common ones into plain English. */
export function friendlyError(e: unknown): string {
  const msg = (e as { message?: string })?.message || String(e)
  if (msg.includes('profiles_student_number_key')) return 'That student number is already registered'
  if (msg.includes('profiles_student_number_check')) return 'Student numbers look like ST12345678'
  if (msg.includes('Invalid login credentials')) return 'That email and password don’t match'
  if (msg.includes('semesters_no_overlap')) return 'Those dates overlap another semester'
  if (msg.includes('semesters_check')) return 'The end date must be after the start date'
  if (msg.includes('modules_pkey')) return 'A module with that code already exists'
  if (msg.includes('modules_code_check')) return 'Module codes are 4 letters and 4 digits, e.g. PROG6221'
  if (msg.includes('modules_name_check')) return 'Give the module a name'
  if (msg.includes('should be different from the old password')) return 'Pick a password you haven’t used here before'
  if (msg.includes('applications_one_open')) return 'You already have an application waiting for a decision'
  if (msg.includes('application_marks_pkey')) return 'Each module can only be listed once'
  if (msg.includes('mime type')) return 'That kind of file can’t be sent. Use a PDF, a photo, or an Office document'
  if (msg.includes('messages_body_check')) return 'Write a message or attach a file'
  if (msg.includes('settings_file_days_check')) return 'Files can be kept for 3 to 5 days'
  if (msg.includes('maximum allowed size')) return 'That file is over the 10 MB limit'
  if (msg.includes('Session quota reached')) return msg.replace('Session quota reached', 'No sessions left this semester') + ' used'
  if (msg.includes('tutor_quota_overrides_session_quota_check')) return 'The limit can’t be negative'
  if (msg.includes('Failed to fetch')) return 'No connection — check your signal and try again'
  return msg
}
