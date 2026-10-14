/* Student → Apply to tutor. Tick the high-risk modules you'd like to tutor, type your mark
   for each, add your statement of results, send. Then follow it here until admin decides. */

import { Fragment, useRef, useState, type ChangeEvent } from 'react'
import { useAuth } from '../../lib/auth'
import { invalidate, must, useQuery } from '../../lib/data'
import { ACCEPTED, fSize, fileExt, prepareUpload } from '../../lib/files'
import { isOpen, loadMyApplication, loadMyTutorModules, loadSettings, type MyApplication } from '../../lib/student'
import { friendlyError, supabase } from '../../lib/supabase'
import { useStack } from '../../nav/Stack'
import { Icon } from '../../ui/icons'
import { useOverlay } from '../../ui/Overlay'
import { BackButton, Badge, Loading, NavBar } from '../../ui/parts'
import { haptic } from '../../ui/haptic'
import { loadModules } from '../admin/Modules'

const STATUS: Record<MyApplication['status'], { label: string; tone: 'amber' | 'slate' | 'green' | 'red' }> = {
  pending: { label: 'Submitted', tone: 'amber' },
  under_review: { label: 'Under review', tone: 'slate' },
  approved: { label: 'Approved', tone: 'green' },
  rejected: { label: 'Not approved', tone: 'red' },
}

export const appKey = (uid: string) => `my-application:${uid}`

const fWhen = (iso: string) => new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })

export function ApplyTab() {
  const { profile } = useAuth()
  const { push } = useStack()
  const uid = profile!.id
  const app = useQuery(appKey(uid), () => loadMyApplication(uid))
  const tutoring = useQuery(`my-tutor-modules:${uid}`, () => loadMyTutorModules(uid))

  if (app.loading) return <Loading />
  if (app.error) return <p className="err pad">{app.error}</p>
  const a = app.data
  const start = () => { haptic(10); push(<ApplyForm />) }

  return (
    <div className="pad stagger">
      {profile!.is_tutor && tutoring.data?.length ? (
        <div className="note note--green" style={{ marginBottom: 14 }}><Icon name="check" size={15} />
          <span>You tutor {tutoring.data.map(m => m.module_code).join(', ')}. You can apply again to add more modules.</span></div>
      ) : null}

      {a ? <ApplicationCard app={a} /> : <Intro />}

      {!a || !isOpen(a.status) ? (
        <button className="btn" style={{ marginTop: 18 }} onClick={start}>
          {a ? 'Start a new application' : 'Start my application'}
        </button>
      ) : null}
    </div>
  )
}

function Intro() {
  const settings = useQuery('settings', loadSettings)
  const min = settings.data?.min_mark ?? 75
  return (
    <>
      <p className="eyebrow">Peer tutoring programme</p>
      <h2 className="display display--sm">Tutor a module<br />you're good at</h2>
      <p className="sub">Help other students, get paid per session, and it looks great on a CV.</p>
      <div className="sect" style={{ marginTop: 22 }}>You'll need</div>
      <div className="card">
        {[
          ['doc', 'Your statement of results', 'A PDF, or a clear photo of it'],
          ['check', `At least ${min}% in the module`, 'Open modules are the ones that need tutors most'],
          ['clock', 'About five minutes', 'Admin replies here in the app'],
        ].map(([icon, t, s]) => (
          <div className="row" key={t}>
            <span className="avatar"><Icon name={icon as 'doc'} size={18} /></span>
            <span className="rmain"><span className="rname">{t}</span><span className="rmeta">{s}</span></span>
          </div>
        ))}
      </div>
    </>
  )
}

