/* ITAdmin: the IT help desk. One job: help students who can't get in. Find a student, give them
   a new temporary password, or fix the email they signed up with. Nothing else in TutorLink is
   open to this account (the server checks every request too). */

import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../../lib/auth'
import { adminUsers } from '../../lib/data'
import { friendlyError } from '../../lib/supabase'
import { useStack } from '../../nav/Stack'
import { Credentials } from '../../ui/Credentials'
import { Icon } from '../../ui/icons'
import { useOverlay } from '../../ui/Overlay'
import { Badge, Empty, Loading, NavBar, TabBar, initials, type Tab } from '../../ui/parts'
import { Group, SHead, SRow } from '../../ui/Settings'
import { haptic } from '../../ui/haptic'
import { ChangePassword } from '../ChangePassword'

type Student = {
  id: string; full_name: string; student_number: string | null; email: string
  qualification_code: string | null; study_year: number | null
  must_change_password: boolean; created_at: string; last_sign_in_at: string | null
}

const TABS: Tab<string>[] = [
  { id: 'students', icon: 'people', label: 'Students' },
  { id: 'profile', icon: 'user', label: 'Me' },
]

const fDate = (iso: string) => new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
const ago = (iso: string | null) => {
  if (!iso) return 'Never signed in'
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  return m < 60 ? `Last in ${Math.max(1, m)} min ago` : m < 1440 ? `Last in ${Math.round(m / 60)} h ago` : `Last in ${fDate(iso)}`
}

export function ITPortal() {
  const [tab, setTab] = useState('students')
  return (
    <>
      <NavBar title={tab === 'students' ? 'IT help desk' : 'Me'} />
      <div className="body">{tab === 'students' ? <FindStudents /> : <Me />}</div>
      <TabBar tabs={TABS} current={tab} onChange={setTab} />
    </>
  )
}

