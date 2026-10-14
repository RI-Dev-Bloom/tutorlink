/* Check-in: the tutor starts it, shows the QR (in class) or a 4-digit code (online),
   and watches the list fill up. The same screen shows a past session's attendance,
   where the tutor (or admin) can add someone by hand. */

import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../../lib/auth'
import { METHOD, displayLink, checkinLink, hhmmOf, loadAttendance, minsLeft, useLive, type AttendanceRow } from '../../lib/attendance'
import { invalidate, must, useQuery } from '../../lib/data'
import { friendlyError, supabase } from '../../lib/supabase'
import { SESSION_COLS, fDay, hhmm, type Session, type TutorData } from '../../lib/tutors'
import { todayISO } from '../../lib/types'
import { Icon } from '../../ui/icons'
import { useOverlay } from '../../ui/Overlay'
import { BackButton, Badge, Loading, NavBar, initials } from '../../ui/parts'
import { QR } from '../../ui/QR'
import { downloadRegister } from '../../lib/register-pdf'
import { haptic } from '../../ui/haptic'

type SessionRow = Session & { modules: { name: string } | null; tutor: { full_name: string } | null }

const LENGTHS = [1, 1.5, 2, 2.5, 3, 4]
const WINDOWS = [5, 10, 15, 20]   // how long students can check in, in minutes
const fHours = (h: number) => `${h} h`.replace('.5 h', '½ h')

/* Monday of this week, on the phone's clock. */
const weekOf = (iso: string) => {
  const d = new Date(iso + 'T00:00:00'); const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day); return d.toLocaleDateString('en-CA')
}
const addDays = (iso: string, n: number) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA') }

/* ---------- starting a check-in ---------------------------- */

export function StartCheckinSheet({ d, onStarted }: { d: TutorData; onStarted: (sessionId: string) => void }) {
  const { closeSheet, toast } = useOverlay()
  const today = todayISO()
  const mods = d.tutor.tutor_modules.map(t => t.module_code)
  // The session planned for this week, for each module: the check-in uses it (moved to today if needed).
  const planned = (code: string) => {
    const mon = weekOf(today), sun = addDays(mon, 6)
    return d.sessions.filter(s => s.module_code === code && s.status === 'scheduled' && s.session_date >= mon && s.session_date <= sun)
      .sort((a, b) => Number(b.session_date === today) - Number(a.session_date === today)
        || Math.abs(+new Date(a.session_date) - +new Date(today)) - Math.abs(+new Date(b.session_date) - +new Date(today)))[0]
  }
  const firstMod = mods.find(c => planned(c)?.session_date === today) ?? mods.find(c => planned(c)) ?? mods[0] ?? ''
  const [module, setModule] = useState(firstMod)
  const p = planned(module)
  // Already ran one for this module today? Starting again reopens that session.
  const again = d.sessions.find(s => s.module_code === module && s.session_date === today && s.status === 'logged')
  const [mode, setMode] = useState<'class' | 'online'>('class')
  const [venue, setVenue] = useState(p?.venue ?? '')
  const [hours, setHours] = useState(p && Number(p.hours) && LENGTHS.includes(Number(p.hours)) ? Number(p.hours) : 1)
  const [minutes, setMinutes] = useState(10)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const pickModule = (c: string) => {
    haptic(6); setModule(c)
    const q = planned(c)
    if (mode === 'class') setVenue(q?.venue ?? '')
    if (q && LENGTHS.includes(Number(q.hours))) setHours(Number(q.hours))
  }
  const pickMode = (m: 'class' | 'online') => { haptic(6); setMode(m); setVenue(m === 'online' ? 'Online (Teams)' : p?.venue ?? '') }

  const start = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const id = await must(supabase.rpc('tutor_start_checkin', { p_module: module, p_venue: venue.trim(), p_hours: hours, p_mode: mode, p_minutes: minutes })) as string
      haptic(18); invalidate('tutor', 'tutors', 'sessions', 'att-totals', 'att-summary', 'att-roster', 'att-held', 'open-checkin'); closeSheet(); onStarted(id); toast('Check-in is open')
    } catch (err) { haptic(24); setError(friendlyError(err)); setBusy(false) }
  }

  const now = new Date()
  const ends = new Date(now.getTime() + hours * 3_600_000)
  const t = (x: Date) => x.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })

  return (
    <form onSubmit={start}>
      <p className="sheet-sub">Today · {t(now)}–{t(ends)}</p>
      <h3 className="sheet-title">Start a check-in</h3>
      <div className="sheet-form">
        {mods.length > 1 ? (
          <div className="field"><label>Module</label>
            <div className="chips">
              {mods.map(c => <button type="button" key={c} className={'chip chip--sm' + (module === c ? ' on' : '')} onClick={() => pickModule(c)}>{c}</button>)}
            </div>
          </div>
        ) : null}
        <div className="field"><label>Where</label>
          <div className="seg">
            <button type="button" className={mode === 'class' ? 'on' : ''} onClick={() => pickMode('class')}>In class</button>
            <button type="button" className={mode === 'online' ? 'on' : ''} onClick={() => pickMode('online')}>Online (Teams)</button>
          </div>
        </div>
        <div className="field">
          <label htmlFor="f-cv">Venue</label>
          <input id="f-cv" type="text" maxLength={60} placeholder={mode === 'class' ? 'e.g. Lab 2' : ''} value={venue} onChange={e => setVenue(e.target.value)} />
        </div>
        <div className="field"><label>Session length</label>
          <div className="chips">
            {LENGTHS.map(h => <button type="button" key={h} className={'chip chip--sm' + (hours === h ? ' on' : '')} onClick={() => { haptic(6); setHours(h) }}>{fHours(h)}</button>)}
          </div>
        </div>
        <div className="field"><label>Check-in open for</label>
          <div className="seg">
            {WINDOWS.map(m => <button type="button" key={m} className={minutes === m ? 'on' : ''} onClick={() => { haptic(6); setMinutes(m) }}>{m} min</button>)}
          </div>
        </div>
        <p className="small muted" style={{ marginTop: 12 }}>
          {again ? `Reopens today's ${module} check-in (the names already there stay).`
            : p ? (p.session_date === today ? `Uses today's ${module} session.` : `Uses your ${module} session planned for ${fDay(p.session_date)}, moved to today.`)
            : `No ${module} session planned this week, so this adds one (it counts towards your limit).`}
          {mode === 'class' ? ' Students scan a QR code that changes every 15 seconds.' : ' You get a 4-digit code that changes every 30 seconds: share your screen in Teams so everyone sees it.'}
          {` Check-in closes after ${minutes} minutes.`}
        </p>
        {error ? <p className="err">{error}</p> : null}
        <button className="btn" style={{ marginTop: 16 }} disabled={busy || !module}>{busy ? 'Starting…' : 'Start check-in'}</button>
      </div>
    </form>
  )
}

