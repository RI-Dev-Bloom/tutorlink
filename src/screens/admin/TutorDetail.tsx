/* Admin → one tutor: quota, sessions to confirm, pay, weekly slots, upcoming weeks,
   one-off sessions and registers. Everything admin does for a tutor, on one page. */

import { useMemo, useState, type FormEvent } from 'react'
import { invalidate, must, useQuery } from '../../lib/data'
import { friendlyError, supabase } from '../../lib/supabase'
import {
  SESSION_COLS, WEEKDAYS, counts, currentSemester, fDay, hhmm, loadSemesters, needsConfirming, owed,
  type Session, type Slot, type TutorRow,
} from '../../lib/tutors'
import { fDate, rand, todayISO, type Semester } from '../../lib/types'
import { useStack } from '../../nav/Stack'
import { Icon } from '../../ui/icons'
import { useOverlay } from '../../ui/Overlay'
import { BackButton, Badge, Loading, NavBar, initials } from '../../ui/parts'
import { haptic } from '../../ui/haptic'
import { SlotForm } from './SlotForm'

type Register = { id: string; module_code: string; storage_path: string; file_name: string; uploaded_at: string }

type TutorData = {
  tutor: TutorRow
  sessions: Session[]
  slots: Slot[]
  override: number | null
  registers: Register[]
}

async function loadTutor(id: string, semId: string | null): Promise<TutorData> {
  const [tutor, sessions, slots, override, registers] = await Promise.all([
    must(supabase.from('profiles').select('id, full_name, student_number, email, tutor_modules(module_code, approved_at, modules(name))').eq('id', id).single<TutorRow>()),
    must(supabase.from('sessions').select(SESSION_COLS).eq('tutor_id', id).order('session_date').returns<Session[]>()),
    must(supabase.from('schedule_slots').select('id, module_code, weekday, starts_at, ends_at, venue, starts_on, until').eq('tutor_id', id).order('weekday').returns<Slot[]>()),
    semId ? must(supabase.from('tutor_quota_overrides').select('session_quota').eq('tutor_id', id).eq('semester_id', semId).maybeSingle<{ session_quota: number }>()) : null,
    must(supabase.from('registers').select('id, module_code, storage_path, file_name, uploaded_at').eq('tutor_id', id).order('uploaded_at', { ascending: false }).limit(20).returns<Register[]>()),
  ])
  if (!tutor) throw new Error('Tutor not found')
  return { tutor, sessions: sessions ?? [], slots: slots ?? [], override: override?.session_quota ?? null, registers: registers ?? [] }
}

// Anything that changes a tutor's sessions refreshes every screen that shows them.
const refresh = () => invalidate('tutor', 'tutors', 'sessions', 'overrides')

const when = (s: Session) => [fDay(s.session_date), s.starts_at ? `${hhmm(s.starts_at)}–${hhmm(s.ends_at)}` : ''].filter(Boolean).join(' · ')