function ApplicationCard({ app: a }: { app: MyApplication }) {
  const s = STATUS[a.status]
  const step = a.status === 'pending' ? 0 : a.status === 'under_review' ? 1 : 2
  const file = useQuery(`results-url:${a.results_path}`, async () =>
    (await must(supabase.storage.from('results').createSignedUrl(a.results_path, 3600)))?.signedUrl ?? '')
  const marks = [...a.application_marks].sort((x, y) => Number(y.applying) - Number(x.applying) || x.module_code.localeCompare(y.module_code))

  return (
    <>
      <div className="card card--pad">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <span className="rname" style={{ fontSize: 16 }}>Your application</span>
          <Badge tone={s.tone}>{s.label}</Badge>
        </div>
        <div className="steps" aria-label={`Step ${step + 1} of 3`}>
          {['Submitted', 'Under review', a.status === 'rejected' ? 'Not approved' : 'Decision'].map((t, i) => (
            <div key={t} className={'step' + (i < step || (i === 2 && a.status === 'approved') ? ' done' : i === step ? ' on' : '')}
              data-tone={i === 2 && a.status === 'rejected' ? 'red' : undefined}>
              <i /><span>{t}</span>
            </div>
          ))}
        </div>
        <p className="small muted" style={{ marginTop: 12 }}>
          Sent {fWhen(a.submitted_at)}{a.processed_at ? ` · decided ${fWhen(a.processed_at)}` : ''}
        </p>
      </div>

      {a.response_message ? (
        <>
          <div className="sect">From the programme office</div>
          <div className={'card card--pad' + (a.status === 'approved' ? ' card--gold' : '')}>
            <p className="small" style={{ lineHeight: 1.7 }}>{a.response_message}</p>
            {a.status === 'approved' ? <p className="small muted" style={{ marginTop: 10 }}>Tap <b>Tutor</b> at the top right to open your tutor view.</p> : null}
          </div>
        </>
      ) : isOpen(a.status) ? (
        <div className="note note--plain" style={{ marginTop: 14 }}><Icon name="clock" size={15} />
          <span>Admin checks your marks against your results, then replies here.</span></div>
      ) : null}

      <div className="sect">What you sent</div>
      <div className="card card--pad">
        {marks.map(m => (
          <div className="mark" key={m.module_code}>
            <span className="mark__name">
              <span className="mark__code" style={m.applying ? { fontWeight: 700 } : { color: 'var(--muted)' }}>{m.module_code}</span>
              {m.applying ? <span className="applied">TUTOR</span> : null}
              <span className="mark__sub">{m.modules?.name}</span>
            </span>
            <span className="mark__pct">{m.mark}%</span>
          </div>
        ))}
      </div>
      {file.data ? (
        <a className="btn btn--outline" style={{ marginTop: 12, textDecoration: 'none' }} href={file.data} target="_blank" rel="noreferrer">
          <Icon name="doc" size={17} /> View my results document
        </a>
      ) : null}
    </>
  )
}

/* ---------- the form -------------------------------------- */

/* Only the modules admin marked high-risk are open for tutoring. Tick the ones you want,
   type your final mark for each, add your results, send. */
