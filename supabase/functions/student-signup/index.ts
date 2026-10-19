// TutorLink — student-signup
// Makes a student's account with their Rosebank student email and the password they chose,
// already confirmed, so no email is ever sent (emails are paused for now). The app signs
// them in straight after. The database also refuses any email that isn't a student's
// Rosebank one, so this can't be used to make other accounts.

import { createClient } from 'npm:@supabase/supabase-js@2'

const URL = Deno.env.get('SUPABASE_URL')!
const SECRET = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')!)['default']

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const STUDENT = /^st\d{8}@rcconnect\.edu\.za$/

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ error: 'Bad request' }, 400) }
  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')
  const full_name = String(body.full_name ?? '').trim().slice(0, 120)

  if (!STUDENT.test(email)) return json({ error: 'Use your Rosebank student email, like st12345678@rcconnect.edu.za' }, 400)
  if (password.length < 6) return json({ error: 'Use at least 6 characters' }, 400)
  if (full_name.length < 2) return json({ error: 'Enter your full name' }, 400)

  const admin = createClient(URL, SECRET, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name } })
  if (error) {
    if (/already|registered|exists/i.test(error.message)) return json({ error: 'User already registered' }, 409)
    if (/database error/i.test(error.message)) return json({ error: 'That student number already has an account. Sign in instead, or ask admin for a new password' }, 409)
    return json({ error: error.message }, 400)
  }
  return json({ ok: true })
})
