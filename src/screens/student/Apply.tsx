/* Student → Apply to tutor. Upload your statement of results, type in the marks,
   tick the modules you'd like to tutor, send. Then follow it here until admin decides. */

import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useAuth } from '../../lib/auth'
import { invalidate, must, useQuery } from '../../lib/data'
import { ACCEPTED, fSize, fileExt, prepareUpload } from '../../lib/files'
import { isOpen, loadMyApplication, loadMyTutorModules, loadSettings, type MyApplication } from '../../lib/student'
import { friendlyError, supabase } from '../../lib/supabase'
import type { Module } from '../../lib/types'
import { useStack } from '../../nav/Stack'
import { Icon } from '../../ui/icons'
import { useOverlay } from '../../ui/Overlay'
import { BackButton, Badge, Loading, NavBar } from '../../ui/parts'
import { haptic } from '../../ui/haptic'
import { loadModules } from '../admin/Modules'
import { AddModuleSheet } from './Modules'

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
          ['check', `At least ${min}% in the module`, 'For each module you want to tutor'],
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

type Row = { code: string; name: string; mark: string; applying: boolean }

function ApplyForm() {
  const { profile } = useAuth()
  const { back } = useStack()
  const { openSheet, toast } = useOverlay()
  const uid = profile!.id
  const settings = useQuery('settings', loadSettings)
  const min = settings.data?.min_mark ?? 75
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [busy, setBusy] = useState<'' | 'upload' | 'save'>('')
  const [error, setError] = useState('')

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

  const set = (code: string, patch: Partial<Row>) => setRows(rs => rs.map(r => r.code === code ? { ...r, ...patch } : r))
  const addRow = (m: Pick<Module, 'code' | 'name'>) =>
    setRows(rs => rs.some(r => r.code === m.code) ? rs : [...rs, { code: m.code, name: m.name, mark: '', applying: false }])

  const markOf = (r: Row) => (/^\d{1,3}$/.test(r.mark) && +r.mark <= 100 ? +r.mark : null)
  const canTutor = (r: Row) => (markOf(r) ?? -1) >= min
  const complete = rows.length > 0 && rows.every(r => markOf(r) !== null)
  const tutoring = rows.filter(r => r.applying && canTutor(r))
  const ready = !!file && complete && tutoring.length > 0

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
        p_marks: rows.map(r => ({ module_code: r.code, mark: markOf(r), applying: r.applying && canTutor(r) })),
      }))
      haptic(18); invalidate(appKey(uid)); back(); toast('Application sent')
    } catch (e) { haptic(24); setError(friendlyError(e)); setBusy('') }
  }

  return (
    <>
      <NavBar title="Apply to tutor" left={<BackButton />} />
      <div className="body"><div className="pad">
        <div className="sect" style={{ marginTop: 0 }}>1 · Statement of results</div>
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
            <div className="drop__h">The PDF from the student portal, or a clear photo</div>
            <button type="button" className="btn btn--outline btn--sm drop__pick" onClick={() => input.current?.click()}>Choose file</button>
          </div>
        )}
        {fileError ? <p className="err">{fileError}</p> : null}

        <div className="sect" style={{ marginTop: 26 }}>2 · Your marks</div>
        <p className="small muted" style={{ marginBottom: 10 }}>
          Add the modules on your results and type each final mark. Admin checks them against the document.
        </p>
        {rows.length ? (
          <div className="card">
            {rows.map(r => {
              const ok = canTutor(r)
              return (
                <div className="row" key={r.code} style={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 8 }}>
                  <span className="rmain">
                    <span className="rname mono" style={{ fontSize: 13 }}>{r.code}</span>
                    <span className="rmeta">{r.name}</span>
                  </span>
                  <span className="rside" style={{ gap: 8 }}>
                    <span className="markin">
                      <input type="text" inputMode="numeric" maxLength={3} placeholder="—" aria-label={`Mark for ${r.code}`}
                        value={r.mark} onChange={e => set(r.code, { mark: e.target.value.replace(/\D/g, '') })} />%
                    </span>
                    <button type="button" className="iconbtn" aria-label={`Remove ${r.code}`}
                      onClick={() => setRows(rs => rs.filter(x => x.code !== r.code))}><Icon name="x" size={16} /></button>
                  </span>
                  <span style={{ flexBasis: '100%', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button type="button" className={'chip chip--sm' + (r.applying && ok ? ' on' : '')} disabled={!ok}
                      aria-pressed={r.applying && ok} onClick={() => { haptic(6); set(r.code, { applying: !r.applying }) }}>
                      {r.applying && ok ? <><Icon name="check" size={13} stroke={2.4} /> Tutoring this</> : 'I want to tutor this'}
                    </button>
                    {markOf(r) !== null && !ok ? <span className="small muted">Needs {min}% to tutor</span> : null}
                  </span>
                </div>
              )
            })}
          </div>
        ) : null}
        <button type="button" className="btn btn--outline" style={{ marginTop: 12 }}
          onClick={() => openSheet(<PickModuleSheet exclude={rows.map(r => r.code)} onPick={addRow} />)}>
          <Icon name="plus" size={17} stroke={2.2} /> Add a module from your results
        </button>

        <div className="sect" style={{ marginTop: 26 }}>3 · Send</div>
        <ul className="small muted checklist">
          <li className={file ? 'done' : ''}>Results document added</li>
          <li className={complete ? 'done' : ''}>A mark for every module listed</li>
          <li className={tutoring.length ? 'done' : ''}>At least one module to tutor ({min}% or more)</li>
        </ul>
        {error ? <p className="err">{error}</p> : null}
        <button className="btn" style={{ marginTop: 16 }} disabled={!ready || !!busy} onClick={submit}>
          {busy === 'upload' ? 'Uploading document…' : busy === 'save' ? 'Sending…'
            : tutoring.length ? `Send application · ${tutoring.length} module${tutoring.length === 1 ? '' : 's'}` : 'Send application'}
        </button>
      </div></div>
    </>
  )
}

