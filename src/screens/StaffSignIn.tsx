import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { friendlyError } from '../lib/supabase'
import { Icon } from '../ui/icons'
import { BackButton, NavBar } from '../ui/parts'
import { haptic } from '../ui/haptic'

export function StaffSignIn({ role }: { role: 'lecturer' | 'admin' }) {
  const { signInWithPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      await signInWithPassword(email, password)
      haptic(14)   // the app swaps to the right portal by itself
    } catch (err) {
      haptic(24); setError(friendlyError(err)); setBusy(false)
    }
  }

  return (
    <>
      <NavBar title={role === 'admin' ? 'Admin' : 'Lecturer'} left={<BackButton />} />
      <div className="body"><form className="pad" onSubmit={submit}>
        <h2 className="display display--sm">Welcome<br />back</h2>
        <p className="sub">Sign in with the account the programme office set up for you.</p>

        <div style={{ marginTop: 24 }}>
          <div className="field">
            <label htmlFor="f-mail">Email</label>
            <input id="f-mail" type="email" inputMode="email" autoCapitalize="off" autoComplete="email"
              value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="f-pass">Password</label>
            <input id="f-pass" type="password" autoComplete="current-password"
              value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error ? <p className="err">{error}</p> : null}
        </div>

        <button className="btn" style={{ marginTop: 18 }} disabled={busy || !email || !password}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <div className="note note--plain" style={{ marginTop: 16 }}>
          <Icon name="alert" size={15} />
          <span>{role === 'admin'
            ? 'Admin accounts are issued by the programme office.'
            : 'Lecturer accounts are created by admin, who also sets your modules. Forgot your password? Ask admin.'}</span>
        </div>
      </form></div>
    </>
  )
}
