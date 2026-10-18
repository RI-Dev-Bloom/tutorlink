/* Tutor → Pay. Pay works per semester: each session admin confirms counts towards the total,
   and Rosebank pays it all once the semester has ended. Plus a statement and earlier semesters. */

import { useState } from 'react'
import { useAuth } from '../../lib/auth'
import { useQuery } from '../../lib/data'
import { earned, estimate, fDay, isEarned, loadSemesters, totalHours } from '../../lib/tutors'
import { fDate, rand, todayISO } from '../../lib/types'
import { Icon } from '../../ui/icons'
import { Ledger } from '../../ui/Ledger'
import { useOverlay } from '../../ui/Overlay'
import { Badge, Loading } from '../../ui/parts'
import { haptic } from '../../ui/haptic'
import { friendlyError } from '../../lib/supabase'
import { loadModules } from '../admin/Modules'
import { useMine } from './mine'

export function TutorPay() {
  const { profile } = useAuth()
  const { toast } = useOverlay()
  const m = useMine()
  const semesters = useQuery('semesters', loadSemesters)
  const modules = useQuery('modules', loadModules)
  const [busy, setBusy] = useState(false)

  if (m.loading) return <Loading />
  if (m.error || !m.d) return <p className="err pad">{m.error}</p>

  const today = todayISO()
  const semId = m.sem?.id ?? null
  const mine = m.d.sessions.filter(s => s.semester_id === semId)
  const confirmed = mine.filter(isEarned)
  const waiting = mine.filter(s => s.status === 'logged' || (s.status === 'scheduled' && s.session_date < today))
  const ahead = mine.filter(s => s.status === 'scheduled' && s.session_date >= today)
  const statement = [...confirmed].sort((a, b) => b.session_date.localeCompare(a.session_date))
  const ended = !!m.sem && m.sem.ends_on < today

  // Earlier semesters: one line each with what was earned.
  const earlier = (semesters.data ?? [])
    .filter(s => s.id !== semId && s.ends_on < today)
    .map(s => ({ s, total: earned(m.d!.sessions, s.id), n: m.d!.sessions.filter(x => x.semester_id === s.id && isEarned(x)).length }))
    .filter(x => x.n)

  const download = async () => {
    setBusy(true)
    try {
      const { downloadStatement } = await import('../../lib/statement-pdf')
      const names = new Map((modules.data ?? []).map(x => [x.code, x.name]))
      await downloadStatement({
        tutor: profile!.full_name, studentNumber: profile!.student_number,
        semester: m.sem?.name ?? 'This semester', startsOn: m.sem?.starts_on ?? null, endsOn: m.sem?.ends_on ?? null,
        ratePerHour: m.rate, waiting: { n: waiting.length, amount: estimate(waiting, m.rate) },
        moduleName: code => names.get(code) ?? '',
      }, statement)
      haptic(12); toast('Statement downloaded')
    } catch (e) { haptic(24); toast(friendlyError(e)) }
    setBusy(false)
  }

  return (
    <div className="pad stagger">
      <Ledger
        label={m.sem ? `Your pay · ${m.sem.name}` : 'Your pay this semester'}
        confirmed={{ n: confirmed.length, amount: earned(mine, semId) }}
        waiting={{ n: waiting.length, amount: estimate(waiting, m.rate) }}
        ahead={{ n: ahead.length, amount: estimate(ahead, m.rate) }}
        foot={<p className="ledger__foot"><Icon name="cal" size={14} />
          {!m.sem ? 'Paid out once the semester ends.'
            : ended ? `The semester ended on ${fDate(m.sem.ends_on)}. Rosebank pays out the confirmed total.`
            : `Paid out in one go after the semester ends on ${fDate(m.sem.ends_on)}.`}</p>} />

      <p className="small muted" style={{ marginTop: 10 }}>
        {rand(m.rate)} per hour · {totalHours(confirmed)} hours confirmed so far. A session counts once admin confirms it, which needs enough students checked in.
      </p>

      <div className="sect">Confirmed this semester</div>
      {statement.length ? (
        <div className="card">
          {statement.map(s => (
            <div className="row" key={s.id}>
              <span className="avatar avatar--code">{s.module_code.slice(0, 4)}</span>
              <span className="rmain">
                <span className="rname">{fDay(s.session_date)}</span>
                <span className="rmeta"><span className="mono">{s.module_code}</span> · {Number(s.hours)} h{s.students_attended !== null ? ` · ${s.students_attended} students` : ''}</span>
              </span>
              <span className="rside">
                <span className="small" style={{ fontWeight: 700, color: 'var(--text)' }}>{rand(Number(s.amount ?? 0))}</span>
                <Badge tone="gold">Confirmed</Badge>
              </span>
            </div>
          ))}
        </div>
      ) : <p className="small muted">Nothing confirmed yet. Sessions show up here once admin confirms them.</p>}

      <button className="btn btn--outline" style={{ marginTop: 16 }} disabled={busy || !statement.length} onClick={download}>
        <Icon name="down" size={16} /> {busy ? 'Preparing…' : 'Download statement (PDF)'}
      </button>

      {earlier.length ? (
        <>
          <div className="sect">Earlier semesters</div>
          <div className="card">
            {earlier.map(({ s, total, n }) => (
              <div className="row" key={s.id}>
                <span className="rmain"><span className="rname">{s.name}</span><span className="rmeta">{n} confirmed session{n === 1 ? '' : 's'}</span></span>
                <span className="rside"><span className="small" style={{ fontWeight: 700, color: 'var(--text)' }}>{rand(total)}</span></span>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
