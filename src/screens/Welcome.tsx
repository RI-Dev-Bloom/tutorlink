import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { friendlyError } from '../lib/supabase'
import { useStack } from '../nav/Stack'
import { GoogleMark, Icon, type IconName } from '../ui/icons'
import { useOverlay } from '../ui/Overlay'
import { haptic } from '../ui/haptic'
import { StaffSignIn } from './StaffSignIn'

const STAFF: { id: 'lecturer' | 'admin'; icon: IconName; title: string; desc: string; gold?: boolean }[] = [
  { id: 'lecturer', icon: 'board',  title: 'Lecturer', desc: 'Your modules and their tutors', gold: true },
  { id: 'admin',    icon: 'shield', title: 'Admin',    desc: 'Applications, tutors, oversight' },
]

export function Welcome() {
  const { signInWithGoogle } = useAuth()
  const { push } = useStack()
  const { toast } = useOverlay()
  const [busy, setBusy] = useState(false)

  const google = async () => {
    setBusy(true)
    try { await signInWithGoogle() }   // leaves the page for Google, then comes back signed in
    catch (e) { haptic(24); toast(friendlyError(e)); setBusy(false) }
  }

  return (
    <>
      <div className="brandbar">
        <img src={`${import.meta.env.BASE_URL}logo.webp`} alt="Rosebank International" />
      </div>
      <div className="body"><div className="pad">
        <p className="eyebrow">Rosebank International</p>
        <h1 className="display">TutorLink</h1>
        <p className="sub">The peer tutoring programme, on your phone.</p>

        <div className="sect" style={{ marginTop: 28 }}>Students and tutors</div>
        <button className="gbtn" onClick={google} disabled={busy}>
          <GoogleMark /> {busy ? 'Opening Google…' : 'Sign in with Google'}
        </button>
        <p className="small muted" style={{ marginTop: 10 }}>
          Use your normal Gmail. First time in, you'll add your student number.
        </p>

        <div className="sect" style={{ marginTop: 30 }}>Staff</div>
        <div className="roles stagger" style={{ marginTop: 0 }}>
          {STAFF.map((r, i) => (
            <button key={r.id} className={'role' + (r.gold ? ' role--gold' : '')} style={{ animationDelay: `${0.05 + i * 0.07}s` }}
              onClick={() => { haptic(8); push(<StaffSignIn role={r.id} />) }}>
              <span className="glyph"><Icon name={r.icon} size={22} /></span>
              <span className="rmain">
                <span className="rname">{r.title}</span>
                <span className="rdesc">{r.desc}</span>
              </span>
              <span className="chev"><Icon name="chev" size={18} stroke={2.1} /></span>
            </button>
          ))}
        </div>
      </div></div>
    </>
  )
}
