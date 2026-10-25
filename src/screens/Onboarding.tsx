/* Straight after a student makes their account: two optional steps, each can be skipped and
   done later from Home or Modules.
   1. Their qualification and year (this semester's modules for that year are added for them).
   2. This semester's modules: untick or add any.
   The student number comes from their Rosebank email; only an older account without one is
   asked for it (that part can't be skipped). */

import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { useTerm } from '../lib/catalogue'
import { invalidate, must } from '../lib/data'
import { friendlyError, supabase } from '../lib/supabase'
import { NavBar } from '../ui/parts'
import { StudyPicker, saveStudy, type Study } from '../ui/Qualification'
import { haptic } from '../ui/haptic'
import { PickModules } from './student/Modules'

const STUDENT_NO = /^ST\d{8}$/

// "Skip for now" is remembered on this device, so the steps don't come back every time.
const skipKey = (id: string) => `tl.setup.skipped.${id}`
export const setupSkipped = (id: string) => { try { return localStorage.getItem(skipKey(id)) === '1' } catch { return false } }
const markSkipped = (id: string) => { try { localStorage.setItem(skipKey(id), '1') } catch { /* private mode */ } }

export function Onboarding() {
  const { profile, reloadProfile, signOut } = useAuth()
  const term = useTerm()
  const known = profile?.student_number ?? null
  const [name, setName] = useState(profile?.full_name ?? '')
  const [number, setNumber] = useState(known ?? '')
  const [study, setStudy] = useState<Study>({ qualification: profile?.qualification_code ?? null, year: profile?.study_year ?? null })
  const [step, setStep] = useState<'study' | 'modules'>('study')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const clean = number.trim().toUpperCase()
  const numberOk = !!known || (name.trim().length > 1 && STUDENT_NO.test(clean))
  const chosen = !!study.qualification && !!study.year

  // Older accounts: save the name and number first (needed either way).
  const saveNumber = async () => {
    if (known) return
    await must(supabase.from('profiles').update({ full_name: name.trim(), student_number: clean }).eq('id', profile!.id))
  }

  const finish = async () => { markSkipped(profile!.id); invalidate('my-modules'); await reloadProfile() }

  const skip = async () => {
    if (!numberOk) return
    haptic(8); setBusy(true); setError('')
    try { await saveNumber(); await finish() } catch (e) { haptic(24); setError(friendlyError(e)); setBusy(false) }
  }

  const next = async (e: FormEvent) => {
    e.preventDefault()
    if (!profile || !numberOk || !chosen) return
    setBusy(true); setError('')
    try {
      await saveNumber()
      await saveStudy(study, term)
      invalidate(`my-modules:${profile.id}`, 'my-attendance')
      haptic(16); setStep('modules'); setBusy(false)
    } catch (err) { haptic(24); setError(friendlyError(err)); setBusy(false) }
  }

  if (step === 'modules') return <PickModules qualification={study.qualification!} year={study.year!} onDone={finish} />

  return (
    <>
      <NavBar title="Welcome" right={<button className="iconbtn" onClick={signOut} style={{ fontSize: 12, width: 'auto', padding: '0 10px' }}>Sign out</button>} />
      <div className="body"><form className="pad" onSubmit={next}>
        <p className="eyebrow">Step 1 of 2 · optional</p>
        <h2 className="display display--sm">What do<br />you study?</h2>
        <p className="sub">Pick your qualification and year, and we'll add this semester's modules for you. You can skip this and do it later.</p>

        <div style={{ marginTop: 20 }}>
          {!known ? (
            <>
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
            </>
          ) : null}
          <div className="field">
            <label>Your qualification</label>
            <StudyPicker value={study} onChange={setStudy} />
          </div>
          {error ? <p className="err">{error}</p> : null}
        </div>

        <button className="btn" style={{ marginTop: 18 }} disabled={busy || !numberOk || !chosen}>
          {busy ? 'Saving…' : 'Continue'}
        </button>
        <button type="button" className="btn btn--outline" style={{ marginTop: 9 }} disabled={busy || !numberOk} onClick={skip}>
          Skip for now
        </button>
        <p className="small muted" style={{ marginTop: 12 }}>Signed in as {profile?.email}</p>
      </form></div>
    </>
  )
}
