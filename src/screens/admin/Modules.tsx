/* Admin → Modules. Students can add modules, so this is where typos get fixed:
   rename, hide old ones, or merge a duplicate into the right module. */

import { useMemo, useState, type FormEvent } from 'react'
import { invalidate, must, useQuery } from '../../lib/data'
import { friendlyError, supabase } from '../../lib/supabase'
import type { Module } from '../../lib/types'
import { Icon } from '../../ui/icons'
import { useOverlay } from '../../ui/Overlay'
import { BackButton, Badge, Empty, Loading, NavBar } from '../../ui/parts'
import { haptic } from '../../ui/haptic'
import { FacultyChips, useFacultyModules } from '../../ui/ModulePicker'
import { loadDemand, type Demand } from '../../lib/catalogue'

const CODE = /^[A-Z]{3,5}\d{3,4}$/

export const loadModules = () =>
  must(supabase.from('modules').select('code, name, hidden, high_risk').order('code').returns<Module[]>())

export function Modules() {
  const { openSheet } = useOverlay()
  const modules = useQuery('modules', loadModules)
  const [q, setQ] = useState('')
  const [faculty, setFaculty] = useState<string | null>(null)
  const inFaculty = useFacultyModules(faculty)

  const shown = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    return (modules.data ?? []).filter(m => (!inFaculty || inFaculty.has(m.code)) && words.every(w => `${m.code} ${m.name}`.toLowerCase().includes(w)))
  }, [modules.data, q, inFaculty])

  return (
    <>
      <NavBar title="Modules" left={<BackButton />} />
      <div className="body"><div className="pad pad--fab">
        <div className="field">
          <input type="search" placeholder="Search by code or name" value={q} onChange={e => setQ(e.target.value)} aria-label="Search modules" />
        </div>
        <div style={{ marginTop: 10 }}><FacultyChips value={faculty} onChange={setFaculty} /></div>
        <p className="small muted" style={{ margin: '10px 0 14px' }}>
          {modules.data ? `${shown.length} of ${modules.data.length} modules · from Rosebank's official list` : ' '}
        </p>
        {modules.loading ? <Loading /> : null}
        {modules.error ? <p className="err">{modules.error}</p> : null}
        {modules.data && !shown.length ? <Empty icon="book" title="No match" line="Nothing matches that search." /> : null}
        {shown.length ? (
          <div className="card">
            {shown.map(m => (
              <button className="row" key={m.code} onClick={() => openSheet(<ModuleSheet module={m} all={modules.data!} />)}>
                <span className="avatar avatar--code">{m.code.slice(0, 4)}</span>
                <span className="rmain">
                  <span className="rname" style={m.hidden ? { color: 'var(--muted)' } : undefined}>{m.name}</span>
                  <span className="rmeta mono">{m.code}</span>
                </span>
                <span className="rside">{m.hidden ? <Badge tone="plain">Hidden</Badge> : m.high_risk ? <Badge tone="red">Advertised</Badge> : null}<Icon name="chev" size={17} stroke={2.1} /></span>
              </button>
            ))}
          </div>
        ) : null}
      </div></div>
      <button className="fab fab--low" onClick={() => openSheet(<AddModuleSheet />)}>
        <Icon name="plus" size={18} stroke={2.2} /> Add module
      </button>
    </>
  )
}

function AddModuleSheet() {
  const { closeSheet, toast } = useOverlay()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const c = code.trim().toUpperCase()

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true); setError('')
    const { error: err } = await supabase.from('modules').insert({ code: c, name: name.trim() })
    setBusy(false)
    if (err) { haptic(24); setError(friendlyError(err)); return }
    haptic(14); invalidate('modules'); closeSheet(); toast(`${c} added`)
  }

  return (
    <form onSubmit={save}>
      <p className="sheet-sub">Modules</p>
      <h3 className="sheet-title">Add a module</h3>
      <div className="sheet-form">
        <div className="field">
          <label htmlFor="f-mc">Code</label>
          <input id="f-mc" className="mono" type="text" autoCapitalize="characters" placeholder="PROG6221" maxLength={8}
            value={code} onChange={e => setCode(e.target.value)} />
        </div>
        {code && !CODE.test(c) ? <p className="err">4 letters and 4 digits, e.g. PROG6221</p> : null}
        <div className="field">
          <label htmlFor="f-mn">Name</label>
          <input id="f-mn" type="text" placeholder="Programming 2A" value={name} onChange={e => setName(e.target.value)} />
        </div>
        {error ? <p className="err">{error}</p> : null}
        <button className="btn" style={{ marginTop: 16 }} disabled={busy || !CODE.test(c) || name.trim().length < 2}>
          {busy ? 'Adding…' : 'Add module'}
        </button>
      </div>
    </form>
  )
}

