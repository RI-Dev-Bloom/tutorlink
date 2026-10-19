/* Sign-in behind each door on the first screen. Students (and tutors) can also make their
   account here with their Rosebank student email; staff accounts are made by admin. */

import { useState, type FormEvent } from 'react'
import { STAFF_EMAIL, STUDENT_EMAIL, useAuth } from '../lib/auth'
import { friendlyError } from '../lib/supabase'
import { useStack } from '../nav/Stack'
import { Icon } from '../ui/icons'
import { BackButton, NavBar } from '../ui/parts'
import { haptic } from '../ui/haptic'

export type Door = 'student' | 'tutor' | 'lecturer' | 'admin'

const TITLE: Record<Door, string> = { student: 'Student', tutor: 'Tutor', lecturer: 'Lecturer', admin: 'Admin' }
const isStudentDoor = (d: Door) => d === 'student' || d === 'tutor'

// The Student and Tutor doors open the same account; this decides which view shows first.
const VIEW_KEY = 'tl.view'
const rememberView = (d: Door) => {
  if (!isStudentDoor(d)) return
  try { localStorage.setItem(VIEW_KEY, d) } catch { /* private mode */ }
}

export function SignIn({ door }: { door: Door }) {
  const { signInWithPassword, signUpStudent } = useAuth()
  const { push } = useStack()
  const canCreate = isStudentDoor(door)
  const [mode, setMode] = useState<'in' | 'new'>('in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const addr = email.trim()
  const creating = canCreate && mode === 'new'
  const emailHint =
    !addr || !addr.includes('@') ? ''
    : creating && !STUDENT_EMAIL.test(addr) ? 'Use your Rosebank student email, like st12345678@rcconnect.edu.za'
    : !canCreate && STUDENT_EMAIL.test(addr) ? 'That’s a student email: go back and tap Student'
    : canCreate && STAFF_EMAIL.test(addr) ? 'That’s a staff email: go back and tap Lecturer or Admin'
    : ''
  const passHint =
    creating && password && password.length < 8 ? 'At least 8 characters'
    : creating && password2 && password !== password2 ? 'The two passwords don’t match'
    : ''
  const valid = creating
    ? name.trim().length > 1 && STUDENT_EMAIL.test(addr) && password.length >= 8 && password === password2
    : !!addr && !!password

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setBusy(true); setError('')
    rememberView(door)
    try {
      if (creating) {
        const mustConfirm = await signUpStudent(addr, password, name)
        haptic(14)
        if (mustConfirm) { setBusy(false); push(<CheckInbox email={addr.toLowerCase()} />) }
        // Otherwise they're signed in, and the app moves on by itself.
      } else {
        await signInWithPassword(addr, password)
        haptic(14)   // the app swaps to the right portal by itself
      }
    } catch (err) {
      haptic(24); setError(friendlyError(err)); setBusy(false)
    }
  }

  const switchMode = (m: 'in' | 'new') => { haptic(6); setMode(m); setError('') }

  return (
    <>
      <NavBar title={TITLE[door]} left={<BackButton />} />
      <div className="body"><form className="pad" onSubmit={submit}>
        <h2 className="display display--sm">{creating ? <>Make your<br />account</> : <>Welcome<br />back</>}</h2>
        <p className="sub">
          {creating ? 'Use your Rosebank student email. Your student number comes from it.'
            : canCreate ? 'Sign in with your Rosebank student email.'
            : 'Sign in with your Rosebank staff email and the password admin sent you.'}
        </p>

        {canCreate ? (
          <div className="seg" style={{ marginTop: 20 }}>
            <button type="button" className={mode === 'in' ? 'on' : ''} onClick={() => switchMode('in')}>Sign in</button>
            <button type="button" className={mode === 'new' ? 'on' : ''} onClick={() => switchMode('new')}>Create account</button>
          </div>
        ) : null}

        <div style={{ marginTop: 16 }}>
          {creating ? (
            <div className="field">
              <label htmlFor="f-name">Full name</label>
              <input id="f-name" type="text" autoComplete="name" value={name} onChange={e => setName(e.target.value)} />
            </div>
          ) : null}
          <div className="field">
            <label htmlFor="f-mail">Rosebank email</label>
            <input id="f-mail" type="email" inputMode="email" autoCapitalize="off" autoComplete="username"
              placeholder={canCreate ? 'st12345678@rcconnect.edu.za' : 'name@rbi.ac.za'}
              value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          {emailHint ? <p className="small muted" style={{ marginTop: 6 }}>{emailHint}</p> : null}
          <div className="field">
            <label htmlFor="f-pass">{creating ? 'Choose a password' : 'Password'}</label>
            <input id="f-pass" type="password" autoComplete={creating ? 'new-password' : 'current-password'}
              value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          {creating ? (
            <div className="field">
              <label htmlFor="f-pass2">Type it again</label>
              <input id="f-pass2" type="password" autoComplete="new-password" value={password2} onChange={e => setPassword2(e.target.value)} />
            </div>
          ) : null}
          {passHint ? <p className="err">{passHint}</p> : null}
          {error ? <p className="err">{error}</p> : null}
        </div>

        <button className="btn" style={{ marginTop: 18 }} disabled={busy || !valid}>
          {busy ? (creating ? 'Making your account…' : 'Signing in…') : creating ? 'Create account' : 'Sign in'}
        </button>
        {!creating ? (
          <button type="button" className="btn btn--outline" style={{ marginTop: 9 }} onClick={() => { haptic(6); push(<ForgotPassword email={addr} />) }}>
            Forgot password?
          </button>
        ) : null}

        {!canCreate ? (
          <div className="note note--plain" style={{ marginTop: 16 }}>
            <Icon name="alert" size={15} />
            <span>Staff accounts are made by the programme office. New here? Ask admin to add you, and they'll send you a password.</span>
          </div>
        ) : null}
      </form></div>
    </>
  )
}

