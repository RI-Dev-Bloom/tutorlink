/* Admin → Settings, laid out like a phone's Settings app: the programme's numbers,
   tutor applications, message files, semesters, people and modules, then this device. */

import { useState, type FormEvent } from 'react'
import { useAuth } from '../../lib/auth'
import { invalidate, must, useQuery } from '../../lib/data'
import { loadSettings } from '../../lib/student'
import { friendlyError, supabase } from '../../lib/supabase'
import { fDate, rand, todayISO, type Semester } from '../../lib/types'
import { useStack } from '../../nav/Stack'
import { Icon } from '../../ui/icons'
import { useOverlay } from '../../ui/Overlay'
import { Badge } from '../../ui/parts'
import { haptic } from '../../ui/haptic'
import { Group, SHead, SRow, Switch } from '../../ui/Settings'
import { DeviceSettings } from '../../ui/Setup'
import { AdvertiseModules, Modules, loadModules } from './Modules'
import { Lecturers } from './Lecturers'
import { Templates } from './Templates'
import { Qualifications } from './Qualifications'
import { ResetPasswordSheet } from './ResetPassword'
import { ChangePassword } from '../ChangePassword'

export function AdminSettings() {
  const { profile, signOut } = useAuth()
  const { push } = useStack()
  const { openSheet, toast } = useOverlay()
  const settings = useQuery('settings', loadSettings)
  const semesters = useQuery('semesters', () => must(supabase.from('semesters').select('*').order('starts_on', { ascending: false }).returns<Semester[]>()))
  const modules = useQuery('modules', loadModules)
  const [saving, setSaving] = useState(false)

  const today = todayISO()
  const s = settings.data
  const highRisk = modules.data?.filter(m => m.high_risk && !m.hidden).length

  const setAuto = async (on: boolean) => {
    setSaving(true)
    const { error } = await supabase.from('settings').update({ auto_decline: on, updated_at: new Date().toISOString() }).eq('id', true)
    setSaving(false)
    if (error) { haptic(24); toast(friendlyError(error)); return }
    invalidate('settings'); toast(on ? 'Auto-decline is on' : 'Auto-decline is off')
  }

  return (
    <div className="pad stagger">
      <SHead name={profile?.full_name || 'Admin'} line={`Administrator · ${profile?.email ?? ''}`} />

      <Group title="Programme">
        <SRow icon="wallet" tone="gold" label="Rate per hour" value={s ? rand(s.rate_per_session) : '…'}
          onClick={() => s && openSheet(<NumberSheet field="rate_per_session" label="Rate per hour" prefix="R" value={s.rate_per_session}
            lead="What a tutor earns per hour of a confirmed session (a 1½-hour session pays 1.5 times this). Sessions already confirmed keep the rate they were confirmed at." />)} />
        <SRow icon="check" tone="green" label="Minimum mark" value={s ? `${s.min_mark}%` : '…'}
          onClick={() => s && openSheet(<NumberSheet field="min_mark" label="Minimum mark" suffix="%" value={s.min_mark}
            lead="The mark a student needs in a module to tutor it. Approving only adds the modules where they reach it." />)} />
        <SRow icon="people" tone="blue" label="Minimum attendance" value={s ? `${s.min_attendance} student${s.min_attendance === 1 ? '' : 's'}` : '…'}
          onClick={() => s && openSheet(<MinAttendanceSheet value={s.min_attendance} />)} />
      </Group>

      <Group title="Tutor applications"
        foot={s?.auto_decline
          ? `Applications where no module reaches ${s.min_mark}% are declined automatically a day after they’re sent, with a note saying why.`
          : `Switch on to decline applications automatically when no module reaches ${s?.min_mark ?? 75}%.`}>
        <SRow icon="megaphone" tone="red" label="Advertised modules" sub="The only modules students can apply to tutor"
          value={highRisk ?? '…'} onClick={() => push(<AdvertiseModules />)} />
        <SRow icon="doc" tone="blue" label="Response templates" onClick={() => push(<Templates />)} />
        <SRow icon="shield" tone="slate" label="Auto-decline below the minimum"
          right={<Switch on={!!s?.auto_decline} disabled={!s || saving} onChange={setAuto} label="Auto-decline below the minimum" />} />
      </Group>

      <Group title="Messages" foot="Files sent in messages are removed after this many days, so storage stays free.">
        <SRow icon="attach" tone="amber" label="Keep files for" value={s ? `${s.file_days} days` : '…'}
          onClick={() => s && openSheet(<FileDaysSheet value={s.file_days} />)} />
      </Group>

      <Group title="Semesters" foot={semesters.data?.length === 0
        ? 'No semesters yet. Add the current one: sessions can’t be scheduled or logged until a semester covers their date.'
        : 'Every session belongs to the semester its date falls in.'}>
        {(semesters.data ?? []).map(sem => {
          const current = sem.starts_on <= today && today <= sem.ends_on
          return (
            <SRow key={sem.id} icon="cal" tone={current ? 'green' : 'slate'}
              label={<>{sem.name} {current ? <Badge tone="green">Current</Badge> : null}</>}
              sub={`${fDate(sem.starts_on)} – ${fDate(sem.ends_on)} · ${sem.session_quota} sessions per tutor`}
              onClick={() => openSheet(<SemesterSheet semester={sem} />)} />
          )
        })}
        <SRow icon="plus" tone="gold" label="Add a semester" onClick={() => openSheet(<SemesterSheet />)} />
      </Group>

      <Group title="People and modules">
        <SRow icon="board" tone="gold" label="Lecturers" sub="Let lecturers in, set their modules" onClick={() => push(<Lecturers />)} />
        <SRow icon="book" tone="navy" label="Modules" sub="The official list, by faculty" onClick={() => push(<Modules />)} />
        <SRow icon="cap" tone="slate" label="Qualifications" sub="By faculty, e.g. DISD0601" onClick={() => push(<Qualifications />)} />
        <SRow icon="shield" tone="red" label="Reset a password" sub="For anyone who can't get in" onClick={() => openSheet(<ResetPasswordSheet />)} />
      </Group>

      <DeviceSettings />

      {settings.error || semesters.error ? <p className="err">{settings.error || semesters.error}</p> : null}

      <Group>
        <SRow label="Change my password" onClick={() => push(<ChangePassword why="change" />)} />
        <SRow label="Sign out" danger onClick={signOut} />
      </Group>
      <p className="app-foot">TutorLink · Rosebank International</p>
    </div>
  )
}

