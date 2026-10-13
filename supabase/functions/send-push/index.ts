// TutorLink — send-push
// Called by the database (public.notify) when something happens. Delivers a web push
// notification to every phone the given people turned notifications on for.
// Only the database knows the shared secret (in Vault), so nobody else can make phones buzz.

import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2'

const admin = createClient(Deno.env.get('SUPABASE_URL')!, JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')!)['default'],
  { auth: { persistSession: false, autoRefreshToken: false } })

// The keys live in Supabase Vault (see public.push_config), read once per warm instance.
let config: Promise<Record<string, string>> | null = null
const loadConfig = () => config ??= admin.rpc('push_config').then(({ data, error }) => {
  if (error || !data) { config = null; throw new Error(error?.message ?? 'push not configured') }
  webpush.setVapidDetails(data.vapid_subject, data.vapid_public_key, data.vapid_private_key)
  return data as Record<string, string>
})

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async req => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  const cfg = await loadConfig()
  if (!cfg.push_secret || req.headers.get('x-push-secret') !== cfg.push_secret) return json({ error: 'Not allowed' }, 401)

  const { user_ids, title, body, url, tag } = await req.json()
  if (!Array.isArray(user_ids) || !user_ids.length) return json({ sent: 0 })

  const { data: subs, error } = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth').in('user_id', user_ids)
  if (error) return json({ error: error.message }, 500)

  const payload = JSON.stringify({ title, body, url, tag })
  const gone: string[] = []
  let sent = 0
  await Promise.all((subs ?? []).map(async s => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 24 })
      sent++
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode
      if (code === 404 || code === 410) gone.push(s.id)   // the phone unsubscribed or the app was removed
      else console.error('push failed', code, (e as Error).message)
    }
  }))
  if (gone.length) await admin.from('push_subscriptions').delete().in('id', gone)
  return json({ sent, removed: gone.length })
})
