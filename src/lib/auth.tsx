/* Who is signed in, and their profile row (role, tutor flag, student number). */

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { forgetThisDevice } from './push'
import { supabase } from './supabase'

export type Role = 'student' | 'lecturer' | 'admin'

export type Profile = {
  id: string
  role: Role
  is_tutor: boolean
  full_name: string
  email: string
  student_number: string | null
  title: string
  must_change_password: boolean
}

type AuthState = {
  ready: boolean
  session: Session | null
  profile: Profile | null
  profileError: string | null
  reloadProfile: () => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithPassword: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthCtx = createContext<AuthState | null>(null)

export function useAuth() {
  const a = useContext(AuthCtx)
  if (!a) throw new Error('useAuth outside <AuthProvider>')
  return a
}

// Where Google sends people back to: this app's own address (works locally and on GitHub Pages).
const appUrl = () => new URL(import.meta.env.BASE_URL, window.location.origin).href

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s) { setProfile(null); setProfileError(null); return }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, role, is_tutor, full_name, email, student_number, title, must_change_password')
      .eq('id', s.user.id)
      .single()
    setProfile(error ? null : (data as Profile))
    setProfileError(error ? error.message : null)
  }, [])

  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return
      setSession(data.session)
      await loadProfile(data.session)
      if (alive) setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      // Token refreshes don't change who you are; only reload on real sign-in/out.
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        // Supabase advises not awaiting other calls inside this callback.
        setTimeout(() => { loadProfile(s) }, 0)
      }
    })
    return () => { alive = false; sub.subscription.unsubscribe() }
  }, [loadProfile])

  const reloadProfile = useCallback(() => loadProfile(session), [loadProfile, session])

  const value: AuthState = {
    ready,
    session,
    profile,
    profileError,
    reloadProfile,
    signInWithGoogle: async () => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: appUrl(), queryParams: { prompt: 'select_account' } },
      })
      if (error) throw error
    },
    signInWithPassword: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw error
    },
    signOut: async () => {
      await forgetThisDevice()   // while still signed in, so the database lets us
      await supabase.auth.signOut()
    },
  }

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}