function ModuleSheet({ module: m, all }: { module: Module; all: Module[] }) {
  const { closeSheet, toast } = useOverlay()
  const [name, setName] = useState(m.name)
  const [into, setInto] = useState('')
  const [confirmMerge, setConfirmMerge] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const run = async (work: () => PromiseLike<{ error: unknown }>, done: string) => {
    setBusy(true); setError('')
    const { error: err } = await work()
    setBusy(false)
    if (err) { haptic(24); setError(friendlyError(err)); return }
    haptic(14); invalidate('modules'); closeSheet(); toast(done)
  }

  const target = all.find(x => x.code === into)

  return (
    <div>
      <p className="sheet-sub mono">{m.code}</p>
      <h3 className="sheet-title">{m.name}</h3>
      <div className="sheet-form">
        <form onSubmit={e => { e.preventDefault(); run(() => supabase.from('modules').update({ name: name.trim() }).eq('code', m.code), 'Name saved') }}>
          <div className="field">
            <label htmlFor="f-rn">Name</label>
            <input id="f-rn" type="text" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <button className="btn btn--navy" style={{ marginTop: 12 }} disabled={busy || name.trim().length < 2 || name.trim() === m.name}>Save name</button>
        </form>

        <button className="btn btn--outline" style={{ marginTop: 9 }} disabled={busy}
          onClick={() => run(() => supabase.from('modules').update({ hidden: !m.hidden }).eq('code', m.code), m.hidden ? 'Module shown again' : 'Module hidden')}>
          {m.hidden ? 'Show this module again' : 'Hide this module'}
        </button>
        <p className="small muted" style={{ marginTop: 8 }}>
          {m.hidden ? 'Students can pick it again once it’s shown.' : 'Hidden modules stay on existing records but students can’t pick them.'}
        </p>

        <button className="btn btn--outline" style={{ marginTop: 9 }} disabled={busy}
          onClick={() => run(() => supabase.from('modules').update({ high_risk: !m.high_risk }).eq('code', m.code), m.high_risk ? `${m.code} taken down` : `${m.code} advertised`)}>
          {m.high_risk ? 'Stop advertising for tutors' : 'Advertise for tutors'}
        </button>
        <p className="small muted" style={{ marginTop: 8 }}>
          {m.high_risk ? 'Students can apply to tutor it. Tutors already approved keep it either way.' : 'Only advertised modules are open for students to apply to tutor.'}
        </p>

        <div className="sect" style={{ marginTop: 22 }}>Merge a duplicate</div>
        <p className="small muted">If this is a typo of another module, merge it in. Everyone and everything attached moves across, then this one is removed.</p>
        <div className="field" style={{ marginTop: 10 }}>
          <label htmlFor="f-into">Merge into</label>
          <select id="f-into" value={into} onChange={e => { setInto(e.target.value); setConfirmMerge(false) }}>
            <option value="">Choose the correct module…</option>
            {all.filter(x => x.code !== m.code).map(x => <option key={x.code} value={x.code}>{x.code} · {x.name}</option>)}
          </select>
        </div>
        {confirmMerge && target ? (
          <div className="note note--amber" style={{ marginTop: 12 }}><Icon name="alert" size={15} />
            <span><b>{m.code}</b> will be removed and everything on it moved to <b>{target.code} · {target.name}</b>. This can't be undone.</span>
          </div>
        ) : null}
        {error ? <p className="err">{error}</p> : null}
        <button className={'btn ' + (confirmMerge ? 'btn--danger' : 'btn--outline')} style={{ marginTop: 12 }} disabled={busy || !into}
          onClick={() => confirmMerge
            ? run(() => supabase.rpc('merge_modules', { p_from: m.code, p_to: into }), `Merged into ${into}`)
            : (haptic(16), setConfirmMerge(true))}>
          {confirmMerge ? `Yes, merge into ${into}` : 'Merge…'}
        </button>
      </div>
    </div>
  )
}

