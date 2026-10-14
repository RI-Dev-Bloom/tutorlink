/* Admin → Applications: the queue, one application in detail, and the decision.
   Opening the results document (or marking it verified) moves an application to Under review.
   Approving makes the student a tutor for the modules where their mark meets the minimum. */

import { useMemo, useState } from 'react'
import { invalidate, must, useQuery } from '../../lib/data'
import { isOpen, loadSettings, type ApplicationStatus } from '../../lib/student'
import { friendlyError, supabase } from '../../lib/supabase'
import { useStack } from '../../nav/Stack'
import { Icon } from '../../ui/icons'
import { useOverlay } from '../../ui/Overlay'
import { BackButton, Badge, Empty, Loading, NavBar, initials } from '../../ui/parts'
import { haptic } from '../../ui/haptic'
import { loadTemplates } from './Templates'

type AdminApp = {
  id: string
  status: ApplicationStatus
  results_path: string
  background_checked: boolean
  response_message: string | null
  submitted_at: string
  processed_at: string | null
  student: { id: string; full_name: string; student_number: string | null; email: string; is_tutor: boolean } | null
  application_marks: { module_code: string; mark: number; applying: boolean; modules: { name: string } | null }[]
}

const SELECT = `id, status, results_path, background_checked, response_message, submitted_at, processed_at,
  student:profiles!applications_student_id_fkey(id, full_name, student_number, email, is_tutor),
  application_marks(module_code, mark, applying, modules(name))`

const OPEN: ApplicationStatus[] = ['pending', 'under_review']

const loadApplications = async () =>
  (await must(supabase.from('applications').select(SELECT).order('submitted_at', { ascending: false }).returns<AdminApp[]>())) ?? []

export const loadOpenCount = async () => {
  const { count, error } = await supabase.from('applications').select('id', { count: 'exact', head: true }).in('status', OPEN)
  if (error) throw error
  return count ?? 0
}

export const STATUS: Record<ApplicationStatus, { label: string; tone: 'amber' | 'slate' | 'green' | 'red' }> = {
  pending: { label: 'New', tone: 'amber' },
  under_review: { label: 'Under review', tone: 'slate' },
  approved: { label: 'Approved', tone: 'green' },
  rejected: { label: 'Declined', tone: 'red' },
}

const FILTERS = [['open', 'Open'], ['approved', 'Approved'], ['rejected', 'Declined'], ['all', 'All']] as const
type Filter = typeof FILTERS[number][0]

const ago = (iso: string) => {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  return d < 1 ? 'today' : d === 1 ? '1 day ago' : `${d} days ago`
}
const fWhen = (iso: string) => new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
const applyingCodes = (a: AdminApp) => a.application_marks.filter(m => m.applying).map(m => m.module_code)
const belowMin = (a: AdminApp, min: number) => a.application_marks.some(m => m.applying && m.mark < min)
const noneMeet = (a: AdminApp, min: number) => !a.application_marks.some(m => m.applying && m.mark >= min)
/* When the auto-filter will decline it: a day after it was sent, on the next hourly run. */
const autoDeclineAt = (a: AdminApp) => {
  const t = new Date(new Date(a.submitted_at).getTime() + 86_400_000)
  return t.toLocaleString('en-ZA', { weekday: 'short', hour: '2-digit', minute: '2-digit' })
}

