// TutorLink — admin-users
// Lets staff in (lecturers, by their @rbi.ac.za email), gives passwords, removes logins.
// Needs the secret key (which bypasses every database rule), so it lives here on the server, never in the app.
// Every request is checked: the caller must be signed in and be an admin.

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

/* Passwords people can read out or type from a WhatsApp message: Adjective + Fruit + 2 digits,
   e.g. BraveMango47. About 750,000 of them, picked at random; always temporary, since the
   person chooses their own the first time they sign in. Plain words only, nothing easy to misspell. */
const ADJECTIVES = [
  'Able', 'Active', 'Agile', 'Alert', 'Amber', 'Ample', 'Avid', 'Awake', 'Balmy', 'Bold',
  'Bouncy', 'Brave', 'Breezy', 'Bright', 'Brisk', 'Bubbly', 'Busy', 'Calm', 'Candid', 'Careful',
  'Cheery', 'Chill', 'Civil', 'Classy', 'Clean', 'Clear', 'Clever', 'Cool', 'Cosy', 'Crisp',
  'Curious', 'Daring', 'Dandy', 'Dapper', 'Deep', 'Eager', 'Early', 'Easy', 'Epic', 'Even',
  'Fair', 'Fancy', 'Fast', 'Fearless', 'Fine', 'Firm', 'Flash', 'Fluffy', 'Fond', 'Free',
  'Fresh', 'Friendly', 'Frosty', 'Funny', 'Gentle', 'Giant', 'Glad', 'Gleaming', 'Glowing', 'Golden',
  'Good', 'Grand', 'Great', 'Green', 'Happy', 'Hardy', 'Hearty', 'Helpful', 'Heroic', 'Honest',
  'Humble', 'Jolly', 'Joyful', 'Juicy', 'Keen', 'Kind', 'Lively', 'Loyal', 'Lucky', 'Magic',
  'Mellow', 'Merry', 'Mighty', 'Mild', 'Modern', 'Neat', 'Nimble', 'Noble', 'Polite', 'Proud',
  'Quick', 'Quiet', 'Rapid', 'Ready', 'Royal', 'Rustic', 'Shiny', 'Silent', 'Silver', 'Simple',
  'Sleek', 'Smart', 'Smiling', 'Smooth', 'Snappy', 'Solid', 'Sparkly', 'Speedy', 'Spicy', 'Steady',
  'Strong', 'Sturdy', 'Sunny', 'Super', 'Sure', 'Sweet', 'Swift', 'Tall', 'Tidy', 'Tiny',
  'Top', 'Tough', 'True', 'Trusty', 'Upbeat', 'Valiant', 'Vivid', 'Warm', 'Wavy', 'Wild',
  'Windy', 'Wise', 'Witty', 'Young', 'Zany', 'Zesty', 'Cosmic', 'Electric', 'Lunar', 'Solar',
]
const FRUITS = [
  'Apple', 'Apricot', 'Avocado', 'Banana', 'Berry', 'Cherry', 'Coconut', 'Date', 'Fig', 'Grape',
  'Guava', 'Kiwi', 'Lemon', 'Lime', 'Litchi', 'Mango', 'Melon', 'Naartjie', 'Nectarine', 'Olive',
  'Orange', 'Papaya', 'Peach', 'Pear', 'Pineapple', 'Plum', 'Pomelo', 'Quince', 'Raisin', 'Cranberry',
  'Blueberry', 'Strawberry', 'Raspberry', 'Mulberry', 'Gooseberry', 'Granadilla', 'Clementine', 'Tangerine', 'Grapefruit', 'Watermelon',
  'Peanut', 'Almond', 'Cashew', 'Walnut', 'Pecan', 'Hazelnut', 'Pumpkin', 'Carrot', 'Pepper', 'Tomato',
  'Mandarin', 'Kumquat', 'Persimmon', 'Lychee', 'Starfruit', 'Rhubarb', 'Marula', 'Plantain', 'Currant', 'Elderberry',
]
const pick = <T,>(list: T[]) => list[crypto.getRandomValues(new Uint32Array(1))[0] % list.length]
function wordPassword() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 90 + 10
  return `${pick(ADJECTIVES)}${pick(FRUITS)}${n}`
}