/* ---------- the live screen, and a session's attendance --- */

export function SessionScreen({ sessionId }: { sessionId: string }) {
  const { profile } = useAuth()
  const { openSheet, toast } = useOverlay()
  const isAdmin = profile?.role === 'admin'
  const key = `session:${sessionId}`
  const s = useQuery(key, () => must(supabase.from('sessions').select(`${SESSION_COLS}, modules(name), tutor:profiles!sessions_tutor_id_fkey(full_name)`).eq('id', sessionId).single<SessionRow>()))
  const att = useQuery(`attendance:${sessionId}`, () => loadAttendance(sessionId))
  const canManage = isAdmin || (!!s.data && s.data.tutor_id === profile?.id)
  const { live } = useLive(() => supabase.rpc('tutor_checkin_live', { p_session: sessionId }), sessionId, canManage)
  const [closing, setClosing] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)

  // A new scan bumps the count: fetch the list again.
  const count = live?.count
  useEffect(() => { if (count !== undefined) invalidate(`attendance:${sessionId}`) }, [count, sessionId])

  const session = s.data
  if (!session) return (<><NavBar title="Session" left={<BackButton />} />{s.error ? <p className="err pad">{s.error}</p> : <Loading />}</>)

  const open = !!live?.open
  const editable = canManage && (session.status === 'scheduled' || session.status === 'logged') && session.session_date <= todayISO()
  const rows = att.data ?? []

  const close = async () => {
    if (!closing) { haptic(14); setClosing(true); return }
    const { error } = await supabase.rpc('tutor_close_checkin', { p_session: sessionId })
    setClosing(false)
    if (error) { toast(friendlyError(error)); return }
    haptic(16); invalidate(key, 'open-checkin', 'tutor', 'tutors', 'sessions', 'att-totals', 'att-summary', 'att-roster', 'att-held'); toast(`Closed · ${rows.length} checked in`)
  }

  const register = async () => {
    setPdfBusy(true)
    try {
      await downloadRegister({
        moduleCode: session.module_code, moduleName: session.modules?.name ?? session.module_code,
        date: session.session_date, from: session.starts_at ? hhmm(session.starts_at) : null, to: session.ends_at ? hhmm(session.ends_at) : null,
        venue: session.venue, hours: Number(session.hours), tutor: session.tutor?.full_name ?? '',
        status: session.status === 'confirmed' || session.status === 'paid' ? 'Confirmed by admin' : session.status === 'logged' ? 'Waiting for admin to confirm' : 'Not confirmed',
      }, rows)
      haptic(12); toast('Register downloaded')
    } catch (e) { toast(friendlyError(e)) }
    setPdfBusy(false)
  }

  const shareScreen = async () => {
    if (!live?.display_id) return
    const url = displayLink(live.display_id)
    const text = `TutorLink check-in · ${session.module_code}\nOpen this on the laptop or projector:\n${url}`
    haptic(8)
    try { if (typeof navigator.share === 'function') { await navigator.share({ title: 'TutorLink check-in', text }); return } } catch { return }
    try { await navigator.clipboard.writeText(url); toast('Link copied. Open it on the laptop') } catch { toast(url) }
  }

  return (
    <>
      <NavBar title={open ? 'Check-in open' : 'Attendance'} left={<BackButton />} />
      <div className="body"><div className="pad stagger">
        <div className="sess-head">
          <span className="rname">{session.modules?.name ?? session.module_code}</span>
          <span className="rmeta">
            <span className="mono">{session.module_code}</span> · {fDay(session.session_date)}
            {session.starts_at ? ` · ${hhmm(session.starts_at)}–${hhmm(session.ends_at)}` : ''}{session.venue ? ` · ${session.venue}` : ''}
          </span>
        </div>

        {open && live?.mode === 'class' && live.token ? (
          <div className="checkin">
            <QR value={checkinLink(live.token)} label={`Check-in QR code for ${session.module_code}`} />
            <div className="checkin__code" aria-label="Or type this code">{live.code}</div>
            <p className="checkin__hint">Students: <b>Check in</b> in TutorLink and scan, or type the code. It changes every 15 seconds.</p>
            <div className="btnrow" style={{ marginTop: 12 }}>
              <button className="btn btn--outline btn--sm" onClick={shareScreen}><Icon name="share" size={15} /> Show on a laptop</button>
            </div>
          </div>
        ) : null}

        {open && live?.mode === 'online' ? (
          <div className="checkin">
            <p className="eyebrow" style={{ marginBottom: 6 }}>Online code</p>
            <div className="checkin__pin">{live.online_code}</div>
            <p className="checkin__hint">It changes every 30 seconds, so a code sent to someone who isn't here stops working. <b>Share your screen in Teams</b> with this showing; students tap <b>Check in</b> in TutorLink and type it.</p>
            <div className="btnrow" style={{ marginTop: 12 }}>
              <button className="btn btn--outline btn--sm" onClick={shareScreen}><Icon name="share" size={15} /> Show on a laptop</button>
            </div>
          </div>
        ) : null}

        {open ? (
          <div className="checkin__bar">
            <span><b>{rows.length}</b> checked in · closes in {minsLeft(live?.closes_at)}</span>
            <button className={'btn btn--sm ' + (closing ? 'btn--danger' : 'btn--outline')} onClick={close}>{closing ? 'Yes, close it' : 'Close check-in'}</button>
          </div>
        ) : (
          <div className="card card--pad" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="rmain">
              <span className="rname">{rows.length} student{rows.length === 1 ? '' : 's'} checked in</span>
              <span className="rmeta">{session.status === 'confirmed' || session.status === 'paid' ? `Confirmed · ${Number(session.hours)} h` : session.status === 'logged' ? 'Waiting for admin to confirm' : session.status === 'cancelled' ? 'Cancelled' : 'No check-in was run'}</span>
            </span>
            <Badge tone={session.status === 'confirmed' || session.status === 'paid' ? 'gold' : session.status === 'logged' ? 'amber' : 'plain'}>
              {session.status === 'confirmed' || session.status === 'paid' ? 'Confirmed' : session.status === 'logged' ? 'Waiting' : session.status === 'cancelled' ? 'Cancelled' : 'Not run'}
            </Badge>
          </div>
        )}

        <div className="sect">
          <span>Who's here</span>
          {editable ? <button className="link" onClick={() => openSheet(<AddStudentSheet sessionId={sessionId} />)}>+ Add by hand</button> : null}
        </div>
        {att.loading ? <Loading /> : rows.length ? (
          <div className="card">
            {rows.map(r => <AttendeeRow key={r.id} r={r} canRemove={editable && (isAdmin || r.method === 'manual' || !open)} />)}
          </div>
        ) : <p className="small muted">{open ? 'Names appear here as students check in.' : 'Nobody checked in.'}</p>}

        {!open && rows.length ? (
          <button className="btn btn--outline" style={{ marginTop: 16 }} disabled={pdfBusy} onClick={register}>
            <Icon name="down" size={16} /> {pdfBusy ? 'Preparing…' : 'Download register (PDF)'}
          </button>
        ) : null}
      </div></div>
    </>
  )
}

