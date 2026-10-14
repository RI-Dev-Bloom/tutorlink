/* Tutor → Schedule (home). Start a check-in (or jump back into the open one), this week's
   planned session, sessions that were never checked in, what's coming, and the semester limit. */

import { useAuth } from '../../lib/auth'
import { loadOpenCheckin } from '../../lib/attendance'
import { useQuery } from '../../lib/data'
import { hhmm, fDay, type Session } from '../../lib/tutors'
import { todayISO } from '../../lib/types'
import { useStack } from '../../nav/Stack'
import { Icon } from '../../ui/icons'
import { useOverlay } from '../../ui/Overlay'
import { Badge, Empty, Loading } from '../../ui/parts'
import { haptic } from '../../ui/haptic'
import { SetupCard } from '../../ui/Setup'
import { SessionScreen, StartCheckinSheet } from './Checkin'
import { useMine } from './mine'

const monday = (iso: string) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toLocaleDateString('en-CA') }
const plus = (iso: string, n: number) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA') }

export function TutorSchedule({ go, unread }: { go: (tab: string) => void; unread: number }) {
  const { profile } = useAuth()
  const { push } = useStack()
  const { openSheet } = useOverlay()
  const m = useMine()
  const openId = useQuery('open-checkin', loadOpenCheckin)
  const today = todayISO()

  if (m.loading) return <Loading />
  if (m.error || !m.d) return <p className="err pad">{m.error}</p>

  const d = m.d
  const mon = monday(today), sun = plus(mon, 6)
  const all = d.sessions
  const thisWeek = all.filter(s => s.status === 'scheduled' && s.session_date >= mon && s.session_date <= sun)
  const missed = all.filter(s => s.status === 'scheduled' && s.session_date < mon).reverse()
  const coming = all.filter(s => s.session_date > sun && (s.status === 'scheduled' || s.status === 'cancelled')).slice(0, 6)
  const waiting = all.filter(s => s.status === 'logged')
  const first = profile!.full_name.split(' ')[0]
  const open = (id: string) => { haptic(8); push(<SessionScreen sessionId={id} />) }
  const start = () => { haptic(10); openSheet(<StartCheckinSheet d={d} onStarted={open} />) }

  return (
    <div className="pad stagger">
      <p className="eyebrow">Welcome back</p>
      <h2 className="display display--sm">{first}</h2>
      <div className="chips" style={{ marginTop: 10 }}>
        {d.tutor.tutor_modules.map(t => <span key={t.module_code} className="chip chip--static chip--sm"><span className="code">{t.module_code}</span>{t.modules?.name}</span>)}
      </div>

      {openId.data ? (
        <button className="live-card" onClick={() => open(openId.data!)}>
          <span className="live-dot" aria-hidden />
          <span className="rmain"><span className="rname">Check-in is open</span><span className="rmeta">Show the code, see who's here, close it when you're done</span></span>
          <Icon name="chev" size={17} stroke={2.1} />
        </button>
      ) : (
        <button className="btn" style={{ marginTop: 18 }} disabled={!m.sem} onClick={start}>
          <Icon name="calChk" size={18} /> Start check-in
        </button>
      )}

      <SetupCard />
      {unread ? (
        <button className="note note--gold" style={{ width: '100%', textAlign: 'left', marginTop: 16 }} onClick={() => { haptic(8); go('inbox') }}>
          <Icon name="mail" size={16} /><span><b>{unread} unread message{unread === 1 ? '' : 's'}</b> from your lecturer or admin</span>
        </button>
      ) : null}

      {m.sem ? (
        <div className="card card--pad" style={{ marginTop: 16 }}>
          <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
            <span className="rname">{m.used} of {m.limit} sessions used</span>
            <span className="small muted">{m.left} left</span>
          </span>
          <span className="quota"><span style={{ width: `${m.limit ? Math.min(100, (m.used / m.limit) * 100) : 0}%` }} data-full={m.used >= m.limit || undefined} /></span>
          <span className="rmeta">{m.sem.name}. Cancelled sessions don't count.</span>
        </div>
      ) : null}

      <div className="sect">This week</div>
      {thisWeek.length ? (
        <>
          <div className="card">{thisWeek.map(s => <SessionRow key={s.id} s={s} today={today} />)}</div>
          <p className="small muted" style={{ marginTop: 8 }}>Running it on another day this week? Just start the check-in that day. It moves the session for you.</p>
        </>
      ) : <p className="small muted">Nothing planned this week. Start a check-in when you run a session.</p>}

      {missed.length ? (
        <>
          <div className="sect">Not checked in</div>
          <div className="card">
            {missed.map(s => (
              <button className="row" key={s.id} onClick={() => open(s.id)}>
                <span className="avatar avatar--code">{s.module_code.slice(0, 4)}</span>
                <span className="rmain"><span className="rname">{fDay(s.session_date)}</span><span className="rmeta"><span className="mono">{s.module_code}</span>{s.venue ? ` · ${s.venue}` : ''}</span></span>
                <span className="rside"><Badge tone="red">No check-in</Badge><Icon name="chev" size={17} stroke={2.1} /></span>
              </button>
            ))}
          </div>
          <p className="small muted" style={{ marginTop: 8 }}>If it happened, open it and add the students by hand.</p>
        </>
      ) : null}

      <div className="sect">Coming up</div>
      {coming.length ? (
        <div className="card">{coming.map(s => <SessionRow key={s.id} s={s} today={today} />)}</div>
      ) : (
        <Empty icon="cal" title="Nothing scheduled" line="Admin sets your weekly session time. It'll show up here." />
      )}

      {waiting.length ? (
        <>
          <div className="sect">Waiting for admin</div>
          <button className="note note--gold" style={{ width: '100%', textAlign: 'left' }} onClick={() => { haptic(8); go('sessions') }}>
            <Icon name="clock" size={15} />
            <span><b>{waiting.length} session{waiting.length === 1 ? '' : 's'}</b> checked in and waiting for admin to confirm.</span>
          </button>
        </>
      ) : null}
    </div>
  )
}

function SessionRow({ s, today }: { s: Session; today: string }) {
  const off = s.status === 'cancelled'
  return (
    <div className="row">
      <span className={'avatar avatar--code' + (s.session_date === today ? ' avatar--gold' : '')}>{s.module_code.slice(0, 4)}</span>
      <span className="rmain">
        <span className="rname" style={off ? { color: 'var(--muted)', textDecoration: 'line-through' } : undefined}>
          {s.session_date === today ? 'Today' : fDay(s.session_date)}{s.starts_at ? ` · ${hhmm(s.starts_at)}–${hhmm(s.ends_at)}` : ''}
        </span>
        <span className="rmeta"><span className="mono">{s.module_code}</span>{s.venue ? ` · ${s.venue}` : ''}</span>
      </span>
      <span className="rside">{off ? <Badge tone="plain">Cancelled</Badge> : null}</span>
    </div>
  )
}
