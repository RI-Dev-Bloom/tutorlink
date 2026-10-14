/* Admin → Qualifications: the list students pick from (e.g. DISD). Students can add a missing
   one, so this is where names get fixed and old ones hidden. */

import { useState, type FormEvent } from 'react'
import { loadQualifications, type Qualification } from '../../lib/attendance'
import { invalidate, useQuery } from '../../lib/data'
import { friendlyError, supabase } from '../../lib/supabase'
import { Icon } from '../../ui/icons'
import { useOverlay } from '../../ui/Overlay'
import { BackButton, Badge, Loading, NavBar } from '../../ui/parts'
import { haptic } from '../../ui/haptic'

export function Qualifications() {
  const { openSheet } = useOverlay()
  const all = useQuery('qualifications', loadQualifications)
  return (
    <>
      <NavBar title="Qualifications" left={<BackButton />} />
      <div className="body"><div className="pad pad--fab">
        <p className="small muted">Students choose one when they sign up. It's recorded with every check-in.</p>
        {all.loading ? <Loading /> : null}
        {all.error ? <p className="err">{all.error}</p> : null}
        {all.data?.length ? (
          <div className="card" style={{ marginTop: 14 }}>
            {all.data.map(q => (
              <button className="row" key={q.code} onClick={() => openSheet(<QualSheet q={q} />)}>
                <span className="avatar avatar--code">{q.code.slice(0, 4)}</span>
                <span className="rmain"><span className="rname" style={q.hidden ? { color: 'var(--muted)' } : undefined}>{q.name}</span><span className="rmeta mono">{q.code}</span></span>
                <span className="rside">{q.hidden ? <Badge tone="plain">Hidden</Badge> : null}<Icon name="chev" size={17} stroke={2.1} /></span>
              </button>
            ))}
          </div>
        ) : null}
      </div></div>
      <button className="fab fab--low" onClick={() => openSheet(<QualSheet />)}>
        <Icon name="plus" size={18} stroke={2.2} /> Add qualification
      </button>
    </>
  )
}

function QualSheet({ q }: { q?: Qualification }) {
  const { closeSheet, toast } = useOverlay()
  const [code, setCode] = useState(q?.code ?? '')
  const [name, setName] = useState(q?.name ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const c = code.trim().toUpperCase()
  const valid = /^[A-Z][A-Z0-9]{1,9}$/.test(c) && name.trim().length >= 2

  const run = async (work: () => PromiseLike<{ error: unknown }>, done: string) => {
    setBusy(true); setError('')
    const { error: err } = await work()
    setBusy(false)
    if (err) { haptic(24); setError(friendlyError(err)); return }
    haptic(14); invalidate('qualifications'); closeSheet(); toast(done)
  }
  const save = (e: FormEvent) => {
    e.preventDefault()
    run(() => q
      ? supabase.from('qualifications').update({ code: c, name: name.trim() }).eq('code', q.code)
      : supabase.from('qualifications').insert({ code: c, name: name.trim() }), q ? 'Saved' : `${c} added`)
  }

  return (
    <form onSubmit={save}>
      <p className="sheet-sub">Qualifications</p>
      <h3 className="sheet-title">{q ? q.name : 'Add a qualification'}</h3>
      <div className="sheet-form">
        <div className="field">
          <label htmlFor="f-qc">Code</label>
          <input id="f-qc" className="mono" type="text" autoCapitalize="characters" placeholder="DISD" maxLength={10} value={code} onChange={e => setCode(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="f-qn">Full name</label>
          <input id="f-qn" type="text" maxLength={120} placeholder="Diploma in IT: Software Development" value={name} onChange={e => setName(e.target.value)} />
        </div>
        {error ? <p className="err">{error}</p> : null}
        <button className="btn" style={{ marginTop: 16 }} disabled={busy || !valid}>{busy ? 'Saving…' : q ? 'Save' : 'Add'}</button>
        {q ? (
          <>
            <button type="button" className="btn btn--outline" style={{ marginTop: 9 }} disabled={busy}
              onClick={() => run(() => supabase.from('qualifications').update({ hidden: !q.hidden }).eq('code', q.code), q.hidden ? 'Shown again' : 'Hidden')}>
              {q.hidden ? 'Show it again' : 'Hide it'}
            </button>
            <p className="small muted" style={{ marginTop: 8 }}>Hidden ones stay on existing students and check-ins, but new students can't pick them.</p>
          </>
        ) : null}
      </div>
    </form>
  )
}
