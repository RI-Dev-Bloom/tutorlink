/* Student → My modules. They come from the student's qualification and year, for this
   semester (added when they signed up); here they tick or untick, pick electives, or find a
   module from another qualification (e.g. one they're repeating). The list itself is admin's. */

import { useMemo, useState } from 'react'
import { useAuth } from '../../lib/auth'
import { inTerm, loadQualificationModules, loadQualifications, shortQual, termLabel, useTerm } from '../../lib/catalogue'
import { invalidate, must, useQuery } from '../../lib/data'
import { loadMyModules } from '../../lib/student'
import { friendlyError, supabase } from '../../lib/supabase'
import { useStack } from '../../nav/Stack'
import { Icon } from '../../ui/icons'
import { useOverlay } from '../../ui/Overlay'
import { BackButton, Badge, Empty, Loading, NavBar } from '../../ui/parts'
import { QualificationSheet } from '../../ui/Qualification'
import { haptic } from '../../ui/haptic'
import { loadModules } from '../admin/Modules'

export function MyModulesTab() {
  const { profile } = useAuth()
  const { push } = useStack()
  const { openSheet } = useOverlay()
  const mine = useQuery(`my-modules:${profile!.id}`, () => loadMyModules(profile!.id))
  const quals = useQuery('qualifications', loadQualifications)
  const qual = (quals.data ?? []).find(q => q.code === profile!.qualification_code)
  const term = useTerm()
  const now = (mine.data ?? []).filter(m => inTerm(m.module_code, term))
  const other = (mine.data ?? []).filter(m => !inTerm(m.module_code, term))
  const Item = ({ m }: { m: (typeof now)[number] }) => (
    <div className="row">
      <span className="avatar avatar--code">{m.module_code.slice(0, 4)}</span>
      <span className="rmain">
        <span className="rname">{m.modules?.name}</span>
        <span className="rmeta"><span className="mono">{m.module_code}</span> · {termLabel(m.module_code)}</span>
      </span>
    </div>
  )

  return (
    <div className="pad">
      <button className="row card" style={{ marginBottom: 16 }} onClick={() => { haptic(8); openSheet(<QualificationSheet />) }}>
        <span className="avatar"><Icon name="cap" size={18} /></span>
        <span className="rmain">
          <span className="rname">{qual ? shortQual(qual.name) : 'Choose your qualification'}</span>
          <span className="rmeta">{qual ? <><span className="mono">{qual.code}</span>{profile!.study_year ? ` · Year ${profile!.study_year}` : ''}</> : 'Your modules come from it'}</span>
        </span>
        <span className="rside small" style={{ color: 'var(--goldD)', fontWeight: 600 }}>Change</span>
      </button>

      {mine.loading ? <Loading /> : null}
      {mine.error ? <p className="err">{mine.error}</p> : null}
      {mine.data && !mine.data.length ? (
        <Empty icon="book" title="No modules yet" line="Pick the modules you're taking this semester."
          action={<button className="btn" onClick={() => push(<PickModules />)}>Pick my modules</button>} />
      ) : null}
      {mine.data?.length ? (
        <>
          <p className="small muted" style={{ marginBottom: 12 }}>{now.length} module{now.length === 1 ? '' : 's'} this semester (semester {term})</p>
          {now.length ? <div className="card stagger">{now.map(m => <Item key={m.module_code} m={m} />)}</div> : null}
          {other.length ? (
            <>
              <div className="sect">Not this semester</div>
              <div className="card">{other.map(m => <Item key={m.module_code} m={m} />)}</div>
              <p className="small muted" style={{ marginTop: 8 }}>Not taking these now? Remove them under Change my modules.</p>
            </>
          ) : null}
          <button className="btn btn--outline" style={{ marginTop: 16 }} onClick={() => push(<PickModules />)}>Change my modules</button>
        </>
      ) : null}
    </div>
  )
}

