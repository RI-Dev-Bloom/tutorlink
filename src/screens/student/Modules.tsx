/* Student → My modules. Pick what you're taking from the shared list; if a module
   is missing, add it and it's there for every student after you. */

import { useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '../../lib/auth'
import { invalidate, must, useQuery } from '../../lib/data'
import { addModule, loadMyModules } from '../../lib/student'
import { friendlyError, supabase } from '../../lib/supabase'
import { useStack } from '../../nav/Stack'
import { Icon } from '../../ui/icons'
import { useOverlay } from '../../ui/Overlay'
import { BackButton, Empty, Loading, NavBar } from '../../ui/parts'
import { haptic } from '../../ui/haptic'
import { loadModules } from '../admin/Modules'

const CODE = /^[A-Z]{4}\d{4}$/

export function MyModulesTab() {
  const { profile } = useAuth()
  const { push } = useStack()
  const mine = useQuery(`my-modules:${profile!.id}`, () => loadMyModules(profile!.id))

  return (
    <div className="pad">
      {mine.loading ? <Loading /> : null}
      {mine.error ? <p className="err">{mine.error}</p> : null}
      {mine.data && !mine.data.length ? (
        <Empty icon="book" title="No modules yet" line="Pick the modules you're taking this semester."
          action={<button className="btn" onClick={() => push(<PickModules />)}>Pick my modules</button>} />
      ) : null}
      {mine.data?.length ? (
        <>
          <p className="small muted" style={{ marginBottom: 12 }}>{mine.data.length} module{mine.data.length === 1 ? '' : 's'} this semester</p>
          <div className="card stagger">
            {mine.data.map(m => (
              <div className="row" key={m.module_code}>
                <span className="avatar avatar--code">{m.module_code.slice(0, 4)}</span>
                <span className="rmain">
                  <span className="rname">{m.modules?.name}</span>
                  <span className="rmeta mono">{m.module_code}</span>
                </span>
              </div>
            ))}
          </div>
          <button className="btn btn--outline" style={{ marginTop: 16 }} onClick={() => push(<PickModules />)}>Change my modules</button>
        </>
      ) : null}
    </div>
  )
}

/* Tap to add or remove; saved straight away. */
function PickModules() {
  const { profile } = useAuth()
  const { openSheet, toast } = useOverlay()
  const uid = profile!.id
  const all = useQuery('modules', loadModules)
  const mine = useQuery(`my-modules:${uid}`, () => loadMyModules(uid))
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const picked = useMemo(() => new Set((mine.data ?? []).map(m => m.module_code)), [mine.data])
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (all.data ?? [])
      .filter(m => !m.hidden || picked.has(m.code))
      .filter(m => !s || m.code.toLowerCase().includes(s) || m.name.toLowerCase().includes(s))
  }, [all.data, picked, q])

  const toggle = async (code: string) => {
    if (busy) return
    haptic(8); setBusy(code)
    try {
      if (picked.has(code)) await must(supabase.from('student_modules').delete().eq('student_id', uid).eq('module_code', code))
      else await must(supabase.from('student_modules').insert({ student_id: uid, module_code: code }))
      invalidate(`my-modules:${uid}`)
    } catch (e) { haptic(24); toast(friendlyError(e)) }
    setBusy(null)
  }

  return (
    <>
      <NavBar title="Pick modules" left={<BackButton />} />
      <div className="body"><div className="pad pad--fab">
        <div className="field" style={{ marginTop: 0 }}>
          <input type="search" placeholder="Search by code or name" value={q} onChange={e => setQ(e.target.value)} aria-label="Search modules" />
        </div>
        <p className="small muted" style={{ margin: '10px 0 14px' }}>{picked.size} picked · tap to add or remove</p>
        {all.loading || mine.loading ? <Loading /> : null}
        {all.data && !shown.length ? (
          <Empty icon="book" title="Not on the list" line="Add it below and it'll be there for everyone after you." />
        ) : null}
        {shown.length ? (
          <div className="card">
            {shown.map(m => {
              const on = picked.has(m.code)
              return (
                <button className="row" key={m.code} onClick={() => toggle(m.code)} aria-pressed={on} disabled={busy === m.code}>
                  <span className="avatar avatar--code">{m.code.slice(0, 4)}</span>
                  <span className="rmain">
                    <span className="rname">{m.name}</span>
                    <span className="rmeta mono">{m.code}</span>
                  </span>
                  <span className="rside" style={{ color: on ? 'var(--green)' : 'var(--line)' }}>
                    <Icon name={on ? 'check' : 'plus'} size={19} stroke={2.2} />
                  </span>
                </button>
              )
            })}
          </div>
        ) : null}
      </div></div>
      <button className="fab fab--low" onClick={() => openSheet(<AddModuleSheet initial={q} onAdded={code => toggleOn(code)} />)}>
        <Icon name="plus" size={18} stroke={2.2} /> Module not listed?
      </button>
    </>
  )

  async function toggleOn(code: string) {
    if (picked.has(code)) return
    await toggle(code)
  }
}

/* Used by the module picker and the application form. */
export function AddModuleSheet({ initial = '', onAdded }: { initial?: string; onAdded: (code: string, name: string) => void }) {
  const { closeSheet, toast } = useOverlay()
  const looksLikeCode = CODE.test(initial.trim().toUpperCase())
  const [code, setCode] = useState(looksLikeCode ? initial.trim().toUpperCase() : '')
  const [name, setName] = useState(looksLikeCode ? '' : initial.trim())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const c = code.trim().toUpperCase()

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const added = await addModule(c, name)
      haptic(14); invalidate('modules'); closeSheet(); onAdded(added, name.trim()); toast(`${added} added`)
    } catch (err) { haptic(24); setError(friendlyError(err)); setBusy(false) }
  }

  return (
    <form onSubmit={save}>
      <p className="sheet-sub">Modules</p>
      <h3 className="sheet-title">Add a missing module</h3>
      <p className="sheet-lead">Copy the code and name exactly as they appear on your timetable or results.</p>
      <div className="sheet-form">
        <div className="field">
          <label htmlFor="f-mc">Code</label>
          <input id="f-mc" className="mono" type="text" autoCapitalize="characters" autoComplete="off" placeholder="PROG6221" maxLength={8}
            value={code} onChange={e => setCode(e.target.value)} />
        </div>
        {code && !CODE.test(c) ? <p className="err">4 letters and 4 digits, e.g. PROG6221</p> : null}
        <div className="field">
          <label htmlFor="f-mn">Name</label>
          <input id="f-mn" type="text" autoComplete="off" placeholder="Programming 2A" value={name} onChange={e => setName(e.target.value)} />
        </div>
        {error ? <p className="err">{error}</p> : null}
        <button className="btn" style={{ marginTop: 16 }} disabled={busy || !CODE.test(c) || name.trim().length < 2}>
          {busy ? 'Adding…' : 'Add module'}
        </button>
      </div>
    </form>
  )
}
