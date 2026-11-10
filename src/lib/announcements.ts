/* Announcements: admin posts to every student. They show on the student's Home feed until they end
   (or the student closes them), and stay in Messages after that. The image is removed when it ends. */

import { useState } from 'react'
import { must } from './data'
import { supabase } from './supabase'
import { haptic } from '../ui/haptic'

export type Announcement = {
  id: string; title: string | null; body: string | null; image_path: string | null; image_removed_at: string | null
  event_date: string | null; ends_at: string; created_at: string
}

const COLS = 'id, title, body, image_path, image_removed_at, event_date, ends_at, created_at'

export const loadAnnouncements = async () =>
  (await must(supabase.from('announcements').select(COLS).order('created_at', { ascending: false }).limit(100).returns<Announcement[]>())) ?? []

export const isLive = (a: Announcement) => new Date(a.ends_at).getTime() > Date.now()

export const DURATIONS = [{ days: 1, label: '1 day' }, { days: 3, label: '3 days' }, { days: 7, label: '1 week' }, { days: 14, label: '2 weeks' }]

const day = (d: Date) => d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })
export const fDay = (iso: string) => day(new Date(iso.length === 10 ? iso + 'T12:00:00' : iso))

/* The last day it shows. One that ends at midnight after its event shows the event day, not the next. */
export const lastDay = (a: Pick<Announcement, 'ends_at'>) => day(new Date(new Date(a.ends_at).getTime() - 60_000))

export const signedImage = async (path: string) =>
  (await must(supabase.storage.from('announcements').createSignedUrl(path, 3600)))?.signedUrl ?? ''

/* Announcements a student closed on their feed, remembered on this phone. */
export function useClosedAnnouncements(uid: string) {
  const k = `tl.ann.closed.${uid}`
  const [closed, setClosed] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem(k) ?? '[]') } catch { return [] } })
  const close = (id: string) => {
    haptic(6)
    const next = [...closed, id].slice(-200)
    setClosed(next)
    try { localStorage.setItem(k, JSON.stringify(next)) } catch { /* private mode */ }
  }
  return [closed, close] as const
}
