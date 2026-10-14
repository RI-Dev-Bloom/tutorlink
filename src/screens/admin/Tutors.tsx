/* Admin → Tutors: everyone approved to tutor, how much of their quota they've used,
   and what's waiting to be confirmed. */

import { useMemo, useState } from 'react'
import { useQuery } from '../../lib/data'
import { counts, currentSemester, loadOpenSessions, loadOverrides, loadSemesters, loadTutors, needsConfirming, earned } from '../../lib/tutors'
import { rand } from '../../lib/types'
import { useStack } from '../../nav/Stack'
import { Icon } from '../../ui/icons'
import { Badge, Empty, Loading, initials } from '../../ui/parts'
import { TutorDetail } from './TutorDetail'

export function AdminTutors() {
  const { push } = useStack()
  const tutors = useQuery('tutors', loadTutors)
  const semesters = useQuery('semesters', loadSemesters)
  const sem = semesters.data ? currentSemester(semesters.data) : null
  const semId = sem?.id ?? null
  const sessions = useQuery(`sessions:open:${semId}`, () => loadOpenSessions(semId))
  const overrides = useQuery(`overrides:${semId}`, () => (semId ? loadOverrides(semId) : Promise.resolve([])))
  const [q, setQ] = useState('')

  const rows = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    return (tutors.data ?? []).filter(t => {
      const hay = [t.full_name, t.student_number, t.email, ...t.tutor_modules.map(m => m.module_code)].join(' ').toLowerCase()
      return words.every(w => hay.includes(w))
    }).map(t => {
      const mine = (sessions.data ?? []).filter(s => s.tutor_id === t.id)
      const limit = (overrides.data ?? []).find(o => o.tutor_id === t.id)?.session_quota ?? sem?.session_quota ?? 0
      return {
        t,
        used: mine.filter(s => counts(s, semId)).length,
        limit,
        toConfirm: mine.filter(needsConfirming).length,
        earned: earned(mine, sem?.id ?? null),
      }
    })
  }, [tutors.data, sessions.data, overrides.data, sem, semId, q])

  return (
    <div className="pad stagger">
      {tutors.data?.length ? (
        <div className="field" style={{ marginTop: 0, marginBottom: 12 }}>
          <input type="search" placeholder="Search by name, student number or module" value={q} onChange={e => setQ(e.target.value)} aria-label="Search tutors" />
        </div>
      ) : null}
      {sem ? <p className="small muted" style={{ marginBottom: 12 }}>{sem.name} · {sem.session_quota} sessions per tutor</p> : null}
      {semesters.data && !sem ? (
        <div className="note note--amber" style={{ marginBottom: 12 }}><Icon name="alert" size={15} />
          <span>No semester yet. Add one in Settings so sessions can be scheduled.</span></div>
      ) : null}
      {tutors.loading ? <Loading /> : null}
      {tutors.error ? <p className="err">{tutors.error}</p> : null}
      {tutors.data && !tutors.data.length ? (
        <Empty icon="people" title="No tutors yet" line="Approve an application and the student shows up here." />
      ) : null}
      {tutors.data?.length && !rows.length ? <Empty icon="people" title="No match" line="Nothing matches that search." /> : null}
      {rows.length ? (
        <div className="card">
          {rows.map(({ t, used, limit, toConfirm, earned: money }) => (
            <button className="row" key={t.id} onClick={() => push(<TutorDetail id={t.id} />)}>
              <span className="avatar">{initials(t.full_name)}</span>
              <span className="rmain">
                <span className="rname">{t.full_name}</span>
                <span className="rmeta mono">{t.tutor_modules.map(m => m.module_code).join(' · ')}</span>
                {sem ? <span className="rmeta">{used} of {limit} sessions{money ? ` · ${rand(money)} earned` : ''}</span> : null}
              </span>
              <span className="rside">
                {toConfirm ? <Badge tone="amber">{toConfirm} to confirm</Badge> : null}
                {sem && limit && used >= limit ? <Badge tone="red">Limit reached</Badge> : null}
                <Icon name="chev" size={17} stroke={2.1} />
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