function FindStudents() {
  const { openSheet } = useOverlay()
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<Student[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [bump, setBump] = useState(0)   // search again after a change
  const term = q.trim()

  useEffect(() => {
    if (term.length < 2) { setRows(null); setError(''); return }
    let stop = false
    const t = window.setTimeout(async () => {
      setBusy(true)
      try { const r = await adminUsers<{ students: Student[] }>({ action: 'find_students', q: term }); if (!stop) { setRows(r.students); setError('') } }
      catch (e) { if (!stop) setError(friendlyError(e)) }
      if (!stop) setBusy(false)
    }, 300)
    return () => { stop = true; clearTimeout(t) }
  }, [term, bump])

  return (
    <div className="pad">
      <div className="ithead">
        <span className="ithead__icon"><Icon name="shield" size={20} /></span>
        <span>
          <b>Help a student get in</b>
          <span>Find them, then give a new password or fix their email.</span>
        </span>
      </div>
      <div className="field" style={{ marginTop: 16 }}>
        <input type="search" autoFocus placeholder="Name, student number or email" value={q} onChange={e => setQ(e.target.value)} aria-label="Find a student" />
      </div>
      {busy && !rows ? <Loading /> : null}
      {error ? <p className="err">{error}</p> : null}
      {term.length < 2 ? <p className="small muted" style={{ marginTop: 12 }}>Type at least 2 letters or numbers, e.g. “st1043” or “Refiloe”.</p> : null}
      {rows && !rows.length ? <Empty icon="user" title="No student found" line="Check the spelling, or try their student number." /> : null}
      {rows?.length ? (
        <div className="card" style={{ marginTop: 12 }}>
          {rows.map(s => (
            <button className="row" key={s.id} onClick={() => { haptic(8); openSheet(<StudentSheet s={s} onChanged={() => setBump(n => n + 1)} />) }}>
              <span className="avatar">{initials(s.full_name || '?')}</span>
              <span className="rmain">
                <span className="rname">{s.full_name || 'No name'}</span>
                <span className="rmeta mono">{s.email}</span>
                <span className="rmeta">{ago(s.last_sign_in_at)}</span>
              </span>
              <span className="rside">
                {s.must_change_password ? <Badge tone="amber">Temp password</Badge> : null}
                <Icon name="chev" size={17} stroke={2.1} />
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function StudentSheet({ s, onChanged }: { s: Student; onChanged: () => void }) {
  const { toast } = useOverlay()
  const [mode, setMode] = useState<'view' | 'email'>('view')
  const [pw, setPw] = useState<{ email: string; name: string; password: string } | null>(null)
  const [email, setEmail] = useState(s.email)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sure, setSure] = useState(false)

  const reset = async () => {
    if (!sure) { haptic(10); setSure(true); return }
    setBusy(true); setError('')
    try { setPw(await adminUsers({ action: 'reset_password', user_id: s.id })); haptic(16); onChanged() }
    catch (e) { haptic(24); setError(friendlyError(e)) }
    setBusy(false)
  }

  const addr = email.trim().toLowerCase()
  const okEmail = /^st\d{8}@rcconnect\.edu\.za$/.test(addr) && addr !== s.email
  const saveEmail = async (e: FormEvent) => {
    e.preventDefault()
    if (!okEmail) return
    setBusy(true); setError('')
    try { await adminUsers({ action: 'change_email', user_id: s.id, email: addr }); haptic(16); toast('Email changed. Their password stays the same'); onChanged(); s.email = addr; setMode('view') }
    catch (err) { haptic(24); setError(friendlyError(err)) }
    setBusy(false)
  }

  if (pw) return <Credentials heading="New password ready" name={s.full_name || pw.email} email={pw.email} password={pw.password} door="Student" />

  return (
    <div>
      <p className="sheet-sub">Student</p>
      <h3 className="sheet-title">{s.full_name || 'No name'}</h3>
      <div className="card" style={{ marginTop: 12 }}>
        <div className="row"><span className="rmain"><span className="rmeta">Email</span><span className="rname mono" style={{ fontSize: 13 }}>{s.email}</span></span></div>
        <div className="row"><span className="rmain"><span className="rmeta">Student number</span><span className="rname mono" style={{ fontSize: 13 }}>{s.student_number ?? '–'}</span></span></div>
        <div className="row"><span className="rmain"><span className="rmeta">Qualification</span><span className="rname" style={{ fontSize: 13 }}>{s.qualification_code ? `${s.qualification_code}${s.study_year ? ` · Year ${s.study_year}` : ''}` : 'Not chosen yet'}</span></span></div>
        <div className="row"><span className="rmain"><span className="rmeta">Account</span><span className="rname" style={{ fontSize: 13 }}>Made {fDate(s.created_at)} · {ago(s.last_sign_in_at)}{s.must_change_password ? ' · on a temporary password' : ''}</span></span></div>
      </div>

      {mode === 'email' ? (
        <form onSubmit={saveEmail} className="sheet-form">
          <div className="field">
            <label htmlFor="f-itmail">Correct Rosebank email</label>
            <input id="f-itmail" type="email" inputMode="email" autoCapitalize="off" autoComplete="off" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          {email && !/^st\d{8}@rcconnect\.edu\.za$/.test(addr) ? <p className="err">Student emails look like st12345678@rcconnect.edu.za</p> : null}
          <p className="small muted" style={{ marginTop: 8 }}>Their student number changes to match. Their password, modules and attendance stay.</p>
          {error ? <p className="err">{error}</p> : null}
          <button className="btn" style={{ marginTop: 14 }} disabled={busy || !okEmail}>{busy ? 'Saving…' : 'Save email'}</button>
          <button type="button" className="btn btn--outline" style={{ marginTop: 9 }} onClick={() => { setMode('view'); setEmail(s.email); setError('') }}>Cancel</button>
        </form>
      ) : (
        <div className="sheet-form">
          {error ? <p className="err">{error}</p> : null}
          <button className={'btn' + (sure ? ' btn--danger' : '')} style={{ marginTop: 16 }} disabled={busy} onClick={reset}>
            <Icon name="key" size={17} /> {busy ? 'Making one…' : sure ? 'Yes, make a new password' : 'Make a new password'}
          </button>
          <p className="small muted" style={{ marginTop: 8 }}>{sure ? 'Their old password stops working. They choose their own when they sign in.' : 'For a student who forgot their password.'}</p>
          <button className="btn btn--outline" style={{ marginTop: 12 }} disabled={busy} onClick={() => { haptic(6); setMode('email') }}>
            <Icon name="mail" size={17} /> Fix their email
          </button>
          <p className="small muted" style={{ marginTop: 8 }}>For a typo in the email they signed up with.</p>
        </div>
      )}
    </div>
  )
}

function Me() {
  const { profile, signOut } = useAuth()
  const { push } = useStack()
  return (
    <div className="pad stagger">
      <SHead name={profile?.full_name || 'IT Admin'} line="IT help desk · Rosebank International" />
      <Group title="Account">
        <SRow icon="mail" tone="blue" label="Email" value={profile?.email} />
        <SRow icon="shield" tone="slate" label="Role" value="ITAdmin" />
      </Group>
      <Group foot="This account can only find students, give them a new password, and fix their email.">
        <SRow label="Change my password" onClick={() => push(<ChangePassword why="change" />)} />
        <SRow label="Sign out" danger onClick={signOut} />
      </Group>
      <p className="app-foot">TutorLink · Rosebank International</p>
    </div>
  )
}
