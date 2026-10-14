/* Picking modules out of ~600: the picked ones as chips (tap to drop), then a search with a
   faculty filter. Used where admin sets the modules a lecturer teaches. */

import { useMemo, useState } from 'react'
import { facultiesOf, loadLinks, loadQualifications } from '../lib/catalogue'
import { useQuery } from '../lib/data'
import { loadModules } from '../screens/admin/Modules'
import { Icon } from './icons'
import { Loading } from './parts'
import { haptic } from './haptic'

/* The module codes taught in a faculty's qualifications (null = no filter). */
export function useFacultyModules(faculty: string | null) {
  const quals = useQuery('qualifications', loadQualifications)
  const links = useQuery('qual-links', loadLinks)
  return useMemo(() => {
    if (!faculty) return null
    const codes = new Set((quals.data ?? []).filter(x => x.faculty === faculty).map(x => x.code))
    return new Set((links.data ?? []).filter(l => codes.has(l.qualification_code)).map(l => l.module_code))
  }, [faculty, quals.data, links.data])
}

export function FacultyChips({ value, onChange }: { value: string | null; onChange: (f: string | null) => void }) {
  const quals = useQuery('qualifications', loadQualifications)
  return (
    <div className="chips chips--scroll">
      <button type="button" className={'chip chip--sm' + (!value ? ' on' : '')} onClick={() => { haptic(6); onChange(null) }}>All</button>
      {facultiesOf(quals.data ?? []).map(f => (
        <button type="button" key={f} className={'chip chip--sm' + (value === f ? ' on' : '')} onClick={() => { haptic(6); onChange(value === f ? null : f) }}>{f}</button>
      ))}
    </div>
  )
}

export function ModulePicker({ value, onChange }: { value: string[]; onChange: (codes: string[]) => void }) {
  const modules = useQuery('modules', loadModules)
  const [q, setQ] = useState('')
  const [faculty, setFaculty] = useState<string | null>(null)
  const inFaculty = useFacultyModules(faculty)

  const name = (code: string) => modules.data?.find(m => m.code === code)?.name ?? ''
  const results = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    if (!words.length && !inFaculty) return []
    return (modules.data ?? [])
      .filter(m => !m.hidden && !value.includes(m.code) && (!inFaculty || inFaculty.has(m.code)))
      .filter(m => words.every(w => `${m.code} ${m.name}`.toLowerCase().includes(w)))
      .slice(0, 30)
  }, [modules.data, q, inFaculty, value])

  const toggle = (code: string) => { haptic(6); onChange(value.includes(code) ? value.filter(c => c !== code) : [...value, code]) }

  return (
    <div>
      {value.length ? (
        <div className="chips">
          {value.map(c => (
            <button type="button" key={c} className="chip on" onClick={() => toggle(c)} aria-label={`Remove ${c}`}>
              <span className="code">{c}</span>{name(c)}<Icon name="x" size={12} stroke={2.4} />
            </button>
          ))}
        </div>
      ) : <p className="small muted">None yet. Search below.</p>}

      <div className="field" style={{ marginTop: 12 }}>
        <input type="search" placeholder="Search by code or name, e.g. PROG" value={q} onChange={e => setQ(e.target.value)} aria-label="Search modules" />
      </div>
      <div style={{ marginTop: 8 }}><FacultyChips value={faculty} onChange={setFaculty} /></div>

      {modules.loading ? <Loading /> : null}
      {results.length ? (
        <div className="card" style={{ marginTop: 10, maxHeight: '44vh', overflowY: 'auto' }}>
          {results.map(m => (
            <button type="button" key={m.code} className="pick" onClick={() => toggle(m.code)}>
              <span className="pick__box" />
              <span className="rmain"><span className="rname">{m.name}</span><span className="rmeta mono">{m.code}</span></span>
            </button>
          ))}
        </div>
      ) : q.trim() ? <p className="small muted" style={{ marginTop: 10 }}>Nothing matches “{q}”.</p> : null}
    </div>
  )
}
