/* Messages: the inbox, one thread, the people you're allowed to message,
   and live updates so a new message shows up without refreshing. */

import { useEffect } from 'react'
import { invalidate, must } from './data'
import { supabase } from './supabase'
import type { Role } from './auth'

export type InboxRow = {
  conversation_id: string
  other_id: string
  other_name: string
  other_title: string
  other_role: Role
  other_is_tutor: boolean
  last_topic: string | null
  last_at: string | null
  last_from_me: boolean | null
  unread: number
}

export type Person = { id: string; full_name: string; title: string; role: Role; is_tutor: boolean }

export type Message = {
  id: string; sender_id: string; topic: string; body: string; created_at: string; read_at: string | null
  file_path: string | null; file_name: string | null; file_size: number | null; file_type: string | null; file_removed_at: string | null
}

export const loadInbox = async () => ((await must(supabase.rpc('my_inbox'))) ?? []) as InboxRow[]

export const unreadTotal = (rows: InboxRow[] | undefined) => (rows ?? []).reduce((n, r) => n + r.unread, 0)

/* Everyone the database lets you message. Students (non-tutors) never appear. */
export const loadContacts = async (me: string) =>
  ((await must(supabase.from('profiles').select('id, full_name, title, role, is_tutor')
    .neq('id', me).or('role.in.(lecturer,admin),is_tutor.eq.true').order('full_name').returns<Person[]>())) ?? [])

export async function loadThread(me: string, other: string) {
  const [a, b] = me < other ? [me, other] : [other, me]
  const [person, conv] = await Promise.all([
    must(supabase.from('profiles').select('id, full_name, title, role, is_tutor').eq('id', other).maybeSingle<Person>()),
    must(supabase.from('conversations').select('id').eq('user_a', a).eq('user_b', b).maybeSingle<{ id: string }>()),
  ])
  const messages = conv
    ? (await must(supabase.from('messages').select('id, sender_id, topic, body, created_at, read_at, file_path, file_name, file_size, file_type, file_removed_at')
        .eq('conversation_id', conv.id).order('created_at', { ascending: false }).returns<Message[]>())) ?? []
    : []
  return { person, conversationId: conv?.id ?? null, messages }
}

export const roleTag = (p: { role: Role; is_tutor: boolean }) =>
  p.role === 'admin' ? 'Admin' : p.role === 'lecturer' ? 'Lecturer' : p.is_tutor ? 'Tutor' : 'Student'

export const tagClass = (p: { role: Role }) => p.role === 'admin' ? 'tag tag--admin' : p.role === 'lecturer' ? 'tag tag--lect' : 'tag tag--tutor'

export function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d ago`
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
}

export const fullTime = (iso: string) =>
  new Date(iso).toLocaleString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/* One live subscription for the whole app: any new or read message refreshes the inbox and open threads.
   The database rules decide which changes reach this phone. */
export function useLiveMessages(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    const channel = supabase.channel('messages-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => invalidate('inbox', 'thread'))
      // Once connected (and after any reconnect), catch up on whatever arrived while we weren't listening.
      .subscribe(status => { if (status === 'SUBSCRIBED') invalidate('inbox', 'thread') })
    // Coming back to the app after a while: catch up on anything missed.
    const onShow = () => { if (document.visibilityState === 'visible') invalidate('inbox', 'thread') }
    document.addEventListener('visibilitychange', onShow)
    return () => { document.removeEventListener('visibilitychange', onShow); supabase.removeChannel(channel) }
  }, [enabled])
}