/* Search the shared list; add a missing module on the spot. */
function PickModuleSheet({ exclude, onPick }: { exclude: string[]; onPick: (m: Pick<Module, 'code' | 'name'>) => void }) {
  const { openSheet, closeSheet } = useOverlay()
  const all = useQuery('modules', loadModules)
  const [q, setQ] = useState('')
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (all.data ?? []).filter(m => !m.hidden && !exclude.includes(m.code)
      && (!s || m.code.toLowerCase().includes(s) || m.name.toLowerCase().includes(s))).slice(0, 40)
  }, [all.data, exclude, q])

  const choose = (m: Pick<Module, 'code' | 'name'>) => { haptic(8); onPick(m); closeSheet() }

  return (
    <div>
      <p className="sheet-sub">Your marks</p>
      <h3 className="sheet-title">Which module?</h3>
      <div className="field">
        <input type="search" placeholder="Search by code or name" value={q} onChange={e => setQ(e.target.value)} aria-label="Search modules" />
      </div>
      <div className="card" style={{ marginTop: 12, maxHeight: '42vh', overflowY: 'auto' }}>
        {all.loading ? <Loading /> : null}
        {shown.map(m => (
          <button className="row" key={m.code} onClick={() => choose(m)}>
            <span className="rmain"><span className="rname">{m.name}</span><span className="rmeta mono">{m.code}</span></span>
            <span className="rside"><Icon name="plus" size={17} stroke={2.2} /></span>
          </button>
        ))}
        {all.data && !shown.length ? <p className="small muted" style={{ padding: 14 }}>Nothing matches “{q}”.</p> : null}
      </div>
      <button className="btn btn--ghost" style={{ marginTop: 10 }}
        onClick={() => openSheet(<AddModuleSheet initial={q} onAdded={(code, name) => onPick({ code, name })} />)}>
        Not listed? Add it
      </button>
    </div>
  )
}
