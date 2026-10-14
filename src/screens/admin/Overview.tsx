/* Admin → Overview: the programme at a glance.
   Where we are in the semester and who it's reached; what needs doing; the payout building up
   for the semester end; activity week by week; and whether every high-risk module has a tutor. */

import { useMemo, useState } from 'react'
import { useAuth } from '../../lib/auth'
import { useQuery } from '../../lib/data'
import { loadSettings } from '../../lib/student'
import { supabase } from '../../lib/supabase'
import {
  counts, currentSemester, earned, estimate, isEarned, loadOpenSessions, loadOverrides, loadSemesters, loadTutors,
  needsConfirming, semWeek, semWeeks, type Session,
} from '../../lib/tutors'
import { fDate, todayISO, type Semester } from '../../lib/types'
import { useStack } from '../../nav/Stack'
import { Icon } from '../../ui/icons'
import { Ledger } from '../../ui/Ledger'
import { Badge } from '../../ui/parts'
import { haptic } from '../../ui/haptic'
import { SetupCard } from '../../ui/Setup'
import { loadModules } from './Modules'
import { SemesterPay } from './SemesterPay'
import { TutorDetail } from './TutorDetail'

/* Open applications: how many, and how long the oldest has waited. Shares the 'applications' prefix. */
const loadAppQueue = async () => {
  const { data, error } = await supabase.from('applications').select('submitted_at').in('status', ['pending', 'under_review']).order('submitted_at')
  if (error) throw error
  return { count: data.length, oldest: data[0]?.submitted_at ?? null }
}

const daysAgo = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
const ran = (s: Session) => s.status === 'logged' || isEarned(s)

