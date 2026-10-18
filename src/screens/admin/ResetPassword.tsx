/* Admin → Settings → Reset a password: for anyone whose reset email didn't arrive.
   Makes a temporary word password (e.g. BraveMango47); they choose their own on sign-in. */

import { useState, type FormEvent } from 'react'
import { adminUsers } from '../../lib/data'
import { friendlyError } from '../../lib/supabase'
import { Credentials } from '../../ui/Credentials'
import { haptic } from '../../ui/haptic'

type Reset = { email: string; name: string; role: 'student' | 'lecturer' | 'admin'; password: string }
const DOOR = { student: 'Student', lecturer: 'Lecturer', admin: 'Admin' } as const

export function ResetPasswordSheet() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<Reset | null>(null)
  const addr = email.trim().toLowerCase()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!addr.includes('@')) return
    setBusy(true); setError('')
    try { setDone(await adminUsers<Reset>({ action: 'reset_password', email: addr })); haptic(16) }
    catch (err) { haptic(24); setError(friendlyError(err)) }
    setBusy(false)
  }

  if (done) return <Credentials heading="New password ready" name={done.name || done.email} email={done.email} password={done.password} door={DOOR[done.role]} />

  return (
    <form onSubmit={submit}>
      <p className="sheet-sub">People</p>
      <h3 className="sheet-title">Reset a password</h3>
      <p className="sheet-lead">For a student, tutor or lecturer who can't get in and whose reset email didn't arrive. You'll get a temporary password to send them; they choose their own when they sign in. Their old password stops working.</p>
      <div className="sheet-form">
        <div className="field">
          <label htmlFor="f-rmail">Their Rosebank email</label>
          <input id="f-rmail" type="email" inputMode="email" autoCapitalize="off" autoComplete="off" placeholder="st12345678@rcconnect.edu.za"
            value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        {error ? <p className="err">{error}</p> : null}
        <button className="btn" style={{ marginTop: 16 }} disabled={busy || !addr.includes('@')}>{busy ? 'Making one…' : 'Make a new password'}</button>
      </div>
    </form>
  )
}
