/* Admin → Settings: the numbers that drive the programme, semesters and their quota,
   and the way into Lecturers, Modules and Response templates. */

import { useState, type FormEvent } from 'react'
import { useAuth } from '../../lib/auth'
import { invalidate, must, useQuery } from '../../lib/data'
import { friendlyError, supabase } from '../../lib/supabase'
import { fDate, rand, todayISO, type Semester, type Settings } from '../../lib/types'
import { useStack } from '../../nav/Stack'
import { Icon } from '../../ui/icons'
import { useOverlay } from '../../ui/Overlay'
import { Badge, initials } from '../../ui/parts'
import { haptic } from '../../ui/haptic'
import { Modules } from './Modules'
import { Lecturers } from './Lecturers'
import { Templates } from './Templates'

export function AdminSettings() {
  const { profile, signOut } = useAuth()
  const { push } = useStack()
  const { openSheet } = useOverlay()
  const settings = useQuery('settings', () => must(supabase.from('settings').select('rate_per_session, min_mark').single<Settings>()))
  const semesters = useQuery('semesters', () => must(supabase.from('semesters').select('*').order('starts_on', { ascending: false }).returns<Semester[]>()))

  const today = todayISO()
  const s = settings.data

  return (
    <div className="pad stagger">
      <div className="card card--pad" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span className="avatar avatar--lg">{initials(profile?.full_name || 'Admin')}</span>
        <span style={{ minWidth: 0 }}>
          <span className="rname" style={{ fontSize: 16 }}>{profile?.full_name || 'Admin'}</span>
          <span className="rmeta">Administrator · {profile?.email}</span>
        </span>
      </div>

      <div className="sect" style={{ marginTop: 26 }}>Programme</div>
      <div className="card">
        <button className="row" onClick={() => s && openSheet(<NumberSheet field="rate_per_session" label="Rate per session" prefix="R" value={s.rate_per_session}
          lead="What a tutor earns for each confirmed session. Sessions already confirmed keep the rate they were confirmed at." />)}>
          <span className="rmain"><span className="rname">Rate per session</span><span className="rmeta">Paid for each confirmed session</span></span>
          <span className="rside"><span className="serif" style={{ fontSize: 20, fontWeight: 700, color: 'var(--goldD)' }}>{s ? rand(s.rate_per_session) : '…'}</span><Icon name="chev" size={17} stroke={2.1} /></span>
        </button>
        <button className="row" onClick={() => s && openSheet(<NumberSheet field="min_mark" label="Minimum mark" suffix="%" value={s.min_mark}
          lead="Applicants need at least this mark in every module they apply to tutor." />)}>
          <span className="rmain"><span className="rname">Minimum mark</span><span className="rmeta">To be eligible to tutor a module</span></span>
          <span className="rside"><span className="mono" style={{ color: 'var(--text)' }}>{s ? `${s.min_mark}%` : '…'}</span><Icon name="chev" size={17} stroke={2.1} /></span>
        </button>
      </div>

      <div className="sect">
        <span>Semesters</span>
        <button className="link" onClick={() => openSheet(<SemesterSheet />)}>+ Add</button>
      </div>
      {semesters.data && semesters.data.length === 0 ? (
        <div className="note note--amber"><Icon name="alert" size={15} />
          <span>No semesters yet. Add the current one — sessions can't be scheduled or logged until a semester covers their date.</span></div>
      ) : null}
      {semesters.data?.length ? (
        <div className="card">
          {semesters.data.map(sem => {
            const current = sem.starts_on <= today && today <= sem.ends_on
            return (
              <button className="row" key={sem.id} onClick={() => openSheet(<SemesterSheet semester={sem} />)}>
                <span className="avatar avatar--code">{sem.session_quota}</span>
                <span className="rmain">
                  <span className="rname">{sem.name} {current ? <Badge tone="green">Current</Badge> : null}</span>
                  <span className="rmeta">{fDate(sem.starts_on)} – {fDate(sem.ends_on)} · {sem.session_quota} sessions per tutor</span>
                </span>
                <span className="rside"><Icon name="chev" size={17} stroke={2.1} /></span>
              </button>
            )
          })}
        </div>
      ) : null}

      <div className="sect">People and modules</div>
      <div className="card">
        <button className="row" onClick={() => push(<Lecturers />)}>
          <span className="avatar avatar--gold"><Icon name="board" size={18} /></span>
          <span className="rmain"><span className="rname">Lecturers</span><span className="rmeta">Add lecturers, set their modules, reset passwords</span></span>
          <span className="rside"><Icon name="chev" size={17} stroke={2.1} /></span>
        </button>
        <button className="row" onClick={() => push(<Modules />)}>
          <span className="avatar avatar--code"><Icon name="book" size={18} /></span>
          <span className="rmain"><span className="rname">Modules</span><span className="rmeta">Add, rename, hide or merge modules</span></span>
          <span className="rside"><Icon name="chev" size={17} stroke={2.1} /></span>
        </button>
        <button className="row" onClick={() => push(<Templates />)}>
          <span className="avatar"><Icon name="doc" size={18} /></span>
          <span className="rmain"><span className="rname">Response templates</span><span className="rmeta">Ready-made replies for approving or declining</span></span>
          <span className="rside"><Icon name="chev" size={17} stroke={2.1} /></span>
        </button>
      </div>

      {settings.error || semesters.error ? <p className="err">{settings.error || semesters.error}</p> : null}

      <button className="btn btn--outline" style={{ marginTop: 26 }} onClick={() => { haptic(10); signOut() }}>
        <Icon name="out" size={18} /> Sign out
      </button>
    </div>
  )
}

