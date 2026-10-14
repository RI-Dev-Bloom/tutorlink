// TutorLink — tidy-files
// Called every hour by the database (public.tidy_message_files). Removes files sent in
// messages once they're older than admin's setting (3–5 days), plus files that were
// uploaded but never sent. Files can only be removed through the Storage API, hence this.
// Same shared secret as send-push, so only the database can call it.

import { createClient } from 'npm:@supabase/supabase-js@2'

const admin = createClient(Deno.env.get('SUPABASE_URL')!, JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')!)['default'],
  { auth: { persistSession: false, autoRefreshToken: false } })

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async req => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  const { data: cfg } = await admin.rpc('push_config')
  if (!cfg?.push_secret || req.headers.get('x-push-secret') !== cfg.push_secret) return json({ error: 'Not allowed' }, 401)

  const { data: s, error: e1 } = await admin.from('settings').select('file_days').single()
  if (e1) return json({ error: e1.message }, 500)
  const cutoff = new Date(Date.now() - s.file_days * 86_400_000).toISOString()

  const { data: due, error: e2 } = await admin.from('messages').select('id, file_path')
    .not('file_path', 'is', null).lt('created_at', cutoff).limit(500)
  if (e2) return json({ error: e2.message }, 500)
  // Abandoned uploads get a day's grace, so a message being written right now isn't affected.
  const { data: orphans, error: e3 } = await admin.rpc('orphan_attachments', { p_before: new Date(Date.now() - 86_400_000).toISOString() })
  if (e3) return json({ error: e3.message }, 500)

  const paths = [...(due ?? []).map(d => d.file_path as string), ...((orphans ?? []) as string[])]
  if (paths.length) {
    const { error } = await admin.storage.from('attachments').remove(paths)
    if (error) return json({ error: error.message }, 500)
  }
  if (due?.length) {
    const { error } = await admin.from('messages').update({ file_path: null, file_removed_at: new Date().toISOString() })
      .in('id', due.map(d => d.id))
    if (error) return json({ error: error.message }, 500)
  }
  return json({ removed: paths.length, expired: due?.length ?? 0 })
})
