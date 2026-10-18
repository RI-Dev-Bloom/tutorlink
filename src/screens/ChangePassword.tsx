/* Choosing a password, for three reasons:
   - first: the password admin sent was temporary (lecturers, and anyone admin reset);
   - recovery: they came back from a "reset your password" email;
   - change: they asked to, from Settings. */

import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { friendlyError, supabase } from '../lib/supabase'
import { useStack } from '../nav/Stack'
import { useOverlay } from '../ui/Overlay'
import { BackButton, NavBar } from '../ui/parts'
import { haptic } from '../ui/haptic'

type Why = 'first' | 'recovery' | 'change'

const COPY: Record<Why, { eyebrow: string; title: [string, string]; sub: string }> = {
  first: { eyebrow: 'One last step', title: ['Choose your', 'own password'], sub: 'The password you were sent was temporary. Pick one only you know. The old one stops working straight away.' },
  recovery: { eyebrow: 'Forgot password', title: ['Choose a', 'new password'], sub: 'Pick a new password for your account. You’ll use it next time you sign in.' },
  change: { eyebrow: 'Settings', title: ['Change your', 'password'], sub: 'Pick a new password. Other phones you’re signed in on stay signed in.' },
}

export function ChangePassword({ why = 'first' }: { why?: Why }) {
  const { profile, reloadProfile, signOut, doneRecovering } = useAuth()
  const { back } = useStack()
  const { toast } = useOverlay()
  const [pass, setPass] = useState('')
  const [pass2, setPass2] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const problem =
    pass.length > 0 && pass.length < 8 ? 'At least 8 characters'
    : pass2 && pass !== pass2 ? 'The two passwords don’t match'
    : ''

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!profile || problem || !pass || pass !== pass2) return
    setBusy(true); setError('')
    try {
      const { error: e1 } = await supabase.auth.updateUser({ password: pass })
      if (e1) throw e1
      if (profile.must_change_password) {
        const { error: e2 } = await supabase.from('profiles').update({ must_change_password: false }).eq('id', profile.id)
        if (e2) throw e2
      }
      haptic(16)
      if (why === 'change') { setBusy(false); back(); toast('Password changed') }
      else { doneRecovering(); await reloadProfile() }
    } catch (err) {
      haptic(24); setError(friendlyError(err)); setBusy(false)
    }
  }

  const c = COPY[why]
  return (
    <>
      <NavBar title="New password"
        left={why === 'change' ? <BackButton /> : undefined}
        right={why !== 'change' ? <button className="iconbtn" onClick={signOut} style={{ fontSize: 12, width: 'auto', padding: '0 10px' }}>Sign out</button> : undefined} />
      <div className="body"><form className="pad" onSubmit={submit}>
        <p className="eyebrow">{c.eyebrow}</p>
        <h2 className="display display--sm">{c.title[0]}<br />{c.title[1]}</h2>
        <p className="sub">{c.sub}</p>

        <div style={{ marginTop: 24 }}>
          <input type="email" autoComplete="username" value={profile?.email ?? ''} readOnly hidden />
          <div className="field">
            <label htmlFor="f-p1">New password</label>
            <input id="f-p1" type="password" autoComplete="new-password" value={pass} onChange={e => setPass(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="f-p2">Type it again</label>
            <input id="f-p2" type="password" autoComplete="new-password" value={pass2} onChange={e => setPass2(e.target.value)} required />
          </div>
          {problem ? <p className="err">{problem}</p> : null}
          {error ? <p className="err">{error}</p> : null}
        </div>

        <button className="btn" style={{ marginTop: 18 }} disabled={busy || !pass || pass !== pass2 || !!problem}>
          {busy ? 'Saving…' : why === 'change' ? 'Save' : 'Save and continue'}
        </button>
      </form></div>
    </>
  )
}