export function AdminOverview({ go }: { go: (tab: string) => void }) {
  const { profile } = useAuth()
  const { push } = useStack()
  const semesters = useQuery('semesters', loadSemesters)
  const sem = semesters.data ? currentSemester(semesters.data) : null
  const semId = sem?.id ?? null
  const apps = useQuery('applications:queue', loadAppQueue)
  const tutors = useQuery('tutors', loadTutors)
  const sessions = useQuery(`sessions:open:${semId}`, () => loadOpenSessions(semId))
  const overrides = useQuery(`overrides:${semId}`, () => semId ? loadOverrides(semId) : Promise.resolve([]))
  const modules = useQuery('modules', loadModules)
  const rate = Number(useQuery('settings', loadSettings).data?.rate_per_session ?? 0)
  const today = todayISO()

  const v = useMemo(() => {
    const all = sessions.data ?? []
    const inSem = all.filter(s => counts(s, semId))
    const done = inSem.filter(ran)
    const students = done.reduce((n, s) => n + (s.students_attended ?? 0), 0)
    const toConfirm = all.filter(needsConfirming)
    const tutorList = tutors.data ?? []
    const confirmBy = tutorList.map(t => ({ t, n: toConfirm.filter(s => s.tutor_id === t.id).length })).filter(x => x.n).sort((a, b) => b.n - a.n)
    const nearLimit = sem ? tutorList.map(t => {
      const limit = overrides.data?.find(o => o.tutor_id === t.id)?.session_quota ?? sem.session_quota
      return { t, left: limit - inSem.filter(s => s.tutor_id === t.id).length, limit }
    }).filter(x => x.limit > 0 && x.left <= 2).sort((a, b) => a.left - b.left) : []
    const waiting = inSem.filter(needsConfirming)
    const ahead = inSem.filter(s => s.status === 'scheduled' && s.session_date >= today)
    const confirmed = inSem.filter(isEarned)
    const coverage = (modules.data ?? []).filter(m => m.high_risk && !m.hidden).map(m => ({
      m,
      tutors: tutorList.filter(t => t.tutor_modules.some(x => x.module_code === m.code)).length,
      run: done.filter(s => s.module_code === m.code).length,
    })).sort((a, b) => a.tutors - b.tutors || a.m.code.localeCompare(b.m.code))
    return { done, students, confirmBy, toConfirmN: toConfirm.length, nearLimit, waiting, ahead, confirmed, coverage }
  }, [sessions.data, tutors.data, overrides.data, modules.data, sem, semId, today])

  const first = (profile?.full_name || '').split(' ')[0]
  const open = (tab: string) => { haptic(8); go(tab) }
  const appCount = apps.data?.count ?? 0
  const gaps = v.coverage.filter(c => !c.tutors).length
  const todo = appCount + v.confirmBy.length + v.nearLimit.length

  return (
    <div className="pad stagger">
      <p className="eyebrow">Rosebank International</p>
      <h2 className="display display--sm">{first ? `Hi ${first}` : 'Overview'}</h2>
      <SetupCard />

      {sem ? <SemesterBand sem={sem} today={today} run={v.done.length} students={v.students} /> : semesters.data ? (
        <button className="note note--amber" style={{ marginTop: 16, width: '100%', textAlign: 'left' }} onClick={() => open('profile')}>
          <Icon name="alert" size={15} /><span>Add this semester's dates in Settings so tutors can be scheduled.</span>
        </button>
      ) : null}

      <div className="sect">To do {todo ? <span className="count-pill">{todo}</span> : null}</div>
      {todo ? (
        <div className="card">
          {appCount ? (
            <button className="row" onClick={() => open('apps')}>
              <span className="todo-ico todo-ico--amber"><Icon name="clip" size={17} /></span>
              <span className="rmain">
                <span className="rname">{appCount} application{appCount === 1 ? '' : 's'} waiting</span>
                {apps.data?.oldest ? <span className="rmeta">Oldest sent {daysAgo(apps.data.oldest) < 1 ? 'today' : `${daysAgo(apps.data.oldest)} day${daysAgo(apps.data.oldest) === 1 ? '' : 's'} ago`}</span> : null}
              </span>
              <span className="rside"><Icon name="chev" size={17} stroke={2.1} /></span>
            </button>
          ) : null}
          {v.confirmBy.map(({ t, n }) => (
            <button className="row" key={'c' + t.id} onClick={() => push(<TutorDetail id={t.id} />)}>
              <span className="todo-ico todo-ico--navy"><Icon name="calChk" size={17} /></span>
              <span className="rmain"><span className="rname">{n} session{n === 1 ? '' : 's'} to confirm</span><span className="rmeta">{t.full_name} · <span className="mono">{t.tutor_modules.map(m => m.module_code).join(' · ')}</span></span></span>
              <span className="rside"><Icon name="chev" size={17} stroke={2.1} /></span>
            </button>
          ))}
          {v.nearLimit.map(({ t, left }) => (
            <button className="row" key={'q' + t.id} onClick={() => push(<TutorDetail id={t.id} />)}>
              <span className="todo-ico todo-ico--red"><Icon name="alert" size={17} /></span>
              <span className="rmain"><span className="rname">{left <= 0 ? 'No sessions left' : `${left} session${left === 1 ? '' : 's'} left`}</span><span className="rmeta">{t.full_name} is close to the semester limit</span></span>
              <span className="rside"><Icon name="chev" size={17} stroke={2.1} /></span>
            </button>
          ))}
        </div>
      ) : (
        <div className="caught-up"><Icon name="check" size={16} stroke={2.4} /> All caught up. Nothing needs you right now.</div>
      )}

      {sem ? (
        <>
          <div className="sect"><span>Pay this semester</span><button className="link" onClick={() => push(<SemesterPay />)}>Pay sheet ›</button></div>
          <button className="ledger-btn" onClick={() => { haptic(8); push(<SemesterPay />) }}>
            <Ledger label="Payout at the semester end"
              confirmed={{ n: v.confirmed.length, amount: earned(v.confirmed, semId) }}
              waiting={{ n: v.waiting.length, amount: estimate(v.waiting, rate) }}
              ahead={{ n: v.ahead.length, amount: estimate(v.ahead, rate) }}
              foot={<p className="ledger__foot"><Icon name="cal" size={14} />Paid out after {fDate(sem.ends_on)}. Tap for the pay sheet.</p>} />
          </button>

          <div className="sect">Week by week</div>
          <WeekChart sem={sem} today={today} done={v.done} />
        </>
      ) : null}

      <div className="sect"><span>High-risk modules</span>{gaps ? <Badge tone="red">{gaps} without a tutor</Badge> : null}</div>
      {v.coverage.length ? (
        <div className="card">
          {v.coverage.map(({ m, tutors: n, run }) => (
            <div className="row" key={m.code}>
              <span className={'cov' + (n ? '' : ' cov--gap')}>{n}</span>
              <span className="rmain"><span className="rname">{m.name}</span><span className="rmeta"><span className="mono">{m.code}</span> · {n === 1 ? '1 tutor' : `${n} tutors`}{sem ? ` · ${run} session${run === 1 ? '' : 's'} run` : ''}</span></span>
              {!n ? <span className="rside"><Badge tone="red">No tutor</Badge></span> : null}
            </div>
          ))}
        </div>
      ) : (
        <button className="note note--plain" style={{ width: '100%', textAlign: 'left' }} onClick={() => open('profile')}>
          <Icon name="alert" size={15} /><span>No high-risk modules yet. Mark them in Settings so students can apply to tutor them.</span>
        </button>
      )}
    </div>
  )
}