export function AdminApplications() {
  const { push } = useStack()
  const apps = useQuery('applications', loadApplications)
  const settings = useQuery('settings', loadSettings)
  const min = settings.data?.min_mark ?? 75
  const auto = !!settings.data?.auto_decline
  const [filter, setFilter] = useState<Filter>('open')
  const [q, setQ] = useState('')

  const rows = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    const all = (apps.data ?? []).filter(a => {
      const hay = [a.student?.full_name, a.student?.student_number, a.student?.email, ...applyingCodes(a)].join(' ').toLowerCase()
      return words.every(w => hay.includes(w))
    })
    if (filter === 'open') return all.filter(a => isOpen(a.status)).reverse()   // oldest first: it's a queue
    return filter === 'all' ? all : all.filter(a => a.status === filter)
  }, [apps.data, filter, q])

  return (
    <div className="pad stagger">
      <div className="field" style={{ marginTop: 0, marginBottom: 12 }}>
        <input type="search" placeholder="Search by name, student number or module" value={q} onChange={e => setQ(e.target.value)} aria-label="Search applications" />
      </div>
      <div className="filters">
        {FILTERS.map(([f, label]) => (
          <button key={f} className={'chip' + (filter === f ? ' on' : '')} onClick={() => { haptic(6); setFilter(f) }}>{label}</button>
        ))}
      </div>
      {apps.loading ? <Loading /> : null}
      {apps.error ? <p className="err">{apps.error}</p> : null}
      {apps.data ? (
        <div className="sect" style={{ marginTop: 18 }}>
          {rows.length} {filter === 'open' ? 'waiting' : ''} application{rows.length === 1 ? '' : 's'}
        </div>
      ) : null}
      {apps.data && !rows.length ? (
        <Empty icon="clip" title={q ? 'No match' : filter === 'open' ? 'All caught up' : 'Nothing here'}
          line={filter === 'open' ? 'New applications from students show up here.' : 'No applications in this group yet.'} />
      ) : null}
      {rows.length ? (
        <div className="card">
          {rows.map(a => (
            <button className="row" key={a.id} onClick={() => push(<ApplicationDetail id={a.id} />)}>
              <span className="avatar">{initials(a.student?.full_name || '?')}</span>
              <span className="rmain">
                <span className="rname">{a.student?.full_name || 'Unknown student'}</span>
                <span className="rmeta mono">{applyingCodes(a).join(' · ')}</span>
                <span className="rmeta">{a.student?.student_number} · {isOpen(a.status) ? ago(a.submitted_at) : fWhen(a.processed_at ?? a.submitted_at)}</span>
              </span>
              <span className="rside">
                {isOpen(a.status) && auto && noneMeet(a, min) ? <Badge tone="red">Auto-declines</Badge>
                  : isOpen(a.status) && belowMin(a, min) ? <Badge tone="red">Below {min}%</Badge> : null}
                <Badge tone={STATUS[a.status].tone}>{STATUS[a.status].label}</Badge>
                <Icon name="chev" size={17} stroke={2.1} />
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

/* ---------- one application -------------------------------- */

const markColour = (mark: number, min: number) =>
  mark >= min ? 'var(--green)' : mark >= 50 ? 'var(--amber)' : 'var(--red)'

function ApplicationDetail({ id }: { id: string }) {
  const { toast } = useOverlay()
  const key = `application:${id}`
  const app = useQuery(key, async () => must(supabase.from('applications').select(SELECT).eq('id', id).single<AdminApp>()))
  const settings = useQuery('settings', loadSettings)
  const min = settings.data?.min_mark ?? 75
  const a = app.data
  const file = useQuery(`results-url:${a?.results_path ?? ''}`, async () =>
    a ? (await must(supabase.storage.from('results').createSignedUrl(a.results_path, 3600)))?.signedUrl ?? '' : '')
  const [busy, setBusy] = useState(false)

  // Opening their results (or verifying them) tells the student someone is looking at it.
  const reviewing = () => {
    if (a?.status !== 'pending') return
    supabase.from('applications').update({ status: 'under_review' }).eq('id', id).eq('status', 'pending')
      .then(({ error }) => { if (!error) invalidate(key, 'applications') })
  }

  const setChecked = async (v: boolean) => {
    setBusy(true)
    const { error } = await supabase.from('applications')
      .update(v && a?.status === 'pending' ? { background_checked: v, status: 'under_review' } : { background_checked: v }).eq('id', id)
    setBusy(false)
    if (error) { haptic(24); toast(friendlyError(error)); return }
    haptic(12); invalidate(key, 'applications')
  }

  if (!a) return (<><NavBar title="Application" left={<BackButton />} />{app.error ? <p className="err pad">{app.error}</p> : <Loading />}</>)

  const s = a.student
  const marks = [...a.application_marks].sort((x, y) => Number(y.applying) - Number(x.applying) || y.mark - x.mark)
  const applying = marks.filter(m => m.applying)

  return (
    <>
      <NavBar title="Application" left={<BackButton />} />
      <div className="body"><div className="pad stagger">
        <div className="card card--pad">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="avatar avatar--lg">{initials(s?.full_name || '?')}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="rname" style={{ fontSize: 16 }}>{s?.full_name}</span>
              <span className="rmeta mono">{s?.student_number}</span>
              <span className="rmeta" style={{ overflowWrap: 'anywhere' }}>{s?.email}</span>
            </span>
          </div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 14 }}>
            <Badge tone={STATUS[a.status].tone}>{STATUS[a.status].label}</Badge>
            {a.background_checked ? <Badge tone="green">Checked</Badge> : <Badge tone="plain">Not checked</Badge>}
            {s?.is_tutor ? <Badge tone="gold">Already a tutor</Badge> : null}
          </div>
          <div style={{ marginTop: 14, borderTop: '1px solid var(--lineS)', paddingTop: 6 }}>
            <div className="payrow"><span className="muted">Submitted</span><span>{fWhen(a.submitted_at)} · {ago(a.submitted_at)}</span></div>
          </div>
        </div>

        <div className="sect">Wants to tutor · {min}% needed</div>
        <div className="chips">
          {applying.map(m => <span key={m.module_code} className="chip chip--static"><span className="code">{m.module_code}</span>{m.modules?.name}</span>)}
        </div>

        <div className="sect">Marks they entered</div>
        <div className="card card--pad">
          {marks.map(m => {
            const col = markColour(m.mark, min)
            return (
              <div className="mark" key={m.module_code}>
                <span className="mark__name">
                  <span className="mark__code" style={m.applying ? { fontWeight: 700 } : { color: 'var(--muted)' }}>{m.module_code}</span>
                  {m.applying ? <span className="applied">APPLIED</span> : null}
                  <span className="mark__sub">{m.modules?.name}</span>
                </span>
                <span className="mark__bar"><span style={{ width: `${m.mark}%`, background: col }} /></span>
                <span className="mark__pct" style={{ color: col }}>{m.mark}%</span>
                <span style={{ width: 16, color: col }}>{m.applying ? <Icon name={m.mark >= min ? 'check' : 'x'} size={15} stroke={2.2} /> : null}</span>
              </div>
            )
          })}
        </div>
        {file.data ? (
          <a className="btn btn--outline" style={{ marginTop: 12, textDecoration: 'none' }} href={file.data} target="_blank" rel="noreferrer" onClick={reviewing}>
            <Icon name="doc" size={17} /> Open their results document
          </a>
        ) : null}
        <p className="small muted" style={{ marginTop: 8 }}>Check the marks above match the document.{a.status === 'pending' ? ' Opening it moves the application to Under review.' : ''}</p>
        {isOpen(a.status) && noneMeet(a, min) ? (
          <div className="note note--amber" style={{ marginTop: 12 }}><Icon name="alert" size={15} />
            <span>No module reaches {min}%.{settings.data?.auto_decline ? <> Auto-decline will decline it around <b>{autoDeclineAt(a)}</b> unless you decide first.</> : ' You can only decline this one.'}</span></div>
        ) : null}

        <div className="sect">Background check</div>
        <div className="card">
          <div className="row">
            <span className="rmain">
              <span className="rname">Results verified</span>
              <span className="rmeta">{a.background_checked ? 'Marked as checked' : 'Needed before you can approve'}</span>
            </span>
            <span className="rside">
              {a.background_checked
                ? (isOpen(a.status) ? <button className="btn btn--outline btn--sm" disabled={busy} onClick={() => setChecked(false)}>Undo</button> : <Badge tone="green">Done</Badge>)
                : <button className="btn btn--sm" disabled={busy || !isOpen(a.status)} onClick={() => setChecked(true)}>Mark done</button>}
            </span>
          </div>
        </div>

        {isOpen(a.status) ? <Decision app={a} /> : (
          <>
            <div className="sect">Decision</div>
            <div className="card card--pad">
              <Badge tone={STATUS[a.status].tone}>{STATUS[a.status].label}</Badge>
              {a.processed_at ? <p className="small muted" style={{ marginTop: 10 }}>Decided {fWhen(a.processed_at)}</p> : null}
              {a.response_message ? <p className="small" style={{ marginTop: 10, lineHeight: 1.7 }}>{a.response_message}</p> : null}
            </div>
          </>
        )}
      </div></div>
    </>
  )
}

function Decision({ app: a }: { app: AdminApp }) {
  const { back } = useStack()
  const { toast } = useOverlay()
  const templates = useQuery('templates', loadTemplates)
  const [approve, setApprove] = useState(true)
  const [picked, setPicked] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const kind = approve ? 'approve' : 'decline'
  const options = (templates.data ?? []).filter(t => t.kind === kind)
  const first = a.student?.full_name.split(' ')[0] ?? 'the student'
  const min = useQuery('settings', loadSettings).data?.min_mark ?? 75
  const meets = a.application_marks.filter(m => m.applying && m.mark >= min).map(m => m.module_code)
  const left = applyingCodes(a).filter(c => !meets.includes(c))
  const codes = meets.join(', ')
  const blocked = approve && (!a.background_checked || !meets.length)

  const choose = (yes: boolean) => { haptic(6); setApprove(yes); setPicked(null); setMessage(''); setConfirm(false); setError('') }

  const send = async () => {
    if (!confirm) { haptic(16); setConfirm(true); return }
    setBusy(true); setError('')
    try {
      await must(supabase.rpc('decide_application', { p_application: a.id, p_approve: approve, p_message: message.trim() }))
      haptic(18); invalidate('applications', `application:${a.id}`)
      back(); toast(approve ? `${first} is now a tutor` : 'Application declined')
    } catch (e) { haptic(24); setError(friendlyError(e)); setBusy(false); setConfirm(false) }
  }

  // Wrapped in a div: as direct children of .stagger, the buttons' disabled fade gets overridden by the entry animation.
  return (
    <div>
      <div className="sect">Your decision</div>
      <div className="seg">
        <button className={approve ? 'on' : ''} onClick={() => choose(true)}>Approve</button>
        <button className={!approve ? 'on' : ''} onClick={() => choose(false)}>Decline</button>
      </div>

      {options.length ? <p className="small muted" style={{ margin: '14px 0 8px' }}>Start from a template, or just write below</p> : null}
      {options.map(t => (
        <button key={t.id} className={'tpl' + (picked === t.id ? ' on' : '')}
          onClick={() => { haptic(6); setPicked(t.id); setMessage(t.body); setConfirm(false) }}>
          <b>{t.label}</b><span>{t.body.length > 100 ? t.body.slice(0, 100) + '…' : t.body}</span>
        </button>
      ))}

      <div className="field">
        <label htmlFor="f-msg">Message to {first}</label>
        <textarea id="f-msg" rows={5} placeholder={approve ? 'Welcome them to the programme…' : 'Let them know why…'}
          value={message} onChange={e => { setMessage(e.target.value); setConfirm(false) }} />
      </div>

      {approve && !meets.length ? (
        <div className="note note--amber" style={{ marginTop: 12 }}><Icon name="alert" size={15} />
          <span>None of their marks reach {min}%, so there's nothing to approve.</span></div>
      ) : blocked ? (
        <div className="note note--amber" style={{ marginTop: 12 }}><Icon name="alert" size={15} />
          <span>Mark the results as verified before approving.</span></div>
      ) : approve && left.length ? (
        <div className="note note--plain" style={{ marginTop: 12 }}><Icon name="alert" size={15} />
          <span>Approving adds <b>{codes}</b> only. {left.join(', ')} {left.length === 1 ? 'is' : 'are'} below {min}%.</span></div>
      ) : null}
      {confirm ? (
        <div className={'note ' + (approve ? 'note--green' : 'note--red')} style={{ marginTop: 12 }}><Icon name="alert" size={15} />
          <span>{approve
            ? <><b>{first}</b> becomes a tutor for <b>{codes}</b> and gets your message. This can't be undone here.</>
            : <><b>{first}</b>'s application is closed and they see your message. They can apply again later.</>}</span>
        </div>
      ) : null}
      {error ? <p className="err">{error}</p> : null}

      <button className={'btn ' + (approve ? '' : 'btn--danger')} style={{ marginTop: 14 }}
        disabled={busy || blocked || message.trim().length < 2} onClick={send}>
        {busy ? 'Sending…' : confirm ? (approve ? `Yes, approve ${first}` : `Yes, decline`) : approve ? 'Approve and send' : 'Decline and send'}
      </button>
      <p className="small muted" style={{ marginTop: 10, textAlign: 'center' }}>
        {approve ? 'They’ll see the Tutor view next time they open the app.' : 'They’ll see your message on their Apply tab.'}
      </p>
      </div>
  )
}