function AttendeeRow({ r, canRemove }: { r: AttendanceRow; canRemove: boolean }) {
  const { toast } = useOverlay()
  const [sure, setSure] = useState(false)
  const remove = async () => {
    if (!sure) { haptic(12); setSure(true); setTimeout(() => setSure(false), 3000); return }
    const { error } = await supabase.rpc('tutor_remove_attendance', { p_id: r.id })
    if (error) { toast(friendlyError(error)); return }
    haptic(14); invalidate(`attendance:${r.session_id}`, `session:${r.session_id}`, 'tutor', 'tutors', 'sessions', 'att-totals', 'att-summary', 'att-roster', 'att-held'); toast(`${r.full_name.split(' ')[0]} taken off`)
  }
  return (
    <div className="row">
      <span className="avatar">{initials(r.full_name)}</span>
      <span className="rmain">
        <span className="rname">{r.full_name}</span>
        <span className="rmeta"><span className="mono">{r.student_number}</span>{r.qualification_code ? ` · ${r.qualification_code}` : ''} · {hhmmOf(r.checked_in_at)}</span>
      </span>
      <span className="rside">
        <Badge tone={r.method === 'manual' ? 'amber' : 'plain'}>{METHOD[r.method]}</Badge>
        {canRemove ? <button className={'iconbtn' + (sure ? ' iconbtn--danger' : '')} aria-label={sure ? `Tap again to take ${r.full_name} off` : `Take ${r.full_name} off`} onClick={remove}><Icon name="x" size={16} /></button> : null}
      </span>
    </div>
  )
}

