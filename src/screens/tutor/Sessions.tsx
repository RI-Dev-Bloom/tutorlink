/* Tutor → Sessions: everything that's happened, with where each one stands,
   logging a session that wasn't on the timetable, and the signed registers. */

import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { must } from '../../lib/data'
import { ACCEPTED, fSize, fileExt, prepareUpload } from '../../lib/files'
import { friendlyError, supabase } from '../../lib/supabase'
import { fDay, hhmm, type Register, type Session, type TutorData } from '../../lib/tutors'
import { fDate, todayISO } from '../../lib/types'
import { Icon } from '../../ui/icons'
import { useOverlay } from '../../ui/Overlay'
import { Badge, Loading } from '../../ui/parts'
import { haptic } from '../../ui/haptic'
import { refreshMine, useMine } from './mine'

const STATUS: Record<Session['status'], { label: string; tone: 'amber' | 'green' | 'gold' | 'plain' | 'red' }> = {
  scheduled: { label: 'Not marked', tone: 'red' },
  logged: { label: 'Waiting', tone: 'amber' },
  confirmed: { label: 'Confirmed', tone: 'gold' },
  paid: { label: 'Confirmed', tone: 'gold' },
  cancelled: { label: 'Cancelled', tone: 'plain' },
}

export function TutorSessions() {
  const { openSheet } = useOverlay()
  const m = useMine()
  const today = todayISO()

  if (m.loading) return <Loading />
  if (m.error || !m.d) return <p className="err pad">{m.error}</p>
  const d = m.d

  const past = d.sessions.filter(s => s.session_date <= today).reverse()
  const withRegister = new Set(d.registers.map(r => r.session_id).filter(Boolean))

  return (
    <>
      <div className="pad pad--fab stagger">
        <div className="sect" style={{ marginTop: 0 }}>Registers
          <button className="link" onClick={() => openSheet(<UploadSheet d={d} />)}>Upload</button>
        </div>
        {d.registers.length ? (
          <div className="card">{d.registers.map(r => <RegisterRow key={r.id} r={r} sessions={d.sessions} />)}</div>
        ) : (
          <button className="drop" style={{ width: '100%' }} onClick={() => openSheet(<UploadSheet d={d} />)}>
            <span className="muted"><Icon name="upload" size={26} /></span>
            <div className="drop__t">Upload a signed register</div>
            <div className="drop__h">Take a photo of the sheet, or attach a PDF</div>
          </button>
        )}

        <div className="sect">Sessions <span className="muted">{past.length}</span></div>
        {past.length ? (
          <div className="card">
            {past.map(s => (
              <div className="row" key={s.id}>
                <span className="avatar avatar--code">{s.module_code.slice(0, 4)}</span>
                <span className="rmain">
                  <span className="rname">{fDay(s.session_date)}{s.starts_at ? ` · ${hhmm(s.starts_at)}` : ''}</span>
                  <span className="rmeta">
                    <span className="mono">{s.module_code}</span>
                    {s.students_attended !== null ? ` · ${s.students_attended} students` : ''}
                    {withRegister.has(s.id) ? ' · register ✓' : ''}
                  </span>
                </span>
                <span className="rside"><Badge tone={STATUS[s.status].tone}>{STATUS[s.status].label}</Badge></span>
              </div>
            ))}
          </div>
        ) : <p className="small muted">No sessions yet. They show up here once they've happened.</p>}

        <div className="note note--plain" style={{ marginTop: 14 }}><Icon name="alert" size={15} />
          <span>A session only counts towards your pay once admin confirms it against the signed register.</span></div>
      </div>
      <button className="fab" disabled={m.left === 0 || !m.sem} onClick={() => openSheet(<LogSheet d={d} left={m.left} />)}>
        <Icon name="plus" size={18} stroke={2.2} /> {m.left === 0 && m.sem ? 'No sessions left' : 'Log a session'}
      </button>
    </>
  )
}

function RegisterRow({ r, sessions }: { r: Register; sessions: Session[] }) {
  const { openSheet, toast } = useOverlay()
  const s = sessions.find(x => x.id === r.session_id)
  const open = async () => {
    const w = window.open('', '_blank')   // open first: phones block pop-ups opened after an await
    const { data, error } = await supabase.storage.from('registers').createSignedUrl(r.storage_path, 600)
    if (error || !data) { w?.close(); toast(friendlyError(error)); return }
    if (w) w.location.href = data.signedUrl; else window.location.href = data.signedUrl
  }
  return (
    <div className="row">
      <button className="rmain" style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', background: 'none', border: 0, padding: 0 }} onClick={open}>
        <span className="avatar"><Icon name="doc" size={18} /></span>
        <span style={{ minWidth: 0 }}>
          <span className="rname" style={{ overflowWrap: 'anywhere' }}>{s ? `${r.module_code} · ${fDay(s.session_date)}` : r.module_code}</span>
          <span className="rmeta">{r.file_name} · {fDate(r.uploaded_at.slice(0, 10))}</span>
        </span>
      </button>
      <span className="rside">
        <button className="iconbtn" aria-label="Remove register" onClick={() => openSheet(<RemoveRegister r={r} />)}><Icon name="x" size={16} /></button>
      </span>
    </div>
  )
}

function RemoveRegister({ r }: { r: Register }) {
  const { closeSheet, toast } = useOverlay()
  const [busy, setBusy] = useState(false)
  const remove = async () => {
    setBusy(true)
    const { error } = await supabase.from('registers').delete().eq('id', r.id)
    if (error) { haptic(24); toast(friendlyError(error)); setBusy(false); return }
    await supabase.storage.from('registers').remove([r.storage_path])
    haptic(14); refreshMine(); closeSheet(); toast('Register removed')
  }
  return (
    <div>
      <p className="sheet-sub">Register</p>
      <h3 className="sheet-title">Remove {r.file_name}?</h3>
      <p className="sheet-lead">Use this if you uploaded the wrong file. Admin won't be able to see it any more.</p>
      <button className="btn btn--danger" style={{ marginTop: 18 }} disabled={busy} onClick={remove}>{busy ? 'Removing…' : 'Yes, remove it'}</button>
    </div>
  )
}

function UploadSheet({ d }: { d: TutorData }) {
  const { closeSheet, toast } = useOverlay()
  const mods = d.tutor.tutor_modules.map(t => t.module_code)
  const [module, setModule] = useState(mods[0] ?? '')
  const today = todayISO()
  const done = new Set(d.registers.map(r => r.session_id))
  // Sessions this register could be for: happened, not cancelled, no register yet.
  const options = d.sessions.filter(s => s.module_code === module && s.session_date <= today && s.status !== 'cancelled' && !done.has(s.id)).reverse()
  const [sessionId, setSessionId] = useState<string>(options[0]?.id ?? '')
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const pickModule = (c: string) => {
    haptic(6); setModule(c)
    const first = d.sessions.filter(s => s.module_code === c && s.session_date <= today && s.status !== 'cancelled' && !done.has(s.id)).reverse()[0]
    setSessionId(first?.id ?? '')
  }
  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setError('')
    if (!ACCEPTED.includes(f.type)) { setError('Use a PDF or a photo (JPG or PNG)'); return }
    const ready = await prepareUpload(f)
    if (ready.size > 10_000_000) { setError(`That file is ${fSize(ready.size)} — the limit is 10 MB`); return }
    haptic(10); setFile(ready)
  }

  const upload = async (e: FormEvent) => {
    e.preventDefault()
    if (!file) return
    setBusy(true); setError('')
    try {
      const path = `${d.tutor.id}/${Date.now()}.${fileExt(file)}`
      await must(supabase.storage.from('registers').upload(path, file, { contentType: file.type }))
      await must(supabase.from('registers').insert({ tutor_id: d.tutor.id, module_code: module, session_id: sessionId || null, storage_path: path, file_name: file.name }))
      haptic(16); refreshMine(); closeSheet(); toast('Register uploaded')
    } catch (err) { haptic(24); setError(friendlyError(err)); setBusy(false) }
  }

  return (
    <form onSubmit={upload}>
      <p className="sheet-sub">Attendance</p>
      <h3 className="sheet-title">Upload a register</h3>
      <p className="sheet-lead">Admin checks it before confirming your session.</p>
      <div className="sheet-form">
        {mods.length > 1 ? (
          <div className="chips" style={{ marginTop: 6 }}>
            {mods.map(c => <button type="button" key={c} className={'chip chip--sm' + (module === c ? ' on' : '')} onClick={() => pickModule(c)}>{c}</button>)}
          </div>
        ) : null}
        <div className="field">
          <label htmlFor="f-rs">Which session?</label>
          <select id="f-rs" value={sessionId} onChange={e => setSessionId(e.target.value)}>
            {options.map(s => <option key={s.id} value={s.id}>{fDay(s.session_date)}{s.starts_at ? ` · ${hhmm(s.starts_at)}` : ''}</option>)}
            <option value="">Not for one session</option>
          </select>
        </div>
        <input ref={input} type="file" accept="application/pdf,image/*" onChange={pick} hidden />
        <div className="drop" style={{ marginTop: 14, ...(file ? { borderStyle: 'solid', borderColor: 'var(--greenBd)', background: 'var(--greenBg)' } : {}) }}>
          <span style={{ color: file ? 'var(--green)' : 'var(--muted)' }}><Icon name={file ? 'check' : 'upload'} size={26} /></span>
          <div className="drop__t" style={{ overflowWrap: 'anywhere' }}>{file ? file.name : 'Photo or PDF of the signed sheet'}</div>
          <div className="drop__h">{file ? fSize(file.size) : 'Photos are shrunk before uploading'}</div>
          <button type="button" className="btn btn--outline btn--sm drop__pick" onClick={() => input.current?.click()}>{file ? 'Choose another' : 'Choose file'}</button>
        </div>
        {error ? <p className="err">{error}</p> : null}
        <button className="btn" style={{ marginTop: 16 }} disabled={busy || !file || !module}>{busy ? 'Uploading…' : 'Upload register'}</button>
      </div>
    </form>
  )
}

