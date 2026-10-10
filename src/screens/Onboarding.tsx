/* First sign-in for a student: confirm their name and add their student number (once). */

import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { friendlyError, supabase } from '../lib/supabase'
import { NavBar } from '../ui/parts'
import { haptic } from '../ui/haptic'

const STUDENT_NO = /^ST\d{8}$/

export function Onboarding() {
  const { profile, reloadProfile, signOut } = useAuth()
  const [name, setName] = useState(profile?.full_name ?? '')
  const [number, setNumber] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const clean = number.trim().toUpperCase()
  const valid = name.trim().length > 1 && STUDENT_NO.test(clean)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!profile || !valid) return
    setBusy(true); setError('')
    const { error: err } = await supabase.from('profiles')
      .update({ full_name: name.trim(), student_number: clean })
      .eq('id', profile.id)
    if (err) { haptic(24); setError(friendlyError(err)); setBusy(false); return }
    haptic(16)
    await reloadProfile()
  }

  return (
    <>
      <NavBar title="Welcome" right={<button className="iconbtn" onClick={signOut} style={{ fontSize: 12, width: 'auto', padding: '0 10px' }}>Sign out</button>} />
      <div className="body"><form className="pad" onSubmit={submit}>
        <p className="eyebrow">One-time setup</p>
        <h2 className="display display--sm">Tell us<br />who you are</h2>
        <p className="sub">Your student number is how the programme office finds you. You can only set it once, so check it.</p>

        <div style={{ marginTop: 24 }}>
          <div className="field">
            <label htmlFor="f-name">Full name</label>
            <input id="f-name" type="text" autoComplete="name" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="f-num">Student number</label>
            <input id="f-num" type="text" autoCapitalize="characters" autoComplete="off" placeholder="ST12345678"
              className="mono" maxLength={10} value={number} onChange={e => setNumber(e.target.value)} required />
          </div>
          {number && !STUDENT_NO.test(clean) ? <p className="err">ST followed by 8 digits, e.g. ST12345678</p> : null}
          {error ? <p className="err">{error}</p> : null}
        </div>

        <button className="btn" style={{ marginTop: 18 }} disabled={busy || !valid}>
          {busy ? 'Saving…' : 'Continue'}
        </button>
        <p className="small muted" style={{ marginTop: 12 }}>Signed in as {profile?.email}</p>
      </form></div>
    </>
  )
}
