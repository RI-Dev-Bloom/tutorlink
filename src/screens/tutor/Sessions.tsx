/* Tutor → Sessions: every session that's happened, how many checked in and where it stands.
   Tap one for its attendance list. Check-in replaces the paper register. */

import { hhmm, fDay, sessionLabel, type Session } from '../../lib/tutors'
import { todayISO } from '../../lib/types'
import { useStack } from '../../nav/Stack'
import { Icon } from '../../ui/icons'
import { useOverlay } from '../../ui/Overlay'
import { Badge, Loading } from '../../ui/parts'
import { haptic } from '../../ui/haptic'
import { SessionScreen, StartCheckinSheet } from './Checkin'
import { AttendanceScreen } from '../attendance/Attendance'
import { useMine } from './mine'

const STATUS: Record<Session['status'], { label: string; tone: 'amber' | 'green' | 'gold' | 'plain' | 'red' }> = {
  scheduled: { label: 'No check-in', tone: 'red' },
  logged: { label: 'Waiting', tone: 'amber' },
  confirmed: { label: 'Confirmed', tone: 'gold' },
  paid: { label: 'Confirmed', tone: 'gold' },
  cancelled: { label: 'Cancelled', tone: 'plain' },
}

export function TutorSessions() {
  const { push } = useStack()
  const { openSheet } = useOverlay()
  const m = useMine()
  const today = todayISO()

  if (m.loading) return <Loading />
  if (m.error || !m.d) return <p className="err pad">{m.error}</p>
  const d = m.d
  const past = d.sessions.filter(s => s.session_date <= today && !(s.status === 'scheduled' && s.session_date === today)).reverse()
  const open = (id: string) => { haptic(8); push(<SessionScreen sessionId={id} />) }

  return (
    <>
      <div className="pad pad--fab stagger">
        <button className="row card" style={{ marginBottom: 18 }} onClick={() => { haptic(8); push(<AttendanceScreen />) }}>
          <span className="avatar"><Icon name="people" size={18} /></span>
          <span className="rmain"><span className="rname">Your students</span><span className="rmeta">Who comes to your sessions, and how often</span></span>
          <span className="rside"><Icon name="chev" size={17} stroke={2.1} /></span>
        </button>
        <div className="sect" style={{ marginTop: 0 }}>Sessions <span className="muted">{past.length}</span></div>
        {past.length ? (
          <div className="card">
            {past.map(s => (
              <button className="row" key={s.id} onClick={() => open(s.id)}>
                <span className="avatar avatar--code">{s.module_code.slice(0, 4)}</span>
                <span className="rmain">
                  <span className="rname">{fDay(s.session_date)}{s.starts_at ? ` · ${hhmm(s.starts_at)}–${hhmm(s.ends_at)}` : ''}</span>
                  <span className="rmeta">
                    <span className="mono">{s.module_code}</span>
                    {s.students_attended !== null ? ` · ${s.students_attended} checked in` : ''} · {Number(s.hours)} h
                  </span>
                  {sessionLabel(s) ? <span className="rmeta" style={{ color: 'var(--text)' }}>{sessionLabel(s)}</span> : null}
                </span>
                <span className="rside"><Badge tone={STATUS[s.status].tone}>{STATUS[s.status].label}</Badge><Icon name="chev" size={17} stroke={2.1} /></span>
              </button>
            ))}
          </div>
        ) : <p className="small muted">No sessions yet. They show up here once you've run a check-in.</p>}

        <div className="note note--plain" style={{ marginTop: 14 }}><Icon name="alert" size={15} />
          <span>A session counts towards your pay once admin confirms it. Admin needs enough students checked in to confirm it.</span></div>
      </div>
      <button className="fab" disabled={!m.sem} onClick={() => { haptic(10); openSheet(<StartCheckinSheet kind="tutorial" modules={d.tutor.tutor_modules.map(m => ({ code: m.module_code, name: m.modules?.name ?? m.module_code }))} sessions={d.sessions} onStarted={open} />) }}>
        <Icon name="calChk" size={18} /> Start check-in
      </button>
    </>
  )
}