/* ---------- edit one number ------------------------------- */

function NumberSheet({ field, label, value, lead, prefix, suffix }: {
  field: 'rate_per_session' | 'min_mark'; label: string; value: number; lead: string; prefix?: string; suffix?: string
}) {
  const { closeSheet, toast } = useOverlay()
  const [v, setV] = useState(String(value))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const n = Number(v)
  const valid = v.trim() !== '' && Number.isFinite(n) && n >= 0 && (field !== 'min_mark' || n <= 100)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setBusy(true)
    const { error: err } = await supabase.from('settings').update({ [field]: n, updated_at: new Date().toISOString() }).eq('id', true)
    setBusy(false)
    if (err) { haptic(24); setError(friendlyError(err)); return }
    haptic(14); invalidate('settings'); closeSheet(); toast(`${label} saved`)
  }

  return (
    <form onSubmit={save}>
      <p className="sheet-sub">Settings</p>
      <h3 className="sheet-title">{label}</h3>
      <p className="sheet-lead">{lead}</p>
      <div className="sheet-form">
        <div className="field">
          <label htmlFor="f-num">{label}{prefix ? ` (${prefix})` : ''}{suffix ? ` (${suffix})` : ''}</label>
          <input id="f-num" type="number" inputMode="decimal" min={0} max={field === 'min_mark' ? 100 : undefined} step="any"
            value={v} onChange={e => setV(e.target.value)} />
        </div>
        {error ? <p className="err">{error}</p> : null}
        <button className="btn" style={{ marginTop: 16 }} disabled={busy || !valid}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  )
}

/* ---------- add / edit a semester ------------------------- */

function SemesterSheet({ semester }: { semester?: Semester }) {
  const { closeSheet, toast } = useOverlay()
  const [name, setName] = useState(semester?.name ?? '')
  const [start, setStart] = useState(semester?.starts_on ?? '')
  const [end, setEnd] = useState(semester?.ends_on ?? '')
  const [quota, setQuota] = useState(String(semester?.session_quota ?? 24))
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const q = Number(quota)
  const valid = name.trim() && start && end && end > start && Number.isInteger(q) && q > 0
  const quotaChanged = !!semester && q !== semester.session_quota

  const save = async (e?: FormEvent) => {
    e?.preventDefault()
    if (!valid) return
    // Changing the quota affects every tutor this semester — make admin say so.
    if (quotaChanged && !confirming) { haptic(16); setConfirming(true); return }
    setBusy(true); setError('')
    const row = { name: name.trim(), starts_on: start, ends_on: end, session_quota: q }
    const { error: err } = semester
      ? await supabase.from('semesters').update(row).eq('id', semester.id)
      : await supabase.from('semesters').insert(row)
    setBusy(false)
    if (err) { haptic(24); setError(friendlyError(err)); setConfirming(false); return }
    haptic(14); invalidate('semesters'); closeSheet(); toast(semester ? 'Semester saved' : 'Semester added')
  }

  return (
    <form onSubmit={save}>
      <p className="sheet-sub">Settings · Semesters</p>
      <h3 className="sheet-title">{semester ? 'Edit semester' : 'Add a semester'}</h3>
      <p className="sheet-lead">Every session belongs to the semester its date falls in. Semesters can't overlap.</p>
      <div className="sheet-form">
        <div className="field">
          <label htmlFor="f-sn">Name</label>
          <input id="f-sn" type="text" placeholder="Semester 2, 2026" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="btnrow" style={{ marginTop: 14 }}>
          <div className="field" style={{ flex: 1, marginTop: 0 }}>
            <label htmlFor="f-ss">Starts</label>
            <input id="f-ss" type="date" value={start} onChange={e => setStart(e.target.value)} />
          </div>
          <div className="field" style={{ flex: 1, marginTop: 0 }}>
            <label htmlFor="f-se">Ends</label>
            <input id="f-se" type="date" value={end} onChange={e => setEnd(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="f-sq">Sessions per tutor</label>
          <input id="f-sq" type="number" inputMode="numeric" min={1} value={quota} onChange={e => { setQuota(e.target.value); setConfirming(false) }} />
        </div>
        {start && end && end <= start ? <p className="err">The end date must be after the start date</p> : null}

        {confirming ? (
          <div className="note note--amber" style={{ marginTop: 16 }}><Icon name="alert" size={15} />
            <span>This changes the limit for <b>every tutor</b> this semester, from {semester!.session_quota} to {q} sessions.
              Tutors with their own limit keep it. Nothing already scheduled is removed.</span>
          </div>
        ) : null}
        {error ? <p className="err">{error}</p> : null}

        <button className="btn" style={{ marginTop: 16 }} disabled={busy || !valid}>
          {busy ? 'Saving…' : confirming ? 'Yes, change it for all tutors' : semester ? 'Save' : 'Add semester'}
        </button>
        {confirming ? <button type="button" className="btn btn--ghost" onClick={() => setConfirming(false)}>Cancel</button> : null}
      </div>
    </form>
  )
}
