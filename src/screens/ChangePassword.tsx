/* First sign-in with a password admin generated: pick your own, so the one
   that was sent over WhatsApp stops working. Staff who signed in with Google
   skip this — the server just scrambles the temporary password. */

import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { friendlyError, supabase } from '../lib/supabase'
import { adminUsers } from '../lib/data'
import { Loading, NavBar } from '../ui/parts'
import { haptic } from '../ui/haptic'

// The access token records how this session signed in ('password' or 'oauth').
const signedInWithGoogle = (token: string) => {
  try {
    const claims = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return (claims.amr ?? []).some((m: { method: string }) => m.method === 'oauth')
  } catch { return false }
}

export function ChangePassword() {
  const { session, profile, reloadProfile, signOut } = useAuth()
  const [viaGoogle, setViaGoogle] = useState(() => !!session && signedInWithGoogle(session.access_token))

  useEffect(() => {
    if (!viaGoogle) return
    adminUsers<{ done: boolean }>({ action: 'retire_temp_password' })
      .then(r => r.done ? reloadProfile() : setViaGoogle(false))
      .catch(() => setViaGoogle(false))   // fall back to choosing a password
  }, [viaGoogle, reloadProfile])

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
      const { error: e2 } = await supabase.from('profiles').update({ must_change_password: false }).eq('id', profile.id)
      if (e2) throw e2
      haptic(16)
      await reloadProfile()
    } catch (err) {
      haptic(24); setError(friendlyError(err)); setBusy(false)
    }
  }

  if (viaGoogle) return <Loading />

  return (
    <>
      <NavBar title="New password" right={<button className="iconbtn" onClick={signOut} style={{ fontSize: 12, width: 'auto', padding: '0 10px' }}>Sign out</button>} />
      <div className="body"><form className="pad" onSubmit={submit}>
        <p className="eyebrow">One last step</p>
        <h2 className="display display--sm">Choose your<br />own password</h2>
        <p className="sub">The password you were sent was temporary. Pick one only you know — the old one stops working straight away.</p>

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
          {busy ? 'Saving…' : 'Save and continue'}
        </button>
      </form></div>
    </>
  )
}
