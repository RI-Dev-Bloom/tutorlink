// TutorLink — admin-users
// Creates, resets and removes staff logins. Needs the secret key (which
// bypasses every database rule), so it lives here on the server, never in the app.
// Every request is checked: the caller must be signed in AND be an admin.

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

// Easy to read aloud or type from a WhatsApp message: no 0/O, 1/l/I.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
function makePassword(length = 12) {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('')
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const admin = createClient(URL, SECRET, { auth: { persistSession: false, autoRefreshToken: false } })

  // Who is calling?
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  const { data: who } = await admin.auth.getUser(token)
  if (!who?.user) return json({ error: 'Please sign in again' }, 401)
  const { data: me } = await admin.from('profiles').select('role').eq('id', who.user.id).single()
  if (me?.role !== 'admin') return json({ error: 'Admin only' }, 403)

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ error: 'Bad request' }, 400) }

  if (body.action === 'create_lecturer') {
    const title = String(body.title ?? '').trim()
    const first = String(body.first_name ?? '').trim()
    const last = String(body.last_name ?? '').trim()
    const email = String(body.email ?? '').trim().toLowerCase()
    const modules = Array.isArray(body.modules) ? body.modules.map(String) : []
    if (!first || !last) return json({ error: 'Enter a name and surname' }, 400)
    if (!EMAIL.test(email)) return json({ error: 'Enter a valid email address' }, 400)
    if (!modules.length) return json({ error: 'Pick at least one module' }, 400)

    const password = makePassword()
    const full_name = `${first} ${last}`
    const { data: created, error } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      app_metadata: { role: 'lecturer' },
      user_metadata: { full_name },
    })
    if (error) {
      const taken = /already|registered|exists/i.test(error.message)
      return json({ error: taken ? 'An account already uses that email' : error.message }, 400)
    }
    const id = created.user.id
    // Auth attaches app_metadata after the row is inserted, so the profile trigger
    // sees a plain student. Set the role here.
    const { error: e1 } = await admin.from('profiles')
      .update({ role: 'lecturer', title, full_name, must_change_password: true }).eq('id', id)
    const { error: e2 } = await admin.from('lecturer_modules').insert(modules.map(m => ({ lecturer_id: id, module_code: m })))
    if (e1 || e2) {
      await admin.auth.admin.deleteUser(id)   // don't leave a half-made account behind
      return json({ error: (e1 || e2)!.message }, 400)
    }
    return json({ id, email, password })
  }

  if (body.action === 'reset_password') {
    const id = String(body.user_id ?? '')
    const { data: target } = await admin.from('profiles').select('role, email').eq('id', id).single()
    // Students sign in with Google — there's no TutorLink password to reset.
    if (!target || target.role === 'student') return json({ error: 'Only staff passwords can be reset here' }, 400)
    const password = makePassword()
    const { error } = await admin.auth.admin.updateUserById(id, { password })
    if (error) return json({ error: error.message }, 400)
    await admin.from('profiles').update({ must_change_password: true }).eq('id', id)
    return json({ id, email: target.email, password })
  }

  if (body.action === 'remove_lecturer') {
    const id = String(body.user_id ?? '')
    const { data: target } = await admin.from('profiles').select('role').eq('id', id).single()
    if (target?.role !== 'lecturer') return json({ error: 'Only lecturer accounts can be removed here' }, 400)
    // Removing the login cascades to their profile, modules and message threads.
    // Lecturers own no pay or session records, so nothing else is lost.
    const { error } = await admin.auth.admin.deleteUser(id)
    if (error) return json({ error: error.message }, 400)
    return json({ id })
  }

  return json({ error: 'Unknown action' }, 400)
})