function AddStudentSheet({ sessionId }: { sessionId: string }) {
  const { closeSheet, toast } = useOverlay()
  const [num, setNum] = useState('')
  const [name, setName] = useState('')
  const [qual, setQual] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const clean = num.trim().toUpperCase()
  const valid = /^ST\d{8}$/.test(clean)

  const add = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      await must(supabase.rpc('tutor_add_attendance', { p_session: sessionId, p_student_number: clean, p_full_name: name.trim(), p_qualification: qual.trim() }))
      haptic(16); invalidate(`attendance:${sessionId}`, `session:${sessionId}`, 'tutor', 'tutors', 'sessions', 'att-totals', 'att-summary', 'att-roster', 'att-held'); closeSheet(); toast(`${clean} added`)
    } catch (err) { haptic(24); setError(friendlyError(err)); setBusy(false) }
  }

  return (
    <form onSubmit={add}>
      <p className="sheet-sub">Attendance</p>
      <h3 className="sheet-title">Add a student by hand</h3>
      <p className="sheet-lead">For someone without a phone or data. They show as <b>Manual</b> so admin can see it was added by you.</p>
      <div className="sheet-form">
        <div className="field">
          <label htmlFor="f-an">Student number</label>
          <input id="f-an" className="mono" type="text" autoCapitalize="characters" placeholder="ST12345678" maxLength={10} value={num} onChange={e => setNum(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="f-am">Name and surname</label>
          <input id="f-am" type="text" maxLength={120} placeholder="Only needed if they're not on TutorLink" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="f-aq">Qualification code</label>
          <input id="f-aq" className="mono" type="text" autoCapitalize="characters" placeholder="e.g. DISD (optional)" maxLength={10} value={qual} onChange={e => setQual(e.target.value)} />
        </div>
        {num && !valid ? <p className="err">Student numbers look like ST12345678</p> : null}
        {error ? <p className="err">{error}</p> : null}
        <button className="btn" style={{ marginTop: 16 }} disabled={busy || !valid}>{busy ? 'Adding…' : 'Add to the list'}</button>
      </div>
    </form>
  )
}