/* Tap to add or remove; saved straight away. Their qualification's modules first, by year. */
function PickModules() {
  const { profile } = useAuth()
  const { toast } = useOverlay()
  const uid = profile!.id
  const term = useTerm()
  const qcode = profile!.qualification_code
  const all = useQuery('modules', loadModules)
  const theirs = useQuery(`qual-modules:${qcode ?? ''}`, () => qcode ? loadQualificationModules(qcode) : Promise.resolve([]))
  const mine = useQuery(`my-modules:${uid}`, () => loadMyModules(uid))
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const picked = useMemo(() => new Set((mine.data ?? []).map(m => m.module_code)), [mine.data])
  const byYear = useMemo(() => {
    const years = [...new Set((theirs.data ?? []).map(m => m.year ?? 1))].sort()
    return years.map(y => ({ year: y, items: (theirs.data ?? []).filter(m => (m.year ?? 1) === y)
      .sort((a, b) => Number(inTerm(b.module_code, term)) - Number(inTerm(a.module_code, term))) }))
  }, [theirs.data, term])
  const search = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    if (!words.length) return []
    return (all.data ?? []).filter(m => !m.hidden && words.every(w => `${m.code} ${m.name}`.toLowerCase().includes(w))).slice(0, 40)
  }, [all.data, q])

  const toggle = async (code: string) => {
    if (busy) return
    haptic(8); setBusy(code)
    try {
      if (picked.has(code)) await must(supabase.from('student_modules').delete().eq('student_id', uid).eq('module_code', code))
      else await must(supabase.from('student_modules').insert({ student_id: uid, module_code: code }))
      invalidate(`my-modules:${uid}`, 'my-attendance')
    } catch (e) { haptic(24); toast(friendlyError(e)) }
    setBusy(null)
  }

  const Row = ({ code, name, elective }: { code: string; name: string; elective?: boolean }) => {
    const on = picked.has(code)
    const later = !inTerm(code, term)
    return (
      <button className={'pick' + (on ? ' on' : '')} onClick={() => toggle(code)} aria-pressed={on} disabled={busy === code}>
        <span className="pick__box">{on ? <Icon name="check" size={14} stroke={2.6} /> : null}</span>
        <span className="rmain"><span className="rname">{name}</span><span className="rmeta"><span className="mono">{code}</span> · {termLabel(code)}</span></span>
        {elective || later ? <span className="rside">{later ? <Badge tone="slate">Other semester</Badge> : <Badge tone="plain">Elective</Badge>}</span> : null}
      </button>
    )
  }

  return (
    <>
      <NavBar title="My modules" left={<BackButton />} />
      <div className="body"><div className="pad">
        <div className="field" style={{ marginTop: 0 }}>
          <input type="search" placeholder="Find any module by code or name" value={q} onChange={e => setQ(e.target.value)} aria-label="Search modules" />
        </div>
        <p className="small muted" style={{ margin: '10px 0 4px' }}>{(mine.data ?? []).filter(m => inTerm(m.module_code, term)).length} picked for semester {term} · tap to add or remove</p>
        {all.loading || mine.loading || theirs.loading ? <Loading /> : null}

        {q.trim() ? (
          search.length ? (
            <div className="card" style={{ marginTop: 10 }}>{search.map(m => <Row key={m.code} code={m.code} name={m.name} />)}</div>
          ) : <Empty icon="book" title="Not on the list" line="Ask admin to add it." />
        ) : byYear.length ? byYear.map(g => (
          <div key={g.year}>
            <div className="sect">Year {g.year}{profile!.study_year === g.year ? ' · your year' : ''}</div>
            <div className="card">{g.items.map(m => <Row key={m.module_code} code={m.module_code} name={m.modules?.name ?? m.module_code} elective={m.elective} />)}</div>
          </div>
        )) : <p className="small muted" style={{ marginTop: 12 }}>Choose your qualification first, or search above.</p>}
      </div></div>
    </>
  )
}
