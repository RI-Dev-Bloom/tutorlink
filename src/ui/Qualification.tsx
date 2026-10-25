/* A student's qualification and year of study. Picking them adds that year's modules for this semester
   (electives, like a home language, they tick themselves under Modules).
   Used when they first sign up, in Profile, and at a first check-in. */

import { useMemo, useState } from 'react'
import { useAuth } from '../lib/auth'
import { facultiesOf, inTerm, loadQualificationModules, loadQualifications, shortQual, useTerm, yearsIn, type Term } from '../lib/catalogue'
import { invalidate, must, useQuery } from '../lib/data'
import { friendlyError, supabase } from '../lib/supabase'
import { Icon } from './icons'
import { useOverlay } from './Overlay'
import { Loading } from './parts'
import { haptic } from './haptic'

export type Study = { qualification: string | null; year: number | null }

export function StudyPicker({ value, onChange }: { value: Study; onChange: (s: Study) => void }) {
  const all = useQuery('qualifications', loadQualifications)
  const [q, setQ] = useState('')
  const [browsing, setBrowsing] = useState(!value.qualification)
  const chosen = (all.data ?? []).find(x => x.code === value.qualification)
  const mods = useQuery(`qual-modules:${value.qualification ?? ''}`, () => value.qualification ? loadQualificationModules(value.qualification) : Promise.resolve([]))
  const term = useTerm()
  const years = yearsIn(mods.data ?? [])
  const adds = (mods.data ?? []).filter(m => m.year === value.year && !m.elective && inTerm(m.module_code, term))
  const electives = (mods.data ?? []).filter(m => m.year === value.year && m.elective && inTerm(m.module_code, term)).length

  const groups = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    const list = (all.data ?? []).filter(x => !x.hidden && words.every(w => `${x.code} ${x.name} ${x.faculty ?? ''}`.toLowerCase().includes(w)))
    return facultiesOf(all.data ?? []).map(f => ({ faculty: f, items: list.filter(x => x.faculty === f) })).filter(g => g.items.length)
  }, [all.data, q])

  if (!browsing && chosen) return (
    <div>
      <button type="button" className="pick on" style={{ border: '1px solid var(--line)', borderRadius: 'var(--r)', background: 'var(--card)' }}
        onClick={() => { haptic(6); setBrowsing(true) }}>
        <span className="pick__box pick__box--round"><Icon name="check" size={14} stroke={2.6} /></span>
        <span className="rmain"><span className="rname">{shortQual(chosen.name)}</span><span className="rmeta"><span className="mono">{chosen.code}</span> · {chosen.faculty} · tap to change</span></span>
      </button>
      <div className="field"><label>Year of study</label>
        <div className="seg">
          {Array.from({ length: years }, (_, i) => i + 1).map(y => (
            <button type="button" key={y} className={value.year === y ? 'on' : ''} onClick={() => { haptic(6); onChange({ ...value, year: y }) }}>Year {y}</button>
          ))}
        </div>
      </div>
      {value.year ? (
        mods.loading ? <Loading /> : (
          <div className="adds">
            <p className="small muted">This semester's {adds.length} modules are added for you:</p>
            <div className="chips" style={{ marginTop: 8 }}>
              {adds.map(m => <span key={m.module_code} className="chip chip--static chip--sm"><span className="code">{m.module_code}</span>{m.modules?.name}</span>)}
            </div>
            {electives ? <p className="small muted" style={{ marginTop: 8 }}>Plus {electives} elective{electives === 1 ? '' : 's'} (e.g. a language): tick yours under Modules.</p> : null}
          </div>
        )
      ) : null}
    </div>
  )

  return (
    <div>
      <div className="field" style={{ marginTop: 0 }}>
        <input type="search" placeholder="Search, e.g. software, BCom, DISD" value={q} onChange={e => setQ(e.target.value)} aria-label="Search qualifications" />
      </div>
      <div className="card" style={{ marginTop: 10, maxHeight: '46vh', overflowY: 'auto' }}>
        {all.loading ? <Loading /> : null}
        {groups.map(g => (
          <div key={g.faculty}>
            <p className="group-head">{g.faculty}</p>
            {g.items.map(x => (
              <button type="button" key={x.code} className={'pick' + (value.qualification === x.code ? ' on' : '')}
                onClick={() => { haptic(8); setBrowsing(false); onChange({ qualification: x.code, year: value.qualification === x.code ? value.year : 1 }) }}>
                <span className="pick__box pick__box--round">{value.qualification === x.code ? <Icon name="check" size={14} stroke={2.6} /> : null}</span>
                <span className="rmain"><span className="rname">{shortQual(x.name)}</span><span className="rmeta mono">{x.code}</span></span>
              </button>
            ))}
          </div>
        ))}
        {all.data && !groups.length ? <p className="small muted" style={{ padding: 14 }}>Nothing matches “{q}”.</p> : null}
      </div>
    </div>
  )
}

/* Saves through the database: sets the qualification and year, and adds that year's modules for
   this semester. (Any from the other semester that came with the year are taken off again here,
   for as long as the database still adds the whole year.) */
export async function saveStudy(s: Study, term: Term) {
  const added = (await must(supabase.rpc('set_my_study', { p_qualification: s.qualification, p_year: s.year }))) as number
  const other = (await loadQualificationModules(s.qualification!))
    .filter(m => m.year === s.year && !inTerm(m.module_code, term)).map(m => m.module_code)
  const { data: { user } } = await supabase.auth.getUser()
  if (!other.length || !user) return added
  const gone = (await must(supabase.from('student_modules').delete().eq('student_id', user.id).in('module_code', other).select('module_code'))) ?? []
  return Math.max(0, added - gone.length)
}

/* As a sheet, from Profile or a first check-in. */
export function QualificationSheet({ onDone }: { onDone?: () => void }) {
  const { profile, reloadProfile } = useAuth()
  const { closeSheet, toast } = useOverlay()
  const term = useTerm()
  const [study, setStudy] = useState<Study>({ qualification: profile?.qualification_code ?? null, year: profile?.study_year ?? null })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const unchanged = study.qualification === profile?.qualification_code && study.year === profile?.study_year

  const save = async () => {
    if (!study.qualification || !study.year) return
    setBusy(true); setError('')
    try {
      const added = await saveStudy(study, term)
      haptic(14); await reloadProfile(); invalidate('my-modules', 'my-attendance')
      closeSheet(); toast(added ? `Saved · ${added} module${added === 1 ? '' : 's'} added` : 'Saved'); onDone?.()
    } catch (e) { haptic(24); setError(friendlyError(e)); setBusy(false) }
  }

  return (
    <div>
      <p className="sheet-sub">Recorded with every check-in</p>
      <h3 className="sheet-title">Your qualification</h3>
      <div className="sheet-form">
        <StudyPicker value={study} onChange={setStudy} />
        {error ? <p className="err">{error}</p> : null}
        <button className="btn" style={{ marginTop: 16 }} disabled={busy || !study.qualification || !study.year || unchanged} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
        <p className="small muted" style={{ marginTop: 8 }}>Modules you already have stay. Remove any under Modules.</p>
      </div>
    </div>
  )
}