/* ---------- where we are in the semester ------------------ */

function SemesterBand({ sem, today, run, students }: { sem: Semester; today: string; run: number; students: number }) {
  const weeks = semWeeks(sem)
  const before = today < sem.starts_on, after = today > sem.ends_on
  const week = before ? 0 : after ? weeks + 1 : semWeek(sem, today)
  const daysTo = (iso: string) => Math.round((new Date(iso).getTime() - new Date(today).getTime()) / 86_400_000)
  const avg = run ? (students / run).toFixed(1).replace(/\.0$/, '') : '–'

  return (
    <section className="band" aria-label={before ? `${sem.name} hasn't started` : after ? `${sem.name} has ended` : `${sem.name}, week ${week} of ${weeks}`}>
      <div className="band__top">
        <b>{sem.name}</b>
        <span>{before ? `Starts in ${daysTo(sem.starts_on)} days` : after ? 'Ended' : `${daysTo(sem.ends_on)} days left`}</span>
      </div>
      <div className="band__week">
        <span className="band__n">{before ? 0 : Math.min(week, weeks)}</span>
        <span className="band__of">of {weeks} weeks</span>
      </div>
      <div className="ticks" aria-hidden>
        {Array.from({ length: weeks }, (_, i) => <i key={i} className={i + 1 < week ? 'past' : i + 1 === week ? 'now' : undefined} />)}
      </div>
      <div className="band__dates"><span>{fDate(sem.starts_on)}</span><span>{fDate(sem.ends_on)}</span></div>
      <div className="band__stats">
        <div><b>{run}</b><span>Sessions run</span></div>
        <div><b>{students}</b><span>Students reached</span></div>
        <div><b>{avg}</b><span>Per session</span></div>
      </div>
    </section>
  )
}

/* ---------- sessions run each week ------------------------ */

function WeekChart({ sem, today, done }: { sem: Semester; today: string; done: Session[] }) {
  const weeks = semWeeks(sem)
  const now = today < sem.starts_on ? 0 : Math.min(weeks, semWeek(sem, today))
  const data = Array.from({ length: weeks }, (_, i) => {
    const list = done.filter(s => semWeek(sem, s.session_date) === i + 1)
    return { week: i + 1, sessions: list.length, students: list.reduce((n, s) => n + (s.students_attended ?? 0), 0) }
  })
  const max = Math.max(1, ...data.map(d => d.sessions))
  const [sel, setSel] = useState<number | null>(null)
  const shown = data[(sel ?? Math.max(1, now)) - 1]
  const total = data.reduce((n, d) => n + d.sessions, 0)

  return (
    <div className="card card--pad wk">
      <div className="wk__read" aria-live="polite">
        <b>Week {shown.week}</b>
        <span>{shown.week > now ? 'still to come' : `${shown.sessions} session${shown.sessions === 1 ? '' : 's'} · ${shown.students} student${shown.students === 1 ? '' : 's'}`}</span>
      </div>
      <div className="wk__plot">
        <span className="wk__max">{max}</span>
        <div className="wk__bars" onMouseLeave={() => setSel(null)}>
          {data.map(d => (
            <button key={d.week} className={'wk__col' + (d.week === now ? ' now' : '') + (d.week > now ? ' future' : '') + (shown.week === d.week ? ' sel' : '')}
              aria-label={`Week ${d.week}: ${d.sessions} sessions, ${d.students} students`}
              onMouseEnter={() => setSel(d.week)} onFocus={() => setSel(d.week)} onClick={() => { haptic(4); setSel(d.week) }}>
              <span className="wk__bar" style={{ height: d.sessions ? `${(d.sessions / max) * 100}%` : undefined }} />
            </button>
          ))}
        </div>
      </div>
      <div className="wk__axis"><span>Week 1</span><span>{weeks}</span></div>
      <p className="small muted" style={{ marginTop: 8 }}>{total ? 'Sessions run each week. Tap a bar for the numbers.' : 'Sessions show up here once tutors start running them.'}</p>
    </div>
  )
}