const STAFF = /^[^\s@]+@rbi\.ac\.za$/i

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const admin = createClient(URL, SECRET, { auth: { persistSession: false, autoRefreshToken: false } })

  // Who is calling?
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  const { data: who } = await admin.auth.getUser(token)
  if (!who?.user) return json({ error: 'Please sign in again' }, 401)

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ error: 'Bad request' }, 400) }

  const { data: me } = await admin.from('profiles').select('role').eq('id', who.user.id).single()
  if (me?.role !== 'admin') return json({ error: 'Admin only' }, 403)

  if (body.action === 'create_lecturer') {
    const title = String(body.title ?? '').trim()
    const first = String(body.first_name ?? '').trim()
    const last = String(body.last_name ?? '').trim()
    const email = String(body.email ?? '').trim().toLowerCase()
    const modules = Array.isArray(body.modules) ? body.modules.map(String) : []
    if (!first || !last) return json({ error: 'Enter a name and surname' }, 400)
    if (!STAFF.test(email)) return json({ error: 'Use their Rosebank staff email, ending in @rbi.ac.za' }, 400)
    if (!modules.length) return json({ error: 'Pick at least one module' }, 400)

    // Let the email in first: the database refuses any new account that isn't a student's
    // Rosebank email or on this list.
    const { error: ei } = await admin.from('staff_invites').upsert({ email })
    if (ei) return json({ error: ei.message }, 400)

    const full_name = `${first} ${last}`
    const password = wordPassword()
    const { data: created, error } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      app_metadata: { role: 'lecturer' },
      user_metadata: { full_name },
    })
    if (error) return json({ error: /already|registered|exists/i.test(error.message) ? 'An account already uses that email' : error.message }, 400)
    const id = created.user.id
    // Auth attaches app_metadata after the row is inserted, so set the role here too.
    // "must_change_password" doubles as "hasn't signed in yet".
    const { error: e1 } = await admin.from('profiles')
      .update({ role: 'lecturer', title, full_name, must_change_password: true }).eq('id', id)
    const { error: e2 } = await admin.from('lecturer_modules').insert(modules.map(m => ({ lecturer_id: id, module_code: m })))
    if (e1 || e2) {
      await admin.auth.admin.deleteUser(id)   // don't leave a half-made account behind
      return json({ error: (e1 || e2)!.message }, 400)
    }
    return json({ id, email, password })
  }

  // A new temporary password for anyone (student, tutor, lecturer, admin), found by id or email.
  if (body.action === 'reset_password') {
    const byEmail = String(body.email ?? '').trim().toLowerCase()
    const q = admin.from('profiles').select('id, role, email, full_name, title')
    const { data: target } = byEmail ? await q.eq('email', byEmail).maybeSingle() : await q.eq('id', String(body.user_id ?? '')).maybeSingle()
    if (!target) return json({ error: 'No account uses that email' }, 404)
    if (target.id === who.user.id) return json({ error: 'Change your own password under Settings instead' }, 400)
    const password = wordPassword()
    const { error } = await admin.auth.admin.updateUserById(target.id, { password, email_confirm: true })
    if (error) return json({ error: error.message }, 400)
    await admin.from('profiles').update({ must_change_password: true }).eq('id', target.id)
    return json({ id: target.id, email: target.email, name: [target.title, target.full_name].filter(Boolean).join(' '), role: target.role, password })
  }

  if (body.action === 'remove_lecturer') {
    const id = String(body.user_id ?? '')
    const { data: target } = await admin.from('profiles').select('role, email').eq('id', id).single()
    if (target?.role !== 'lecturer') return json({ error: 'Only lecturer accounts can be removed here' }, 400)
    // Removing the login cascades to their profile, modules and message threads.
    // Lecturers own no pay or session records, so nothing else is lost.
    const { error } = await admin.auth.admin.deleteUser(id)
    if (error) return json({ error: error.message }, 400)
    await admin.from('staff_invites').delete().eq('email', target.email)
    return json({ id })
  }

  return json({ error: 'Unknown action' }, 400)
})
