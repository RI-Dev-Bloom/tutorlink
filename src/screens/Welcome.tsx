/* The first screen: who are you? Each door opens the sign-in for that kind of account.
   Students and tutors share one account; the door just decides which view opens first. */

import { useStack } from '../nav/Stack'
import { Icon, type IconName } from '../ui/icons'
import { haptic } from '../ui/haptic'
import { SignIn, type Door } from './SignIn'

const DOORS: { door: Door; icon: IconName; name: string; desc: string; gold?: boolean }[] = [
  { door: 'student', icon: 'user', name: 'Student', desc: 'Check in, track your attendance, apply to tutor' },
  { door: 'tutor', icon: 'cap', name: 'Tutor', desc: 'Your sessions, check-ins and pay', gold: true },
  { door: 'lecturer', icon: 'board', name: 'Lecturer', desc: 'Lecture check-ins and your modules' },
  { door: 'admin', icon: 'shield', name: 'Admin', desc: 'Programme office' },
]

export function Welcome() {
  const { push } = useStack()
  return (
    <>
      <div className="brandbar">
        <img src={`${import.meta.env.BASE_URL}logo.webp`} alt="Rosebank International" />
      </div>
      <div className="body"><div className="pad">
        <p className="eyebrow">Rosebank International</p>
        <h1 className="display">TutorLink</h1>
        <p className="sub">The peer tutoring programme, on your phone. Sign in with your Rosebank email.</p>

        <div className="roles stagger">
          {DOORS.map(d => (
            <button key={d.door} className={'role' + (d.gold ? ' role--gold' : '')} onClick={() => { haptic(8); push(<SignIn door={d.door} />) }}>
              <span className="glyph"><Icon name={d.icon} size={22} /></span>
              <span className="rmain">
                <span className="rname">{d.name}</span>
                <span className="rdesc">{d.desc}</span>
              </span>
              <span className="chev"><Icon name="chev" size={18} stroke={2.1} /></span>
            </button>
          ))}
        </div>
      </div></div>
    </>
  )
}
