/* Student → Home. For now: your modules and where your application stands.
   Announcements and the next tutorial session land here in a later phase. */

import { useAuth } from '../../lib/auth'
import { useQuery } from '../../lib/data'
import { isOpen, loadMyApplication, loadMyModules } from '../../lib/student'
import { Icon } from '../../ui/icons'
import { Badge } from '../../ui/parts'
import { haptic } from '../../ui/haptic'
import { appKey } from './Apply'
import { SetupCard } from '../../ui/Setup'

export function StudentHome({ go }: { go: (tab: string) => void }) {
  const { profile } = useAuth()
  const uid = profile!.id
  const mods = useQuery(`my-modules:${uid}`, () => loadMyModules(uid))
  const app = useQuery(appKey(uid), () => loadMyApplication(uid))
  const first = profile!.full_name.split(' ')[0] || 'there'
  const open = (tab: string) => { haptic(8); go(tab) }
  const a = app.data

  return (
    <div className="pad stagger">
      <p className="eyebrow">Rosebank International</p>
      <h2 className="display display--sm">Hi {first}</h2>
      <p className="sub">Your tutoring programme, in one place.</p>
      <SetupCard />

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

      {profile!.is_tutor ? null : (
        <>
          <div className="sect">Tutoring</div>
          <button className="card card--pad card--gold" style={{ display: 'block', width: '100%', textAlign: 'left' }} onClick={() => open('apply')}>
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
        </>
      )}

      <div className="note note--plain" style={{ marginTop: 22 }}><Icon name="clock" size={15} />
        <span>Coming soon: announcements from your tutors and your next tutorial session.</span></div>
    </div>
  )
}
