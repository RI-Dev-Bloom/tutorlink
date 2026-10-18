/* Who is signed in, and their profile row (role, tutor flag, student number).
   Everyone signs in with their Rosebank email and a password. Students make their own
   account; staff accounts are made by admin. */

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
  qualification_code: string | null
  study_year: number | null
  title: string
  must_change_password: boolean
}

/* The email formats Rosebank uses. */
export const STUDENT_EMAIL = /^st\d{8}@rcconnect\.edu\.za$/i
export const STAFF_EMAIL = /^[^\s@]+@rbi\.ac\.za$/i

type AuthState = {
  ready: boolean
  session: Session | null
  profile: Profile | null
  profileError: string | null
  /** Arrived from a "reset your password" email: choose a new one before anything else. */
  recovering: boolean
  doneRecovering: () => void
  reloadProfile: () => Promise<void>
  signInWithPassword: (email: string, password: string) => Promise<void>
  /** Resolves true when the account needs its email confirmed before it can sign in. */
  signUpStudent: (email: string, password: string, fullName: string) => Promise<boolean>
  sendPasswordReset: (email: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthCtx = createContext<AuthState | null>(null)

export function useAuth() {
  const a = useContext(AuthCtx)
  if (!a) throw new Error('useAuth outside <AuthProvider>')
  return a
}

// Where emails (confirm, reset) send people back to: this app's own address.
const appUrl = () => new URL(import.meta.env.BASE_URL, window.location.origin).href

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [recovering, setRecovering] = useState(false)

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s) { setProfile(null); setProfileError(null); return }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, role, is_tutor, full_name, email, student_number, qualification_code, study_year, title, must_change_password')
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
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      if (event === 'SIGNED_OUT') setRecovering(false)
      // Token refreshes don't change who you are; only reload on real sign-in/out.
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED' || event === 'PASSWORD_RECOVERY') {
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
    recovering,
    doneRecovering: () => setRecovering(false),
    reloadProfile,
    signInWithPassword: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
      if (error) throw error
    },
    signUpStudent: async (email, password, fullName) => {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(), password,
        options: { emailRedirectTo: appUrl(), data: { full_name: fullName.trim() } },
      })
      if (error) throw error
      // With "confirm email" on, an address that already has an account comes back with no identities.
      if (data.user && !data.user.identities?.length) throw new Error('User already registered')
      return !data.session
    },
    sendPasswordReset: async email => {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: appUrl() })
      if (error) throw error
    },
    signOut: async () => {
      await forgetThisDevice()   // while still signed in, so the database lets us
      await supabase.auth.signOut()
    },
  }

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}
