/* Admin → Modules. Students can add modules, so this is where typos get fixed:
   rename, hide old ones, or merge a duplicate into the right module. */

import { useMemo, useState, type FormEvent } from 'react'
import { invalidate, must, useQuery } from '../../lib/data'
import { friendlyError, supabase } from '../../lib/supabase'
import type { Module } from '../../lib/types'
import { Icon } from '../../ui/icons'
import { useOverlay } from '../../ui/Overlay'
import { BackButton, Badge, Empty, Loading, NavBar } from '../../ui/parts'
import { Group, SRow, Switch } from '../../ui/Settings'
import { haptic } from '../../ui/haptic'

const CODE = /^[A-Z]{4}\d{4}$/

export const loadModules = () =>
  must(supabase.from('modules').select('code, name, hidden, high_risk').order('code').returns<Module[]>())

export function Modules() {
  const { openSheet } = useOverlay()
  const modules = useQuery('modules', loadModules)
  const [q, setQ] = useState('')

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (modules.data ?? []).filter(m => !s || m.code.toLowerCase().includes(s) || m.name.toLowerCase().includes(s))
  }, [modules.data, q])

  return (
    <>
      <NavBar title="Modules" left={<BackButton />} />
      <div className="body"><div className="pad pad--fab">
        <div className="field">
          <input type="search" placeholder="Search by code or name" value={q} onChange={e => setQ(e.target.value)} aria-label="Search modules" />
        </div>
        <p className="small muted" style={{ margin: '10px 0 14px' }}>
          {modules.data ? `${modules.data.length} modules · students can add missing ones when they pick theirs` : ' '}
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
                <span className="rside">{m.hidden ? <Badge tone="plain">Hidden</Badge> : m.high_risk ? <Badge tone="red">High-risk</Badge> : null}<Icon name="chev" size={17} stroke={2.1} /></span>
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
          onClick={() => run(() => supabase.from('modules').update({ high_risk: !m.high_risk }).eq('code', m.code), m.high_risk ? `${m.code} closed for tutoring` : `${m.code} is open for tutoring`)}>
          {m.high_risk ? 'Not high-risk any more' : 'Mark as high-risk'}
        </button>
        <p className="small muted" style={{ marginTop: 8 }}>
          {m.high_risk ? 'Students can apply to tutor it. Tutors already approved keep it either way.' : 'Only high-risk modules are open for students to apply to tutor.'}
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

/* Settings → High-risk modules: the only ones students can apply to tutor. One switch each. */
export function HighRiskModules() {
  const { toast } = useOverlay()
  const modules = useQuery('modules', loadModules)
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const all = (modules.data ?? []).filter(m => !m.hidden)
  const on = all.filter(m => m.high_risk)
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return all.filter(m => !s || m.code.toLowerCase().includes(s) || m.name.toLowerCase().includes(s))
      .sort((a, b) => Number(b.high_risk) - Number(a.high_risk) || a.code.localeCompare(b.code))
  }, [all, q])

  const flip = async (m: Module, v: boolean) => {
    setBusy(m.code)
    const { error } = await supabase.from('modules').update({ high_risk: v }).eq('code', m.code)
    setBusy(null)
    if (error) { haptic(24); toast(friendlyError(error)); return }
    invalidate('modules')
  }

  return (
    <>
      <NavBar title="High-risk modules" left={<BackButton />} />
      <div className="body"><div className="pad">
        <p className="small muted">Students can only apply to tutor the modules switched on here. Turning one off doesn't affect tutors already approved for it.</p>
        <div className="field" style={{ marginTop: 14 }}>
          <input type="search" placeholder="Search by code or name" value={q} onChange={e => setQ(e.target.value)} aria-label="Search modules" />
        </div>
        {modules.loading ? <Loading /> : null}
        {modules.error ? <p className="err">{modules.error}</p> : null}
        {modules.data && !shown.length ? <Empty icon="book" title="No match" line="Nothing matches that search." /> : null}
        {shown.length ? (
          <Group title={`${on.length} open for tutoring`}>
            {shown.map(m => (
              <SRow key={m.code} label={m.name} sub={<span className="mono">{m.code}</span>}
                right={<Switch on={m.high_risk} disabled={busy === m.code} onChange={v => flip(m, v)} label={`${m.code} high-risk`} />} />
            ))}
          </Group>
        ) : null}
      </div></div>
    </>
  )
}