/* A session that wasn't on the timetable (e.g. an extra one before a test). */
function LogSheet({ d, left }: { d: TutorData; left: number }) {
  const { closeSheet, toast } = useOverlay()
  const mods = d.tutor.tutor_modules.map(t => t.module_code)
  const [module, setModule] = useState(mods[0] ?? '')
  const [date, setDate] = useState(todayISO())
  const [starts, setStarts] = useState('')
  const [ends, setEnds] = useState('')
  const [venue, setVenue] = useState('')
  const [n, setN] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const valid = module && date && date <= todayISO() && n !== '' && (!starts || !ends || ends > starts)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      await must(supabase.rpc('tutor_log_session', {
        p_date: date, p_module: module, p_students: +n,
        p_starts: starts || null, p_ends: ends || null, p_venue: venue.trim(),
      }))
      haptic(16); refreshMine(); closeSheet(); toast('Logged — admin will confirm it')
    } catch (err) { haptic(24); setError(friendlyError(err)); setBusy(false) }
  }

  return (
    <form onSubmit={save}>
      <p className="sheet-sub">{left} session{left === 1 ? '' : 's'} left this semester</p>
      <h3 className="sheet-title">Log a session</h3>
      <p className="sheet-lead">For a session that wasn't on your timetable. Sessions on your timetable: use Mark on the Schedule tab instead.</p>
      <div className="sheet-form">
        {mods.length > 1 ? (
          <div className="chips" style={{ marginTop: 6 }}>
            {mods.map(c => <button type="button" key={c} className={'chip chip--sm' + (module === c ? ' on' : '')} onClick={() => setModule(c)}>{c}</button>)}
          </div>
        ) : null}
        <div className="field">
          <label htmlFor="f-ld">Date</label>
          <input id="f-ld" type="date" max={todayISO()} value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="btnrow" style={{ marginTop: 14 }}>
          <div className="field" style={{ flex: 1, marginTop: 0 }}><label htmlFor="f-ls">From</label><input id="f-ls" type="time" value={starts} onChange={e => setStarts(e.target.value)} /></div>
          <div className="field" style={{ flex: 1, marginTop: 0 }}><label htmlFor="f-le">To</label><input id="f-le" type="time" value={ends} onChange={e => setEnds(e.target.value)} /></div>
        </div>
        <div className="field">
          <label htmlFor="f-lv">Venue</label>
          <input id="f-lv" type="text" maxLength={60} value={venue} onChange={e => setVenue(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="f-ln">Students who came</label>
          <input id="f-ln" type="text" inputMode="numeric" maxLength={3} value={n} onChange={e => setN(e.target.value.replace(/\D/g, ''))} />
        </div>
        {error ? <p className="err">{error}</p> : null}
        <button className="btn" style={{ marginTop: 16 }} disabled={busy || !valid}>{busy ? 'Saving…' : 'Log session'}</button>
      </div>
    </form>
  )
}
