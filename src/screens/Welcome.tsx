import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { friendlyError } from '../lib/supabase'
import { useStack } from '../nav/Stack'
import { GoogleMark, Icon } from '../ui/icons'
import { useOverlay } from '../ui/Overlay'
import { haptic } from '../ui/haptic'
import { StaffSignIn } from './StaffSignIn'

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

        <div className="sect" style={{ marginTop: 28 }}>Everyone</div>
        <button className="gbtn" onClick={google} disabled={busy}>
          <GoogleMark /> {busy ? 'Opening Google…' : 'Sign in with Google'}
        </button>
        <p className="small muted" style={{ marginTop: 10 }}>
          Students: use your normal Gmail — first time in, you'll add your student number.
          Staff: use the email admin set your account up with.
        </p>

        <div className="sect" style={{ marginTop: 30 }}>Staff without a Google email</div>
        <div className="roles stagger" style={{ marginTop: 0 }}>
          <button className="role" onClick={() => { haptic(8); push(<StaffSignIn />) }}>
            <span className="glyph"><Icon name="mail" size={22} /></span>
            <span className="rmain">
              <span className="rname">Email and password</span>
              <span className="rdesc">Lecturers and admin, with the password admin sent you</span>
            </span>
            <span className="chev"><Icon name="chev" size={18} stroke={2.1} /></span>
          </button>
        </div>
      </div></div>
    </>
  )
}
