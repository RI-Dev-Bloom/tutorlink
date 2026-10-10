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
  if (msg.includes('Failed to fetch')) return 'No connection — check your signal and try again'
  return msg
}