export function TutorDetail({ id }: { id: string }) {
  const { push } = useStack()
  const { openSheet, toast } = useOverlay()
  const semesters = useQuery('semesters', loadSemesters)
  const sem = semesters.data ? currentSemester(semesters.data) : null
  const semId = sem?.id ?? null
  const data = useQuery(`tutor:${id}:${semId}`, () => loadTutor(id, semId))
  const [busy, setBusy] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  const d = data.data
  const today = todayISO()
  const view = useMemo(() => {
    const all = d?.sessions ?? []
    return {
      used: all.filter(s => counts(s, semId)).length,
      toConfirm: all.filter(needsConfirming),
      confirmed: all.filter(s => s.status === 'confirmed'),
      upcoming: all.filter(s => s.session_date >= today && (s.status === 'scheduled' || s.status === 'cancelled')),
      history: all.filter(s => s.status === 'confirmed' || s.status === 'paid').reverse(),
      paidThisSem: all.filter(s => s.status === 'paid' && s.semester_id === semId).reduce((n, s) => n + Number(s.rate ?? 0), 0),
    }
  }, [d, semId, today])

  if (!d) return (<><NavBar title="Tutor" left={<BackButton />} />{data.error ? <p className="err pad">{data.error}</p> : <Loading />}</>)

  const t = d.tutor
  const first = t.full_name.split(' ')[0]
  const limit = d.override ?? sem?.session_quota ?? 0
  const left = Math.max(0, limit - view.used)
  const activeSlots = d.slots.filter(s => s.until >= today)

  const setStatus = async (s: Session, status: Session['status'], done: string) => {
    setBusy(s.id)
    const { error } = await supabase.from('sessions').update({ status }).eq('id', s.id)
    setBusy(null)
    if (error) { haptic(24); toast(friendlyError(error)); return }
    haptic(12); refresh(); toast(done)
  }

  return (
    <>
      <NavBar title={t.full_name} left={<BackButton />} />
      <div className="body"><div className="pad stagger">
        <div className="card card--pad">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="avatar avatar--lg">{initials(t.full_name)}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="rname" style={{ fontSize: 16 }}>{t.full_name}</span>
              <span className="rmeta mono">{t.student_number}</span>
              <span className="rmeta" style={{ overflowWrap: 'anywhere' }}>{t.email}</span>
            </span>
          </div>
          <div className="chips" style={{ marginTop: 14 }}>
            {t.tutor_modules.map(m => <span key={m.module_code} className="chip chip--static chip--sm"><span className="code">{m.module_code}</span>{m.modules?.name}</span>)}
          </div>
        </div>

        {/* ---- quota ---- */}
        {sem ? (
          <button className="card card--pad" style={{ display: 'block', width: '100%', textAlign: 'left', marginTop: 12 }}
            onClick={() => openSheet(<QuotaSheet tutorId={id} first={first} sem={sem} override={d.override} used={view.used} />)}>
            <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
              <span className="rname">{view.used} of {limit} sessions used</span>
              <span className="small" style={{ color: 'var(--goldD)', fontWeight: 600 }}>Change</span>
            </span>
            <span className="quota"><span style={{ width: `${limit ? Math.min(100, (view.used / limit) * 100) : 0}%` }} data-full={view.used >= limit || undefined} /></span>
            <span className="rmeta">{sem.name} · {d.override !== null ? `custom limit for ${first} (semester default ${sem.session_quota})` : 'semester default'}</span>
          </button>
        ) : (
          <div className="note note--amber" style={{ marginTop: 12 }}><Icon name="alert" size={15} />
            <span>No semester yet. Add one in Settings before scheduling sessions.</span></div>
        )}

        <div className="metrics" style={{ marginTop: 12 }}>
          <div className="metric metric--amber"><div className="n">{view.toConfirm.length}</div><div className="l">To confirm</div></div>
          <div className="metric metric--gold"><div className="n n--sm">{rand(owed(d.sessions))}</div><div className="l">Owed</div></div>
          <div className="metric metric--green"><div className="n n--sm">{rand(view.paidThisSem)}</div><div className="l">Paid this semester</div></div>
        </div>

        {/* ---- confirm ---- */}
        {view.toConfirm.length ? (
          <>
            <div className="sect">Needs confirming</div>
            <div className="card">
              {view.toConfirm.map(s => (
                <div className="row" key={s.id}>
                  <span className="rmain">
                    <span className="rname">{when(s)}</span>
                    <span className="rmeta"><span className="mono">{s.module_code}</span>
                      {s.status === 'logged' ? ` · ${s.students_attended ?? 0} students` : ' · tutor didn’t mark it'}</span>
                  </span>
                  <span className="rside" style={{ gap: 6 }}>
                    {s.status === 'scheduled' ? (
                      <button className="btn btn--outline btn--sm" disabled={busy === s.id} onClick={() => setStatus(s, 'cancelled', 'Marked as didn’t happen')}>Didn’t happen</button>
                    ) : null}
                    <button className="btn btn--sm" disabled={busy === s.id} onClick={() => setStatus(s, 'confirmed', 'Session confirmed')}>Confirm</button>
                  </span>
                </div>
              ))}
            </div>
            <p className="small muted" style={{ marginTop: 8 }}>Check each one against the register first. Confirming locks in the current rate per session.</p>
          </>
        ) : null}

        {/* ---- pay ---- */}
        <div className="sect">Pay</div>
        <div className="card card--pad">
          <div className="payrow"><span className="muted">Confirmed, not paid</span><span>{view.confirmed.length} session{view.confirmed.length === 1 ? '' : 's'}</span></div>
          <div className="payrow"><span className="muted">Owed</span><b style={{ color: 'var(--goldD)' }}>{rand(owed(d.sessions))}</b></div>
          <button className="btn" style={{ marginTop: 12 }} disabled={!view.confirmed.length}
            onClick={() => openSheet(<PaySheet first={first} sessions={view.confirmed} />)}>
            {view.confirmed.length ? `Mark ${view.confirmed.length} as paid` : 'Nothing to pay'}
          </button>
        </div>

        {/* ---- weekly slots ---- */}
        <div className="sect">Weekly slots</div>
        {activeSlots.length ? (
          <div className="card">
            {activeSlots.map(sl => (
              <div className="row" key={sl.id}>
                <span className="avatar avatar--code">{WEEKDAYS[sl.weekday - 1].slice(0, 3).toUpperCase()}</span>
                <span className="rmain">
                  <span className="rname">{WEEKDAYS[sl.weekday - 1]}s · {hhmm(sl.starts_at)}–{hhmm(sl.ends_at)}</span>
                  <span className="rmeta"><span className="mono">{sl.module_code}</span>{sl.venue ? ` · ${sl.venue}` : ''} · until {fDate(sl.until)}</span>
                </span>
                <span className="rside">
                  <button className="btn btn--outline btn--sm" onClick={() => openSheet(<EndSlotSheet slot={sl} sessions={d.sessions} />)}>Stop</button>
                </span>
              </div>
            ))}
          </div>
        ) : <p className="small muted">No weekly slot running. Add one so {first} has a timetable.</p>}
        <button className="btn btn--outline" style={{ marginTop: 10 }} disabled={!sem || !t.tutor_modules.length}
          onClick={() => push(<SlotForm tutor={t} sem={sem!} left={left} />)}>
          <Icon name="plus" size={17} stroke={2.2} /> Add weekly slot
        </button>

        {/* ---- upcoming ---- */}
        {view.upcoming.length ? (
          <>
            <div className="sect">Coming up</div>
            <div className="card">
              {view.upcoming.slice(0, 12).map(s => (
                <div className="row" key={s.id}>
                  <span className="rmain">
                    <span className="rname" style={s.status === 'cancelled' ? { color: 'var(--muted)', textDecoration: 'line-through' } : undefined}>{when(s)}</span>
                    <span className="rmeta"><span className="mono">{s.module_code}</span>{s.venue ? ` · ${s.venue}` : ''}</span>
                  </span>
                  <span className="rside">
                    {s.status === 'cancelled'
                      ? <button className="btn btn--outline btn--sm" disabled={busy === s.id} onClick={() => setStatus(s, 'scheduled', 'Session back on')}>Restore</button>
                      : <button className="btn btn--outline btn--sm" disabled={busy === s.id} onClick={() => setStatus(s, 'cancelled', 'Week cancelled — it no longer counts')}>Cancel</button>}
                  </span>
                </div>
              ))}
            </div>
            <p className="small muted" style={{ marginTop: 8 }}>Cancel a single week (e.g. a public holiday). Cancelled sessions don't count towards the limit.</p>
          </>
        ) : null}

        <button className="btn btn--ghost" style={{ marginTop: 14 }} disabled={!sem}
          onClick={() => openSheet(<OneOffSheet tutor={t} />)}>
          + Add a one-off session
        </button>

        {/* ---- registers ---- */}
        <div className="sect">Registers</div>
        {d.registers.length ? (
          <div className="card">
            {d.registers.map(r => <RegisterRow key={r.id} r={r} />)}
          </div>
        ) : <p className="small muted">{first} hasn't uploaded any registers yet.</p>}

        {/* ---- history ---- */}
        {view.history.length ? (
          <>
            <button className="btn btn--ghost" style={{ marginTop: 18 }} onClick={() => setShowHistory(v => !v)}>
              {showHistory ? 'Hide' : 'Show'} confirmed and paid sessions ({view.history.length})
            </button>
            {showHistory ? (
              <div className="card">
                {view.history.map(s => (
                  <div className="row" key={s.id}>
                    <span className="rmain"><span className="rname">{when(s)}</span><span className="rmeta mono">{s.module_code}</span></span>
                    <span className="rside">
                      <span className="small">{rand(Number(s.rate ?? 0))}</span>
                      <Badge tone={s.status === 'paid' ? 'green' : 'gold'}>{s.status === 'paid' ? 'Paid' : 'Owed'}</Badge>
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </div></div>
    </>
  )
}

function RegisterRow({ r }: { r: Register }) {
  const { toast } = useOverlay()
  const open = async () => {
    const w = window.open('', '_blank')   // open first: phones block pop-ups opened after an await
    const { data, error } = await supabase.storage.from('registers').createSignedUrl(r.storage_path, 600)
    if (error || !data) { w?.close(); toast(friendlyError(error)); return }
    if (w) w.location.href = data.signedUrl; else window.location.href = data.signedUrl
  }
  return (
    <button className="row" onClick={open}>
      <span className="avatar"><Icon name="doc" size={18} /></span>
      <span className="rmain"><span className="rname" style={{ overflowWrap: 'anywhere' }}>{r.file_name}</span>
        <span className="rmeta"><span className="mono">{r.module_code}</span> · {fDate(r.uploaded_at.slice(0, 10))}</span></span>
      <span className="rside"><Icon name="chev" size={17} stroke={2.1} /></span>
    </button>
  )
}

/* ---------- sheets ----------------------------------------- */

function QuotaSheet({ tutorId, first, sem, override, used }: { tutorId: string; first: string; sem: Semester; override: number | null; used: number }) {
  const { closeSheet, toast } = useOverlay()
  const [value, setValue] = useState(String(override ?? sem.session_quota))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const n = /^\d{1,3}$/.test(value) ? +value : null

  const run = async (work: () => PromiseLike<{ error: unknown }>, done: string) => {
    setBusy(true); setError('')
    const { error: err } = await work()
    setBusy(false)
    if (err) { haptic(24); setError(friendlyError(err)); return }
    haptic(14); refresh(); closeSheet(); toast(done)
  }
  const save = (e: FormEvent) => {
    e.preventDefault()
    if (n === null) return
    run(() => supabase.from('tutor_quota_overrides').upsert({ tutor_id: tutorId, semester_id: sem.id, session_quota: n }), `${first}'s limit is now ${n}`)
  }

  return (
    <form onSubmit={save}>
      <p className="sheet-sub">{sem.name}</p>
      <h3 className="sheet-title">Session limit for {first}</h3>
      <p className="sheet-lead">Only changes {first}'s limit. Everyone else stays on the semester default of {sem.session_quota}. To change it for all tutors, edit the semester in Settings.</p>
      <div className="sheet-form">
        <div className="field">
          <label htmlFor="f-q">Sessions this semester</label>
          <input id="f-q" type="text" inputMode="numeric" maxLength={3} value={value} onChange={e => setValue(e.target.value.replace(/\D/g, ''))} />
        </div>
        {n !== null && n < used ? (
          <div className="note note--amber" style={{ marginTop: 12 }}><Icon name="alert" size={15} />
            <span>{first} already has {used}. Nothing is removed, but no new sessions can be added.</span></div>
        ) : null}
        {error ? <p className="err">{error}</p> : null}
        <button className="btn" style={{ marginTop: 16 }} disabled={busy || n === null || n === (override ?? sem.session_quota)}>{busy ? 'Saving…' : 'Save limit'}</button>
        {override !== null ? (
          <button type="button" className="btn btn--ghost" disabled={busy}
            onClick={() => run(() => supabase.from('tutor_quota_overrides').delete().eq('tutor_id', tutorId).eq('semester_id', sem.id), `${first} is back on the default`)}>
            Use the semester default ({sem.session_quota})
          </button>
        ) : null}
      </div>
    </form>
  )
}

function PaySheet({ first, sessions }: { first: string; sessions: Session[] }) {
  const { closeSheet, toast } = useOverlay()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const total = owed(sessions)

  const pay = async () => {
    setBusy(true); setError('')
    const { error: err } = await supabase.from('sessions').update({ status: 'paid' }).in('id', sessions.map(s => s.id)).eq('status', 'confirmed')
    if (err) { haptic(24); setError(friendlyError(err)); setBusy(false); return }
    haptic(18); refresh(); closeSheet(); toast(`${rand(total)} marked as paid`)
  }

  return (
    <div>
      <p className="sheet-sub">Pay</p>
      <h3 className="sheet-title">Mark {rand(total)} as paid?</h3>
      <p className="sheet-lead">
        {sessions.length} confirmed session{sessions.length === 1 ? '' : 's'} for {first}. Do this once the money has actually gone out.
        Paid sessions are locked and can't be changed.
      </p>
      {error ? <p className="err">{error}</p> : null}
      <button className="btn" style={{ marginTop: 18 }} disabled={busy} onClick={pay}>{busy ? 'Saving…' : `Yes, ${rand(total)} is paid`}</button>
    </div>
  )
}

function EndSlotSheet({ slot, sessions }: { slot: Slot; sessions: Session[] }) {
  const { closeSheet, toast } = useOverlay()
  const [from, setFrom] = useState(todayISO())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const affected = sessions.filter(s => s.slot_id === slot.id && s.status === 'scheduled' && s.session_date >= from).length

  const stop = async () => {
    setBusy(true); setError('')
    const { error: err } = await supabase.rpc('admin_end_slot', { p_slot: slot.id, p_from: from })
    if (err) { haptic(24); setError(friendlyError(err)); setBusy(false); return }
    haptic(16); refresh(); closeSheet(); toast('Weekly slot stopped')
  }

  return (
    <div>
      <p className="sheet-sub">Weekly slot</p>
      <h3 className="sheet-title">Stop {WEEKDAYS[slot.weekday - 1]}s {hhmm(slot.starts_at)}?</h3>
      <p className="sheet-lead">Sessions from this date on are cancelled and stop counting towards the limit. Sessions before it stay as they are.</p>
      <div className="sheet-form">
        <div className="field">
          <label htmlFor="f-from">Stop from</label>
          <input id="f-from" type="date" value={from} min={slot.starts_on} onChange={e => setFrom(e.target.value)} />
        </div>
        <p className="small muted" style={{ marginTop: 8 }}>{affected} upcoming session{affected === 1 ? '' : 's'} will be cancelled.</p>
        {error ? <p className="err">{error}</p> : null}
        <button className="btn btn--danger" style={{ marginTop: 16 }} disabled={busy || !from} onClick={stop}>{busy ? 'Stopping…' : 'Stop this slot'}</button>
      </div>
    </div>
  )
}

/* A session that wasn't on the timetable. Admin already has the register, so it's confirmed straight away. */
function OneOffSheet({ tutor }: { tutor: TutorRow }) {
  const { closeSheet, toast } = useOverlay()
  const [module, setModule] = useState(tutor.tutor_modules[0]?.module_code ?? '')
  const [date, setDate] = useState(todayISO())
  const [starts, setStarts] = useState('')
  const [ends, setEnds] = useState('')
  const [students, setStudents] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const valid = module && date && date <= todayISO() && (!starts || !ends || ends > starts)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true); setError('')
    const { error: err } = await supabase.from('sessions').insert({
      tutor_id: tutor.id, module_code: module, session_date: date, status: 'confirmed',
      starts_at: starts || null, ends_at: ends || null, students_attended: students ? +students : null,
    })
    if (err) { haptic(24); setError(friendlyError(err)); setBusy(false); return }
    haptic(16); refresh(); closeSheet(); toast('Session added and confirmed')
  }

  return (
    <form onSubmit={save}>
      <p className="sheet-sub">{tutor.full_name}</p>
      <h3 className="sheet-title">Add a one-off session</h3>
      <p className="sheet-lead">For a session that happened outside the timetable. It's confirmed straight away and counts towards the limit.</p>
      <div className="sheet-form">
        <div className="chips" style={{ marginTop: 6 }}>
          {tutor.tutor_modules.map(m => (
            <button type="button" key={m.module_code} className={'chip chip--sm' + (module === m.module_code ? ' on' : '')} onClick={() => setModule(m.module_code)}>{m.module_code}</button>
          ))}
        </div>
        <div className="field">
          <label htmlFor="f-od">Date</label>
          <input id="f-od" type="date" max={todayISO()} value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="btnrow" style={{ marginTop: 14 }}>
          <div className="field" style={{ flex: 1, marginTop: 0 }}><label htmlFor="f-os">From</label><input id="f-os" type="time" value={starts} onChange={e => setStarts(e.target.value)} /></div>
          <div className="field" style={{ flex: 1, marginTop: 0 }}><label htmlFor="f-oe">To</label><input id="f-oe" type="time" value={ends} onChange={e => setEnds(e.target.value)} /></div>
        </div>
        <div className="field">
          <label htmlFor="f-on">Students who came</label>
          <input id="f-on" type="text" inputMode="numeric" maxLength={3} value={students} onChange={e => setStudents(e.target.value.replace(/\D/g, ''))} />
        </div>
        {error ? <p className="err">{error}</p> : null}
        <button className="btn" style={{ marginTop: 16 }} disabled={busy || !valid}>{busy ? 'Adding…' : 'Add session'}</button>
      </div>
    </form>
  )
}
