/* Admin → one tutor: quota, sessions to confirm, earnings this semester, weekly slots, upcoming weeks,
   one-off sessions, and each session's attendance. Everything admin does for a tutor, on one page. */

import { useMemo, useState, type FormEvent } from 'react'
import { invalidate, useQuery } from '../../lib/data'
import { friendlyError, supabase } from '../../lib/supabase'
import {
  WEEKDAYS, counts, currentSemester, hhmm, loadSemesters, loadTutor, needsConfirming, earned, isEarned, when,
  type Session, type Slot, type TutorRow,
} from '../../lib/tutors'
import { fDate, rand, todayISO, type Semester } from '../../lib/types'
import { useStack } from '../../nav/Stack'
import { Icon } from '../../ui/icons'
import { useOverlay } from '../../ui/Overlay'
import { BackButton, Badge, Loading, NavBar, initials } from '../../ui/parts'
import { haptic } from '../../ui/haptic'
import { SlotForm } from './SlotForm'
import { Thread } from '../messages/Thread'
import { SessionScreen } from '../tutor/Checkin'
import { loadSettings } from '../../lib/student'

// Anything that changes a tutor's sessions refreshes every screen that shows them.
const refresh = () => invalidate('tutor', 'tutors', 'sessions', 'att-totals', 'att-summary', 'att-roster', 'att-held', 'overrides')


export function TutorDetail({ id }: { id: string }) {
  const { push } = useStack()
  const { openSheet, toast } = useOverlay()
  const semesters = useQuery('semesters', loadSemesters)
  const sem = semesters.data ? currentSemester(semesters.data) : null
  const semId = sem?.id ?? null
  const data = useQuery(`tutor:${id}:${semId}`, () => loadTutor(id, semId))
  const [busy, setBusy] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const min = useQuery('settings', loadSettings).data?.min_attendance ?? 3

  const d = data.data
  const today = todayISO()
  const view = useMemo(() => {
    const all = d?.sessions ?? []
    return {
      used: all.filter(s => counts(s, semId)).length,
      toConfirm: all.filter(needsConfirming),
      confirmed: all.filter(s => isEarned(s) && s.semester_id === semId),
      waiting: all.filter(s => s.status === 'logged' && s.semester_id === semId),
      upcoming: all.filter(s => s.session_date >= today && (s.status === 'scheduled' || s.status === 'cancelled')),
      history: all.filter(isEarned).reverse(),
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
      <NavBar title={t.full_name} left={<BackButton />}
        right={<button className="iconbtn" style={{ marginRight: -10 }} aria-label={`Message ${first}`} onClick={() => push(<Thread otherId={id} />)}><Icon name="mail" size={21} /></button>} />
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
          <div className="metric metric--green"><div className="n">{view.confirmed.length}</div><div className="l">Confirmed</div></div>
          <div className="metric metric--gold"><div className="n n--sm">{rand(earned(d.sessions, semId))}</div><div className="l">Earned this semester</div></div>
        </div>

        {/* ---- confirm ---- */}
        {view.toConfirm.length ? (
          <>
            <div className="sect">Needs confirming</div>
            <div className="card">
              {view.toConfirm.map(s => (
                <div className="row" key={s.id}>
                  <button className="rmain rmain--btn" onClick={() => push(<SessionScreen sessionId={s.id} />)}>
                    <span className="rname">{when(s)}</span>
                    <span className="rmeta"><span className="mono">{s.module_code}</span>
                      {s.status === 'logged' ? ` · ${s.students_attended ?? 0} checked in · ${Number(s.hours)} h` : ' · no check-in'}</span>
                  </button>
                  <span className="rside" style={{ gap: 6 }}>
                    {s.status === 'scheduled' ? (
                      <button className="btn btn--outline btn--sm" disabled={busy === s.id} onClick={() => setStatus(s, 'cancelled', 'Marked as didn’t happen')}>Didn’t happen</button>
                    ) : null}
                    {(s.students_attended ?? 0) >= min
                      ? <button className="btn btn--sm" disabled={busy === s.id} onClick={() => setStatus(s, 'confirmed', 'Session confirmed')}>Confirm</button>
                      : s.status === 'logged' ? <Badge tone="red">Under {min}</Badge> : null}
                  </span>
                </div>
              ))}
            </div>
            <p className="small muted" style={{ marginTop: 8 }}>Tap a session to see who checked in. It needs at least {min} student{min === 1 ? '' : 's'} to be confirmed. Confirming locks in the current rate per hour.</p>
          </>
        ) : null}

        {/* ---- pay ---- */}
        <div className="sect">Pay this semester</div>
        <div className="card card--pad">
          <div className="payrow"><span className="muted">Confirmed sessions</span><span>{view.confirmed.length}</span></div>
          <div className="payrow"><span className="muted">Waiting for you to confirm</span><span>{view.waiting.length}</span></div>
          <div className="payrow"><span className="muted">Earned so far</span><b style={{ color: 'var(--goldD)' }}>{rand(earned(d.sessions, semId))}</b></div>
          <p className="small muted" style={{ marginTop: 10 }}>{sem ? `Paid out with everyone else's after the semester ends on ${fDate(sem.ends_on)}.` : 'Paid out after the semester ends.'}</p>
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

        {/* ---- history ---- */}
        {view.history.length ? (
          <>
            <button className="btn btn--ghost" style={{ marginTop: 18 }} onClick={() => setShowHistory(v => !v)}>
              {showHistory ? 'Hide' : 'Show'} confirmed sessions ({view.history.length})
            </button>
            {showHistory ? (
              <div className="card">
                {view.history.map(s => (
                  <button className="row" key={s.id} onClick={() => push(<SessionScreen sessionId={s.id} />)}>
                    <span className="rmain"><span className="rname">{when(s)}</span><span className="rmeta"><span className="mono">{s.module_code}</span> · {s.students_attended ?? 0} checked in · {Number(s.hours)} h</span></span>
                    <span className="rside">
                      <span className="small">{rand(Number(s.amount ?? 0))}</span>
                      <Icon name="chev" size={17} stroke={2.1} />
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </div></div>
    </>
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

/* A session that wasn't on the timetable and had no check-in. Admin vouches for it, so it's confirmed straight away. */
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
      <p className="sheet-lead">For a session that happened without a check-in. It's confirmed straight away, counts towards the limit, and pays for its length (1 hour if you leave the times out).</p>
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
