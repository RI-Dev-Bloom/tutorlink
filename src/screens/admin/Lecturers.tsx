/* Admin → Lecturers: list and search, let a lecturer in by email (they sign in with Google,
   no password), edit modules, give a password to someone without a Google email, remove. */

import { useMemo, useState, type FormEvent } from 'react'
import { adminUsers, appLink, invalidate, must, useQuery } from '../../lib/data'
import { friendlyError, supabase } from '../../lib/supabase'
import { displayName, type Lecturer, type Module } from '../../lib/types'
import { useStack } from '../../nav/Stack'
import { Icon } from '../../ui/icons'
import { useOverlay } from '../../ui/Overlay'
import { BackButton, Badge, Empty, Loading, NavBar, initials } from '../../ui/parts'
import { haptic } from '../../ui/haptic'
import { loadModules } from './Modules'
import { Thread } from '../messages/Thread'

const TITLES = ['Dr', 'Prof', 'Mr', 'Mrs', 'Ms', '']

const loadLecturers = () =>
  must(supabase.from('profiles')
    .select('id, title, full_name, email, must_change_password, lecturer_modules(module_code)')
    .eq('role', 'lecturer').order('full_name').returns<Lecturer[]>())

export function Lecturers() {
  const { push } = useStack()
  const lecturers = useQuery('lecturers', loadLecturers)
  const [q, setQ] = useState('')

  // Every word typed must appear somewhere: "dr smith", "smith prog", "PROG6221"...
  const shown = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    return (lecturers.data ?? []).filter(l => {
      const hay = [displayName(l), l.email, ...l.lecturer_modules.map(m => m.module_code)].join(' ').toLowerCase()
      return words.every(w => hay.includes(w))
    })
  }, [lecturers.data, q])

  return (
    <>
      <NavBar title="Lecturers" left={<BackButton />} />
      <div className="body"><div className="pad pad--fab">
        {lecturers.loading ? <Loading /> : null}
        {lecturers.error ? <p className="err">{lecturers.error}</p> : null}
        {lecturers.data && !lecturers.data.length ? (
          <Empty icon="board" title="No lecturers yet" line="Add a lecturer's email, then send them the message the app gives you." />
        ) : null}
        {lecturers.data?.length ? (
          <div className="field" style={{ marginBottom: 14 }}>
            <input type="search" placeholder="Search by title, name, email or module" value={q} onChange={e => setQ(e.target.value)} aria-label="Search lecturers" />
          </div>
        ) : null}
        {lecturers.data?.length && !shown.length ? <Empty icon="board" title="No match" line="Nothing matches that search." /> : null}
        {shown.length ? (
          <div className="card stagger">
            {shown.map(l => (
              <button className="row" key={l.id} onClick={() => push(<LecturerDetail id={l.id} />)}>
                <span className="avatar avatar--gold">{initials(l.full_name)}</span>
                <span className="rmain">
                  <span className="rname">{displayName(l)}</span>
                  <span className="rmeta mono">{l.lecturer_modules.map(m => m.module_code).join(' · ') || 'No modules'}</span>
                </span>
                <span className="rside">
                  {l.must_change_password ? <Badge tone="amber">Not signed in yet</Badge> : null}
                  <Icon name="chev" size={17} stroke={2.1} />
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div></div>
      <button className="fab fab--low" onClick={() => push(<AddLecturer />)}>
        <Icon name="plus" size={18} stroke={2.2} /> Add lecturer
      </button>
    </>
  )
}

/* ---------- add ------------------------------------------- */

type Created = { email: string; password?: string; existing?: boolean }

function AddLecturer() {
  const modules = useQuery('modules', loadModules)
  const [title, setTitle] = useState('Dr')
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [email, setEmail] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState<Created | null>(null)

  const toggle = (code: string) => { haptic(6); setPicked(p => p.includes(code) ? p.filter(c => c !== code) : [...p, code]) }
  const valid = first.trim() && last.trim() && /\S+@\S+\.\S+/.test(email) && picked.length > 0

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setBusy(true); setError('')
    try {
      const r = await adminUsers<Created>({ action: 'create_lecturer', title, first_name: first, last_name: last, email, modules: picked })
      haptic(16); invalidate('lecturers'); setCreated(r)
    } catch (err) {
      haptic(24); setError(friendlyError(err))
    }
    setBusy(false)
  }

  const name = [title, first.trim(), last.trim()].filter(Boolean).join(' ')
  const moduleNames = picked.map(c => `${c} ${modules.data?.find(m => m.code === c)?.name ?? ''}`.trim())

  if (created) {
    return (
      <>
        <NavBar title="Lecturer added" left={<BackButton />} />
        <div className="body"><div className="pad">
          <Credentials heading={`${name} can sign in`} name={name} email={created.email} modules={moduleNames}
            note={created.existing ? 'They had already signed in with this email, so that account is now their lecturer account.' : undefined} />
        </div></div>
      </>
    )
  }

  return (
    <>
      <NavBar title="Add lecturer" left={<BackButton />} />
      <div className="body"><form className="pad" onSubmit={submit}>
        <div className="field">
          <label>Title</label>
          <div className="chips">
            {TITLES.map(t => (
              <button type="button" key={t || 'none'} className={'chip chip--sm' + (title === t ? ' on' : '')} onClick={() => { haptic(6); setTitle(t) }}>
                {t || 'None'}
              </button>
            ))}
          </div>
        </div>
        <div className="btnrow" style={{ marginTop: 14 }}>
          <div className="field" style={{ flex: 1, marginTop: 0 }}>
            <label htmlFor="f-fn">Name</label>
            <input id="f-fn" type="text" autoComplete="off" value={first} onChange={e => setFirst(e.target.value)} />
          </div>
          <div className="field" style={{ flex: 1, marginTop: 0 }}>
            <label htmlFor="f-ln">Surname</label>
            <input id="f-ln" type="text" autoComplete="off" value={last} onChange={e => setLast(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="f-em">Email</label>
          <input id="f-em" type="email" inputMode="email" autoCapitalize="off" autoComplete="off" value={email} onChange={e => setEmail(e.target.value)} />
        </div>

        <div className="field">
          <label>Modules they teach {picked.length ? `(${picked.length})` : ''}</label>
          {modules.loading ? <Loading /> : null}
          <div className="chips">
            {(modules.data ?? []).filter(m => !m.hidden).map((m: Module) => (
              <button type="button" key={m.code} className={'chip' + (picked.includes(m.code) ? ' on' : '')} onClick={() => toggle(m.code)}>
                <span className="code">{m.code}</span>{m.name}
              </button>
            ))}
          </div>
          <p className="small muted" style={{ marginTop: 8 }}>They'll only see — and only be able to message — tutors on these modules.</p>
        </div>

        {error ? <p className="err">{error}</p> : null}
        <button className="btn" style={{ marginTop: 20 }} disabled={busy || !valid}>
          {busy ? 'Letting them in…' : 'Let them in'}
        </button>
        <p className="small muted" style={{ marginTop: 10 }}>No password needed. They sign in with Google using this email, and only this email gets lecturer access. You'll get a message to send them.</p>
      </form></div>
    </>
  )
}

/* ---------- detail ---------------------------------------- */

function LecturerDetail({ id }: { id: string }) {
  const { openSheet, toast } = useOverlay()
  const { back, push } = useStack()
  const lecturer = useQuery(`lecturer:${id}`, () =>
    must(supabase.from('profiles').select('id, title, full_name, email, must_change_password, lecturer_modules(module_code)').eq('id', id).single<Lecturer>()))
  const modules = useQuery('modules', loadModules)
  const [picked, setPicked] = useState<string[] | null>(null)
  const [busy, setBusy] = useState(false)

  const l = lecturer.data
  const current = l?.lecturer_modules.map(m => m.module_code) ?? []
  const chosen = picked ?? current
  const changed = picked !== null && (picked.length !== current.length || picked.some(c => !current.includes(c)))

  const saveModules = async () => {
    if (!l || !picked) return
    if (!picked.length) { toast('Keep at least one module'); return }
    setBusy(true)
    const removed = current.filter(c => !picked.includes(c))
    const added = picked.filter(c => !current.includes(c))
    try {
      if (removed.length) await must(supabase.from('lecturer_modules').delete().eq('lecturer_id', l.id).in('module_code', removed))
      if (added.length) await must(supabase.from('lecturer_modules').insert(added.map(c => ({ lecturer_id: l.id, module_code: c }))))
      haptic(14); setPicked(null); invalidate(`lecturer:${id}`, 'lecturers'); toast('Modules saved')
    } catch (err) { haptic(24); toast(friendlyError(err)) }
    setBusy(false)
  }

  if (!l) return (<><NavBar title="Lecturer" left={<BackButton />} />{lecturer.error ? <p className="err pad">{lecturer.error}</p> : <Loading />}</>)

  return (
    <>
      <NavBar title={displayName(l)} left={<BackButton />}
        right={<button className="iconbtn" style={{ marginRight: -10 }} aria-label="Message" onClick={() => push(<Thread otherId={l.id} />)}><Icon name="mail" size={21} /></button>} />
      <div className="body"><div className="pad">
        <div className="card card--pad" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span className="avatar avatar--lg avatar--gold">{initials(l.full_name)}</span>
          <span style={{ minWidth: 0 }}>
            <span className="rname" style={{ fontSize: 16 }}>{displayName(l)}</span>
            <span className="rmeta">{l.email}</span>
          </span>
        </div>
        {l.must_change_password ? (
          <div className="note note--amber" style={{ marginTop: 12 }}><Icon name="alert" size={15} />
            <span>Hasn't signed in yet.</span></div>
        ) : null}

        <div className="sect" style={{ marginTop: 26 }}>Modules they teach</div>
        <div className="chips">
          {(modules.data ?? []).filter(m => !m.hidden || chosen.includes(m.code)).map(m => (
            <button type="button" key={m.code} className={'chip' + (chosen.includes(m.code) ? ' on' : '')}
              onClick={() => { haptic(6); setPicked(chosen.includes(m.code) ? chosen.filter(c => c !== m.code) : [...chosen, m.code]) }}>
              <span className="code">{m.code}</span>{m.name}
            </button>
          ))}
        </div>
        {changed ? (
          <div className="btnrow" style={{ marginTop: 14 }}>
            <button className="btn btn--outline" onClick={() => setPicked(null)} disabled={busy}>Undo</button>
            <button className="btn" onClick={saveModules} disabled={busy}>{busy ? 'Saving…' : 'Save modules'}</button>
          </div>
        ) : null}
        <p className="small muted" style={{ marginTop: 10 }}>Removing a module hides its tutors from this lecturer and closes those message threads.</p>

        <div className="sect" style={{ marginTop: 26 }}>Sign-in</div>
        <p className="small muted" style={{ marginBottom: 10 }}>Signs in with Google using <b>{l.email}</b>. If that email isn't a Google account, give them a password instead.</p>
        <button className="btn btn--outline" onClick={() => openSheet(<ResetSheet lecturer={l} />)}>
          <Icon name="shield" size={17} /> Give them a password
        </button>

        <div className="sect" style={{ marginTop: 26 }}>Leaving Rosebank?</div>
        <button className="btn btn--danger" onClick={() => openSheet(<RemoveSheet lecturer={l} onRemoved={back} />)}>Remove lecturer</button>
      </div></div>
    </>
  )
}

function ResetSheet({ lecturer: l }: { lecturer: Lecturer }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState<Created | null>(null)

  const reset = async () => {
    setBusy(true); setError('')
    try {
      const r = await adminUsers<Created>({ action: 'reset_password', user_id: l.id })
      haptic(16); invalidate(`lecturer:${l.id}`, 'lecturers'); setCreated(r)
    } catch (err) { haptic(24); setError(friendlyError(err)) }
    setBusy(false)
  }

  if (created) return <Credentials heading="Password ready" name={displayName(l)} email={created.email} password={created.password} />

  return (
    <div>
      <p className="sheet-sub">Lecturer</p>
      <h3 className="sheet-title">Give them a password?</h3>
      <p className="sheet-lead">Only needed if {l.email} isn't a Google account. You'll get a password to send {displayName(l)}, and they choose their own when they sign in. Any password they had before stops working. Google sign-in keeps working either way.</p>
      {error ? <p className="err">{error}</p> : null}
      <button className="btn" style={{ marginTop: 18 }} onClick={reset} disabled={busy}>{busy ? 'Making one…' : 'Yes, make a password'}</button>
    </div>
  )
}

// Sheets sit outside the screen stack, so the detail screen passes its own `back`.
function RemoveSheet({ lecturer: l, onRemoved }: { lecturer: Lecturer; onRemoved: () => void }) {
  const { closeSheet, toast } = useOverlay()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const remove = async () => {
    setBusy(true); setError('')
    try {
      await adminUsers({ action: 'remove_lecturer', user_id: l.id })
      haptic(16); invalidate('lecturers'); closeSheet(); onRemoved(); toast(`${displayName(l)} removed`)
    } catch (err) { haptic(24); setError(friendlyError(err)); setBusy(false) }
  }

  return (
    <div>
      <p className="sheet-sub">Lecturer</p>
      <h3 className="sheet-title">Remove {displayName(l)}?</h3>
      <p className="sheet-lead">They're signed out and can't sign in again. Their messages with tutors are deleted too. Tutors and sessions aren't affected. This can't be undone, but you can add them again later with the same email.</p>
      {error ? <p className="err">{error}</p> : null}
      <button className="btn btn--danger" style={{ marginTop: 18 }} onClick={remove} disabled={busy}>{busy ? 'Removing…' : 'Yes, remove them'}</button>
    </div>
  )
}

/* ---------- the message admin sends ----------------------- */

function Credentials({ heading, name, email, password, modules, note }: {
  heading: string; name: string; email: string; password?: string; modules?: string[]; note?: string
}) {
  const { toast } = useOverlay()
  const steps = password
    ? [
        `Hi ${name}, here's how to sign in to TutorLink.`,
        '',
        `1. Open ${appLink()}`,
        '2. Tap "Email and password"',
        `Email: ${email}`,
        `Password: ${password}`,
        "(you'll choose your own password straight after)",
      ]
    : [
        `Hi ${name}, you now have access to TutorLink, Rosebank's tutoring app.`,
        '',
        `1. Open ${appLink()}`,
        `2. Tap "Sign in with Google" and choose ${email}`,
        '',
        'No password needed.',
      ]
  const message = [...steps, ...(modules?.length ? ['', `Your modules: ${modules.join(', ')}`] : [])].join('\n')

  const copy = async () => {
    try { await navigator.clipboard.writeText(message); haptic(14); toast('Copied — paste it into WhatsApp or an email') }
    catch { toast('Couldn’t copy — select the text instead') }
  }
  const share = async () => {
    try { await navigator.share({ title: 'TutorLink sign-in', text: message }) } catch { /* cancelled */ }
  }

  return (
    <div className="stagger">
      <div className="note note--green"><Icon name="check" size={15} /><span><b>{heading}.</b> {password ? 'Send them this message. The password is only shown now.' : 'Send them this message so they know how to get in.'}</span></div>
      <div className="card card--pad card--gold" style={{ marginTop: 14 }}>
        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--fb)', fontSize: 13.5, lineHeight: 1.65, userSelect: 'text', WebkitUserSelect: 'text' }}>{message}</pre>
      </div>
      {note ? <p className="small muted" style={{ marginTop: 10 }}>{note}</p> : null}
      {password ? (
        <div className="card card--pad" style={{ marginTop: 10 }}>
          <span className="rmeta" style={{ marginTop: 0 }}>Password</span>
          <span className="mono" style={{ fontSize: 22, letterSpacing: '.06em', userSelect: 'text', WebkitUserSelect: 'text' }}>{password}</span>
        </div>
      ) : null}
      <button className="btn" style={{ marginTop: 16 }} onClick={copy}><Icon name="clip" size={18} /> Copy message</button>
      {'share' in navigator ? <button className="btn btn--navy" onClick={share}>Share to WhatsApp…</button> : null}
    </div>
  )
}