function ApplyForm() {
  const { profile } = useAuth()
  const { back } = useStack()
  const { toast } = useOverlay()
  const uid = profile!.id
  const settings = useQuery('settings', loadSettings)
  const modules = useQuery('modules', loadModules)
  const tutoring = useQuery(`my-tutor-modules:${uid}`, () => loadMyTutorModules(uid))
  const min = settings.data?.min_mark ?? 75
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState('')
  const [marks, setMarks] = useState<Record<string, string>>({})   // picked module → what they typed
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState<'' | 'upload' | 'save'>('')
  const [error, setError] = useState('')

  const mine = new Set((tutoring.data ?? []).map(m => m.module_code))
  const open = (modules.data ?? []).filter(m => m.high_risk && !m.hidden && !mine.has(m.code))
  const words = q.toLowerCase().split(/\s+/).filter(Boolean)
  const shown = open.filter(m => m.code in marks || words.every(w => `${m.code} ${m.name}`.toLowerCase().includes(w)))

  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setFileError('')
    if (!ACCEPTED.includes(f.type)) { setFileError('Use a PDF or a photo (JPG or PNG)'); return }
    const ready = await prepareUpload(f)
    if (ready.size > 10_000_000) { setFileError(`That file is ${fSize(ready.size)} — the limit is 10 MB`); return }
    haptic(10); setFile(ready)
  }

  const toggle = (code: string) => {
    haptic(6)
    setMarks(ms => { const next = { ...ms }; if (code in next) delete next[code]; else next[code] = ''; return next })
  }
  const markOf = (v: string) => (/^\d{1,3}$/.test(v) && +v <= 100 ? +v : null)
  const picked = Object.keys(marks)
  const allMarked = picked.length > 0 && picked.every(c => markOf(marks[c]) !== null)
  const ready = !!file && allMarked

  const submit = async () => {
    if (!file || !ready) return
    setError('')
    try {
      setBusy('upload')
      const path = `${uid}/${Date.now()}.${fileExt(file)}`
      await must(supabase.storage.from('results').upload(path, file, { contentType: file.type }))
      setBusy('save')
      await must(supabase.rpc('submit_application', {
        p_results_path: path,
        p_marks: picked.map(code => ({ module_code: code, mark: markOf(marks[code]) })),
      }))
      haptic(18); invalidate(appKey(uid)); back(); toast('Application sent')
    } catch (e) { haptic(24); setError(friendlyError(e)); setBusy('') }
  }

  const loading = modules.loading || tutoring.loading

  return (
    <>
      <NavBar title="Apply to tutor" left={<BackButton />} />
      <div className="body"><div className="pad">
        <div className="sect" style={{ marginTop: 0 }}>1 · Modules you want to tutor</div>
        {loading ? <Loading /> : !open.length ? (
          <div className="note note--plain"><Icon name="clock" size={15} />
            <span>No modules are open for tutors right now. Admin opens the ones that need help most, so check back soon.</span></div>
        ) : (
          <>
            <p className="small muted" style={{ marginBottom: 10 }}>
              These are the modules that need tutors most. Tick the ones you'd like to tutor and type your final mark for each, as it appears on your results.
            </p>
            {open.length > 8 ? (
              <div className="field" style={{ marginTop: 0, marginBottom: 10 }}>
                <input type="search" placeholder="Search by code or name" value={q} onChange={e => setQ(e.target.value)} aria-label="Search modules" />
              </div>
            ) : null}
            <div className="card">
              {shown.map(m => {
                const on = m.code in marks
                const mark = on ? markOf(marks[m.code]) : null
                return (
                  <Fragment key={m.code}>
                    <button type="button" className={'pick' + (on ? ' on' : '')} aria-pressed={on} onClick={() => toggle(m.code)}>
                      <span className="pick__box">{on ? <Icon name="check" size={14} stroke={2.6} /> : null}</span>
                      <span className="rmain"><span className="rname">{m.name}</span><span className="rmeta mono">{m.code}</span></span>
                    </button>
                    {on ? (
                      <div className="pickin">
                        <span className="markin">
                          <input type="text" inputMode="numeric" maxLength={3} placeholder="—" aria-label={`Your mark for ${m.code}`} autoFocus
                            value={marks[m.code]} onChange={e => { const v = e.target.value.replace(/\D/g, ''); setMarks(ms => ({ ...ms, [m.code]: v })) }} />%
                        </span>
                        <span className="small" style={{ color: mark === null ? 'var(--muted)' : mark >= min ? 'var(--green)' : 'var(--amber)' }}>
                          {mark === null ? 'Your final mark' : mark >= min ? `Meets the ${min}% needed` : `Below the ${min}% needed`}
                        </span>
                      </div>
                    ) : null}
                  </Fragment>
                )
              })}
              {!shown.length ? <p className="small muted" style={{ padding: 14 }}>Nothing matches “{q}”.</p> : null}
            </div>
            {picked.some(c => { const v = markOf(marks[c]); return v !== null && v < min }) ? (
              <p className="small muted" style={{ marginTop: 10 }}>You need at least {min}% to tutor a module. You can still send it, but admin may not be able to accept it.</p>
            ) : null}
          </>
        )}

        <div className="sect" style={{ marginTop: 26 }}>2 · Statement of results</div>
        <input ref={input} type="file" accept="application/pdf,image/*" onChange={pick} hidden />
        {file ? (
          <div className="drop" style={{ borderStyle: 'solid', borderColor: 'var(--greenBd)', background: 'var(--greenBg)' }}>
            <span style={{ color: 'var(--green)' }}><Icon name="check" size={28} stroke={2} /></span>
            <div className="drop__t" style={{ overflowWrap: 'anywhere' }}>{file.name}</div>
            <div className="drop__h">{fSize(file.size)} · uploads when you send</div>
            <button type="button" className="btn btn--outline btn--sm drop__pick" onClick={() => input.current?.click()}>Choose a different file</button>
          </div>
        ) : (
          <div className="drop">
            <span className="muted"><Icon name="upload" size={28} /></span>
            <div className="drop__t">Add your statement of results</div>
            <div className="drop__h">The PDF from the student portal, or a clear photo. Admin checks your marks against it.</div>
            <button type="button" className="btn btn--outline btn--sm drop__pick" onClick={() => input.current?.click()}>Choose file</button>
          </div>
        )}
        {fileError ? <p className="err">{fileError}</p> : null}

        <div className="sect" style={{ marginTop: 26 }}>3 · Send</div>
        <ul className="small muted checklist">
          <li className={picked.length ? 'done' : ''}>At least one module ticked</li>
          <li className={allMarked ? 'done' : ''}>Your mark typed for each one</li>
          <li className={file ? 'done' : ''}>Results document added</li>
        </ul>
        {error ? <p className="err">{error}</p> : null}
        <button className="btn" style={{ marginTop: 16 }} disabled={!ready || !!busy} onClick={submit}>
          {busy === 'upload' ? 'Uploading document…' : busy === 'save' ? 'Sending…'
            : picked.length ? `Send application · ${picked.length} module${picked.length === 1 ? '' : 's'}` : 'Send application'}
        </button>
      </div></div>
    </>
  )
}