/* After making an account, when Rosebank email confirmation is on. */
function CheckInbox({ email }: { email: string }) {
  return (
    <>
      <NavBar title="Check your email" left={<BackButton />} />
      <div className="body"><div className="pad">
        <div className="note note--green"><Icon name="mail" size={15} /><span><b>Nearly there.</b> We sent a link to {email}.</span></div>
        <p className="sub" style={{ marginTop: 16 }}>Open your Rosebank inbox (Outlook) and tap the link to confirm your email. Then come back here and sign in with your email and password. You only do this once.</p>
        <p className="small muted" style={{ marginTop: 14 }}>Nothing after a few minutes? Check Junk, then try again or ask the programme office.</p>
      </div></div>
    </>
  )
}

function ForgotPassword({ email: start }: { email: string }) {
  const { sendPasswordReset } = useAuth()
  const [email, setEmail] = useState(start)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const addr = email.trim()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!addr) return
    setBusy(true); setError('')
    try { await sendPasswordReset(addr); haptic(14); setSent(true) }
    catch (err) { haptic(24); setError(friendlyError(err)) }
    setBusy(false)
  }

  return (
    <>
      <NavBar title="Forgot password" left={<BackButton />} />
      <div className="body"><form className="pad" onSubmit={submit}>
        {sent ? (
          <>
            <div className="note note--green"><Icon name="mail" size={15} /><span><b>Check your inbox.</b> If {addr} has an account, a link to choose a new password is on its way.</span></div>
            <p className="sub" style={{ marginTop: 16 }}>Open the link on this phone. It brings you back here to pick a new password.</p>
            <p className="small muted" style={{ marginTop: 14 }}>Nothing after a few minutes? Check Junk, or ask admin for a new password. They can make one for you straight away.</p>
          </>
        ) : (
          <>
            <h2 className="display display--sm">New<br />password</h2>
            <p className="sub">Enter your Rosebank email and we'll send you a link to choose a new password.</p>
            <div className="field" style={{ marginTop: 20 }}>
              <label htmlFor="f-fmail">Rosebank email</label>
              <input id="f-fmail" type="email" inputMode="email" autoCapitalize="off" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            {error ? <p className="err">{error}</p> : null}
            <button className="btn" style={{ marginTop: 18 }} disabled={busy || !addr.includes('@')}>{busy ? 'Sending…' : 'Send me a link'}</button>
            <p className="small muted" style={{ marginTop: 12 }}>No email? Admin can also give you a new password.</p>
          </>
        )}
      </form></div>
    </>
  )
}
