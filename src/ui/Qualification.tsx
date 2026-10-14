/* Picking your qualification (e.g. DISD: Diploma in IT: Software Development).
   It's recorded with every check-in. Missing from the list? Add it; admin can tidy the list later. */

import { useMemo, useState } from 'react'
import { useAuth } from '../lib/auth'
import { loadQualifications, type Qualification } from '../lib/attendance'
import { invalidate, must, useQuery } from '../lib/data'
import { friendlyError, supabase } from '../lib/supabase'
import { Icon } from './icons'
import { useOverlay } from './Overlay'
import { Loading } from './parts'
import { haptic } from './haptic'

/* The list on its own: used inside onboarding and inside the sheet below. */
export function QualificationList({ value, onPick }: { value: string | null; onPick: (q: Qualification) => void }) {
  const all = useQuery('qualifications', loadQualifications)
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (all.data ?? []).filter(x => !x.hidden && (!s || x.code.toLowerCase().includes(s) || x.name.toLowerCase().includes(s)))
  }, [all.data, q])

  if (adding) return <AddQualification initial={q} onAdded={onPick} onCancel={() => setAdding(false)} />

  return (
    <>
      {(all.data?.length ?? 0) > 6 ? (
        <div className="field" style={{ marginTop: 0 }}>
          <input type="search" placeholder="Search by code or name" value={q} onChange={e => setQ(e.target.value)} aria-label="Search qualifications" />
        </div>
      ) : null}
      <div className="card" style={{ marginTop: 10, maxHeight: '38vh', overflowY: 'auto' }}>
        {all.loading ? <Loading /> : null}
        {shown.map(x => (
          <button type="button" key={x.code} className={'pick' + (value === x.code ? ' on' : '')} aria-pressed={value === x.code} onClick={() => { haptic(8); onPick(x) }}>
            <span className="pick__box pick__box--round">{value === x.code ? <Icon name="check" size={14} stroke={2.6} /> : null}</span>
            <span className="rmain"><span className="rname">{x.name}</span><span className="rmeta mono">{x.code}</span></span>
          </button>
        ))}
        {all.data && !shown.length ? <p className="small muted" style={{ padding: 14 }}>Nothing matches “{q}”.</p> : null}
      </div>
      <button type="button" className="btn btn--ghost" style={{ marginTop: 6 }} onClick={() => setAdding(true)}>Not listed? Add yours</button>
    </>
  )
}

function AddQualification({ initial, onAdded, onCancel }: { initial: string; onAdded: (q: Qualification) => void; onCancel: () => void }) {
  const [code, setCode] = useState(/^[a-z0-9]{2,10}$/i.test(initial.trim()) ? initial.trim().toUpperCase() : '')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const c = code.trim().toUpperCase()
  const valid = /^[A-Z][A-Z0-9]{1,9}$/.test(c) && name.trim().length >= 2

  // Not a <form>: this sits inside the onboarding form, and forms can't nest.
  const add = async () => {
    setBusy(true); setError('')
    try {
      const got = await must(supabase.rpc('add_qualification', { p_code: c, p_name: name.trim() })) as string
      invalidate('qualifications'); onAdded({ code: got, name: name.trim(), hidden: false })
    } catch (err) { haptic(24); setError(friendlyError(err)); setBusy(false) }
  }

  return (
    <div>
      <div className="field">
        <label htmlFor="f-qc">Code</label>
        <input id="f-qc" className="mono" type="text" autoCapitalize="characters" placeholder="DISD" maxLength={10} value={code} onChange={e => setCode(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="f-qn">Full name</label>
        <input id="f-qn" type="text" placeholder="Diploma in IT: Software Development" maxLength={120} value={name} onChange={e => setName(e.target.value)} />
      </div>
      {error ? <p className="err">{error}</p> : null}
      <div className="btnrow" style={{ marginTop: 14 }}>
        <button type="button" className="btn btn--outline" onClick={onCancel}>Back</button>
        <button type="button" className="btn" disabled={busy || !valid} onClick={add}>{busy ? 'Adding…' : 'Add'}</button>
      </div>
    </div>
  )
}

/* As a sheet: saves straight to your profile, then carries on (e.g. finishes the check-in). */
export function QualificationSheet({ onDone }: { onDone?: () => void }) {
  const { profile, reloadProfile } = useAuth()
  const { closeSheet, toast } = useOverlay()
  const [busy, setBusy] = useState(false)
  const pick = async (q: Qualification) => {
    if (!profile || busy) return
    setBusy(true)
    const { error } = await supabase.from('profiles').update({ qualification_code: q.code }).eq('id', profile.id)
    if (error) { toast(friendlyError(error)); setBusy(false); return }
    haptic(14); await reloadProfile(); closeSheet(); onDone?.()
  }
  return (
    <div>
      <p className="sheet-sub">Recorded with every check-in</p>
      <h3 className="sheet-title">Your qualification</h3>
      <div className="sheet-form"><QualificationList value={profile?.qualification_code ?? null} onPick={pick} /></div>
    </div>
  )
}
