/* Admin → Overview: what needs doing today. Applications waiting, sessions to confirm,
   money owed, and the semester at a glance. */

import { useAuth } from '../../lib/auth'
import { useQuery } from '../../lib/data'
import { counts, currentSemester, loadOpenSessions, loadSemesters, loadTutors, needsConfirming, owed } from '../../lib/tutors'
import { fDate, rand, todayISO } from '../../lib/types'
import { useStack } from '../../nav/Stack'
import { Icon } from '../../ui/icons'
import { Badge, initials } from '../../ui/parts'
import { haptic } from '../../ui/haptic'
import { loadOpenCount } from './Applications'
import { TutorDetail } from './TutorDetail'
import { SetupCard } from '../../ui/Setup'

export function AdminOverview({ go }: { go: (tab: string) => void }) {
  const { profile } = useAuth()
  const { push } = useStack()
  const semesters = useQuery('semesters', loadSemesters)
  const sem = semesters.data ? currentSemester(semesters.data) : null
  const semId = sem?.id ?? null
  const apps = useQuery('applications:count', loadOpenCount)
  const tutors = useQuery('tutors', loadTutors)
  const sessions = useQuery(`sessions:open:${semId}`, () => loadOpenSessions(semId))

  const view = (() => {
    const all = sessions.data ?? []
    const waiting = all.filter(needsConfirming)
    const byTutor = (tutors.data ?? [])
      .map(t => ({ t, n: waiting.filter(s => s.tutor_id === t.id).length }))
      .filter(x => x.n).sort((a, b) => b.n - a.n)
    return {
      waiting: waiting.length,
      owed: owed(all),
      run: all.filter(s => counts(s, semId) && s.session_date <= todayISO() && s.status !== 'scheduled').length,
      byTutor,
    }
  })()

  const first = (profile?.full_name || '').split(' ')[0]
  const open = (tab: string) => { haptic(8); go(tab) }

  return (
    <div className="pad stagger">
      <p className="eyebrow">Rosebank International</p>
      <h2 className="display display--sm">{first ? `Hi ${first}` : 'Overview'}</h2>
      <p className="sub">{sem ? `${sem.name} · until ${fDate(sem.ends_on)}` : 'No semester set up yet'}</p>

      <SetupCard />
      <div className="metrics" style={{ marginTop: 18 }}>
        <button className="metric metric--amber" style={{ textAlign: 'left' }} onClick={() => open('apps')}>
          <div className="n">{apps.data ?? '–'}</div><div className="l">Applications waiting</div>
        </button>
        <button className="metric metric--navy" style={{ textAlign: 'left' }} onClick={() => open('tutors')}>
          <div className="n">{view.waiting}</div><div className="l">Sessions to confirm</div>
        </button>
        <button className="metric metric--gold" style={{ textAlign: 'left' }} onClick={() => open('tutors')}>
          <div className="n n--sm">{rand(view.owed)}</div><div className="l">Owed to tutors</div>
        </button>
      </div>

      {semesters.data && !sem ? (
        <button className="note note--amber" style={{ marginTop: 14, width: '100%', textAlign: 'left' }} onClick={() => open('profile')}>
          <Icon name="alert" size={15} /><span>Add this semester's dates in Settings so tutors can be scheduled.</span>
        </button>
      ) : null}

      <div className="sect">Needs confirming</div>
      {view.byTutor.length ? (
        <div className="card">
          {view.byTutor.map(({ t, n }) => (
            <button className="row" key={t.id} onClick={() => push(<TutorDetail id={t.id} />)}>
              <span className="avatar">{initials(t.full_name)}</span>
              <span className="rmain"><span className="rname">{t.full_name}</span><span className="rmeta mono">{t.tutor_modules.map(m => m.module_code).join(' · ')}</span></span>
              <span className="rside"><Badge tone="amber">{n} to confirm</Badge><Icon name="chev" size={17} stroke={2.1} /></span>
            </button>
          ))}
        </div>
      ) : <p className="small muted">Nothing waiting. Sessions show up here once they've happened.</p>}

      <div className="sect">This semester</div>
      <div className="card card--pad">
        <div className="payrow"><span className="muted">Tutors</span><span>{tutors.data?.length ?? '–'}</span></div>
        <div className="payrow"><span className="muted">Sessions run so far</span><span>{view.run}</span></div>
        <div className="payrow"><span className="muted">Session limit per tutor</span><span>{sem?.session_quota ?? '–'}</span></div>
      </div>
    </div>
  )
}