/* ---------- how many must check in for a session to count -- */

function MinAttendanceSheet({ value }: { value: number }) {
  const { closeSheet, toast } = useOverlay()
  const [n, setN] = useState(value)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const save = async () => {
    setBusy(true)
    const { error: err } = await supabase.from('settings').update({ min_attendance: n, updated_at: new Date().toISOString() }).eq('id', true)
    setBusy(false)
    if (err) { haptic(24); setError(friendlyError(err)); return }
    haptic(14); invalidate('settings'); closeSheet(); toast(`Sessions need ${n} student${n === 1 ? '' : 's'} to count`)
  }
  return (
    <div>
      <p className="sheet-sub">Settings · Programme</p>
      <h3 className="sheet-title">Minimum attendance</h3>
      <p className="sheet-lead">How many students must check in for a session to count. You can only confirm a session that reaches it. 0 turns the check off.</p>
      <div className="seg" style={{ marginTop: 18 }}>
        {[0, 1, 2, 3, 4, 5].map(x => <button key={x} className={n === x ? 'on' : ''} onClick={() => { haptic(6); setN(x) }}>{x}</button>)}
      </div>
      {error ? <p className="err">{error}</p> : null}
      <button className="btn" style={{ marginTop: 18 }} disabled={busy || n === value} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
    </div>
  )
}

/* ---------- how long message files are kept --------------- */

function FileDaysSheet({ value }: { value: number }) {
  const { closeSheet, toast } = useOverlay()
  const [days, setDays] = useState(value)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    setBusy(true)
    const { error: err } = await supabase.from('settings').update({ file_days: days, updated_at: new Date().toISOString() }).eq('id', true)
    setBusy(false)
    if (err) { haptic(24); setError(friendlyError(err)); return }
    haptic(14); invalidate('settings'); closeSheet(); toast(`Files are kept for ${days} days`)
  }

  return (
    <div>
      <p className="sheet-sub">Settings · Messages</p>
      <h3 className="sheet-title">Keep message files for</h3>
      <p className="sheet-lead">Files people send in messages are removed after this, so the free storage never fills up. The message itself stays. A change applies to files already sent too.</p>
      <div className="seg" style={{ marginTop: 18 }}>
        {[3, 4, 5].map(d => <button key={d} className={days === d ? 'on' : ''} onClick={() => { haptic(6); setDays(d) }}>{d} days</button>)}
      </div>
      {error ? <p className="err">{error}</p> : null}
      <button className="btn" style={{ marginTop: 18 }} disabled={busy || days === value} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
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
