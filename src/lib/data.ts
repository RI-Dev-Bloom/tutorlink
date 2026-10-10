/* Tiny data layer: load something, and reload it whenever its key is invalidated
   (e.g. adding a lecturer invalidates 'lecturers', so the list behind the sheet updates). */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { friendlyError, supabase } from './supabase'

const listeners = new Map<string, Set<() => void>>()

export function invalidate(...keys: string[]) {
  keys.forEach(k => listeners.get(k)?.forEach(fn => fn()))
}

export function useQuery<T>(key: string, load: () => Promise<T>) {
  const [data, setData] = useState<T | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const loadRef = useRef(load)
  useLayoutEffect(() => { loadRef.current = load })

  const reload = useCallback(async () => {
    try { setData(await loadRef.current()); setError(null) }
    catch (e) { setError(friendlyError(e)) }
  }, [])

  useEffect(() => {
    reload()
    const set = listeners.get(key) ?? new Set()
    set.add(reload)
    listeners.set(key, set)
    return () => { set.delete(reload) }
  }, [key, reload])

  return { data, error, reload, loading: data === undefined && !error }
}

/* Supabase returns { data, error }; this throws the error so callers can try/catch. */
export async function must<T>(p: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await p
  if (error) throw error
  return data
}

/* Calls the admin-users Edge Function and surfaces its { error } message. */
export async function adminUsers<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('admin-users', { body })
  if (error) {
    const ctx = (error as { context?: Response }).context
    const msg = ctx ? await ctx.json().then(j => j.error).catch(() => null) : null
    throw new Error(msg || error.message)
  }
  return data as T
}

export const appLink = () => new URL(import.meta.env.BASE_URL, window.location.origin).href