/* Advertise: the at-risk modules students can apply to tutor (the database's "high_risk" flag).
   What's advertised now at the top, each with Remove; search below to add another.
   Removing one doesn't affect tutors already approved for it. */
export function AdvertiseModules() {
  const { toast } = useOverlay()
  const modules = useQuery('modules', loadModules)
  const demand = useQuery('module-demand', loadDemand)
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const by = useMemo(() => new Map((demand.data ?? []).map(d => [d.module_code, d])), [demand.data])
  const all = useMemo(() => (modules.data ?? []).filter(m => !m.hidden), [modules.data])
  const on = useMemo(() => all.filter(m => m.high_risk).sort((x, y) => x.code.localeCompare(y.code)), [all])
  const found = useMemo(() => {
    const words = q.toLowerCase().split(/s+/).filter(Boolean)
    if (!words.length) return []
    return all.filter(m => !m.high_risk && words.every(w => `${m.code} ${m.name}`.toLowerCase().includes(w)))
      .sort((x, y) => (by.get(y.code)?.students ?? 0) - (by.get(x.code)?.students ?? 0) || x.code.localeCompare(y.code)).slice(0, 30)
  }, [all, q, by])

  const set = async (m: Module, v: boolean) => {
    haptic(8); setBusy(m.code)
    const { error } = await supabase.from('modules').update({ high_risk: v }).eq('code', m.code)
    setBusy(null)
    if (error) { haptic(24); toast(friendlyError(error)); return }
    invalidate('modules'); toast(v ? `${m.code} advertised` : `${m.code} taken down`)
    if (v) setQ('')
  }

  return (
    <>
      <NavBar title="Advertise" left={<BackButton />} />
      <div className="body"><div className="pad">
        <p className="small muted">Students applying to tutor see only these modules, and can only apply for them.</p>
        {modules.loading ? <Loading /> : null}
        {modules.error ? <p className="err">{modules.error}</p> : null}

        <div className="sect">Advertised now · {on.length}</div>
        {modules.data && !on.length ? <p className="small muted">Nothing advertised yet, so students can't apply. Search below to add a module.</p> : null}
        {on.length ? (
          <div className="card">
            {on.map(m => (
              <div className="row" key={m.code}>
                <span className="avatar avatar--code">{m.code.slice(0, 4)}</span>
                <span className="rmain">
                  <span className="rname">{m.name}</span>
                  <span className="rmeta"><span className="mono">{m.code}</span> <DemandLine d={by.get(m.code)} /></span>
                </span>
                <span className="rside">
                  <button className="btn btn--sm btn--outline" disabled={busy === m.code} onClick={() => set(m, false)}>Remove</button>
                </span>
              </div>
            ))}
          </div>
        ) : null}

        <div className="sect">Add a module</div>
        <div className="field" style={{ marginTop: 0 }}>
          <input type="search" placeholder="Search by code or name, e.g. PROG or Accounting" value={q} onChange={e => setQ(e.target.value)} aria-label="Search modules to advertise" />
        </div>
        {q.trim() && modules.data && !found.length ? <p className="small muted" style={{ marginTop: 10 }}>Nothing else matches “{q}”.</p> : null}
        {found.length ? (
          <div className="card" style={{ marginTop: 10 }}>
            {found.map(m => (
              <div className="row" key={m.code}>
                <span className="rmain">
                  <span className="rname">{m.name}</span>
                  <span className="rmeta"><span className="mono">{m.code}</span> <DemandLine d={by.get(m.code)} /></span>
                </span>
                <span className="rside">
                  <button className="btn btn--sm" disabled={busy === m.code} onClick={() => set(m, true)}>Advertise</button>
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div></div>
    </>
  )
}

/* "· 48 students · 2 tutors" */
export function DemandLine({ d }: { d?: Demand }) {
  if (!d || (!d.students && !d.tutors)) return null
  return <span className="demand">· {d.students} student{d.students === 1 ? '' : 's'} · {d.tutors} tutor{d.tutors === 1 ? '' : 's'}</span>
}
