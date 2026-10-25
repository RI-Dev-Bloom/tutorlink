/* Student → Home. Your attendance per module (private to you),
   your modules and where your application stands. Every card that isn't the core (attendance,
   modules) has an × to close it for good on this device. */

import { useAuth } from '../../lib/auth'
import { useEffect, useState } from 'react'
import { useQuery } from '../../lib/data'
import { isOpen, loadMyApplication, loadMyModules } from '../../lib/student'
import { Icon } from '../../ui/icons'
import { Badge } from '../../ui/parts'
import { haptic } from '../../ui/haptic'
import { ApplyScreen, appKey } from './Apply'
import { SetupCard } from '../../ui/Setup'
import { loadMyAttendance } from '../../lib/attendance'
import { useStack } from '../../nav/Stack'
import { AttendanceLines } from '../../ui/Progress'
import { useOverlay } from '../../ui/Overlay'
import { QualificationSheet } from '../../ui/Qualification'

/* A card closed with × stays closed on this phone. */
function useClosed(key: string) {
  const k = `tl.closed.${key}`
  const [closed, setClosed] = useState(() => { try { return localStorage.getItem(k) === '1' } catch { return false } })
  const close = () => { haptic(6); setClosed(true); try { localStorage.setItem(k, '1') } catch { /* private mode */ } }
  return [closed, close] as const
}
const CloseX = ({ onClick }: { onClick: () => void }) => (
  <button className="iconbtn setup__x" aria-label="Close" onClick={e => { e.stopPropagation(); onClick() }}><Icon name="x" size={16} /></button>
)

export function StudentHome({ go }: { go: (tab: string) => void }) {
  const { profile } = useAuth()
  const uid = profile!.id
  const mods = useQuery(`my-modules:${uid}`, () => loadMyModules(uid))
  const app = useQuery(appKey(uid), () => loadMyApplication(uid))
  const att = useQuery('my-attendance', loadMyAttendance)
  // Coming back to the app (e.g. after checking in from a scanned link) shows the latest numbers.
  useEffect(() => {
    const back = () => { if (document.visibilityState === 'visible') att.reload() }
    document.addEventListener('visibilitychange', back)
    return () => document.removeEventListener('visibilitychange', back)
  }, [att.reload])
  const { push } = useStack()
  const { openSheet } = useOverlay()
  const [qualClosed, closeQual] = useClosed(`qual.${uid}`)
  const [modsClosed, closeMods] = useClosed(`mods.${uid}`)
  const [tutorClosed, closeTutor] = useClosed(`tutor.${uid}`)
  const [soonClosed, closeSoon] = useClosed('soon')
  const needQual = !profile!.qualification_code && !qualClosed
  const needMods = !!profile!.qualification_code && mods.data !== undefined && !mods.data.length && !modsClosed
  const first = profile!.full_name.split(' ')[0] || 'there'
  const open = (tab: string) => { haptic(8); go(tab) }
  const a = app.data

  return (
    <div className="pad stagger">
      <p className="eyebrow">Rosebank International</p>
      <h2 className="display display--sm">Hi {first}</h2>
      {needQual ? (
        <div className="addhome">
          <button className="addhome__go" onClick={() => { haptic(8); openSheet(<QualificationSheet />) }}>
            <Icon name="cap" size={18} /><span>Choose your qualification</span>
          </button>
          <button className="addhome__x" aria-label="Close" onClick={closeQual}><Icon name="x" size={15} /></button>
        </div>
      ) : needMods ? (
        <div className="addhome">
          <button className="addhome__go" onClick={() => open('modules')}>
            <Icon name="book" size={18} /><span>Pick this semester's modules</span>
          </button>
          <button className="addhome__x" aria-label="Close" onClick={closeMods}><Icon name="x" size={15} /></button>
        </div>
      ) : null}
      <SetupCard />

      {att.data?.length ? (
        <>
          <div className="sect" style={{ marginTop: 24 }}>My attendance <span className="muted" style={{ textTransform: 'none', letterSpacing: 0 }}>only you see this</span></div>
          <AttendanceLines rows={att.data} />
        </>
      ) : null}

      <div className="sect" style={{ marginTop: 24 }}>This semester</div>
      <div className="card">
        <button className="row" onClick={() => open('modules')}>
          <span className="avatar"><Icon name="book" size={18} /></span>
          <span className="rmain">
            <span className="rname">My modules</span>
            <span className="rmeta mono">
              {mods.data === undefined ? ' ' : mods.data.length ? mods.data.map(m => m.module_code).join(' · ') : 'None picked yet'}
            </span>
          </span>
          <span className="rside">
            {mods.data && !mods.data.length ? <Badge tone="amber">Pick</Badge> : null}
            <Icon name="chev" size={17} stroke={2.1} />
          </span>
        </button>
      </div>

      {profile!.is_tutor || (tutorClosed && !a) ? null : (
        <>
          <div className="sect">Tutoring</div>
          <div style={{ position: 'relative' }}>
          {a ? null : <CloseX onClick={closeTutor} />}
          <button className="card card--pad card--gold" style={{ display: 'block', width: '100%', textAlign: 'left', paddingRight: a ? undefined : 44 }} onClick={() => { haptic(8); push(<ApplyScreen />) }}>
            {a ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="rmain">
                  <span className="rname">Your application</span>
                  <span className="rmeta">{isOpen(a.status) ? 'Waiting for admin' : a.status === 'approved' ? 'You’re in!' : 'See admin’s reply'}</span>
                </span>
                <Badge tone={a.status === 'approved' ? 'green' : a.status === 'rejected' ? 'red' : 'amber'}>
                  {a.status === 'pending' ? 'Submitted' : a.status === 'under_review' ? 'Under review' : a.status === 'approved' ? 'Approved' : 'Not approved'}
                </Badge>
              </span>
            ) : (
              <>
                <span className="rname">Become a tutor</span>
                <span className="rmeta" style={{ marginTop: 4 }}>Got a great mark in a module? Help others with it and get paid per session.</span>
                <span className="small" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 12, fontWeight: 600, color: 'var(--goldD)' }}>
                  Apply now <Icon name="chev" size={15} stroke={2.2} />
                </span>
              </>
            )}
          </button>
          </div>
        </>
      )}

      {soonClosed ? null : (
        <div className="note note--plain" style={{ marginTop: 22, position: 'relative', paddingRight: 40 }}><Icon name="clock" size={15} />
          <span>Coming soon: announcements from your tutors.</span>
          <CloseX onClick={closeSoon} />
        </div>
      )}
    </div>
  )
}
