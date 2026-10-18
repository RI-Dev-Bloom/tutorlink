/* The message admin sends someone with a new temporary password (a new lecturer, or
   anyone admin reset), ready to copy or share to WhatsApp. */

import { appLink } from '../lib/data'
import { Icon } from './icons'
import { useOverlay } from './Overlay'
import { haptic } from './haptic'

export function Credentials({ heading, name, email, password, door, modules, note }: {
  heading: string; name: string; email: string; password: string
  /** The button they tap on the first screen: Student, Tutor, Lecturer or Admin. */
  door: string
  modules?: string[]; note?: string
}) {
  const { toast } = useOverlay()
  const message = [
    `Hi ${name}, here's how to sign in to TutorLink.`,
    '',
    `1. Open ${appLink()}`,
    `2. Tap "${door}"`,
    `Email: ${email}`,
    `Password: ${password}`,
    "(you'll choose your own password straight after)",
    ...(modules?.length ? ['', `Your modules: ${modules.join(', ')}`] : []),
  ].join('\n')

  const copy = async () => {
    try { await navigator.clipboard.writeText(message); haptic(14); toast('Copied. Paste it into WhatsApp or an email') }
    catch { toast('Couldn’t copy. Select the text instead') }
  }
  const share = async () => {
    try { await navigator.share({ title: 'TutorLink sign-in', text: message }) } catch { /* cancelled */ }
  }

  return (
    <div className="stagger">
      <div className="note note--green"><Icon name="check" size={15} /><span><b>{heading}.</b> Send them this message. The password is only shown now.</span></div>
      <div className="card card--pad card--gold" style={{ marginTop: 14 }}>
        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--fb)', fontSize: 13.5, lineHeight: 1.65, userSelect: 'text', WebkitUserSelect: 'text' }}>{message}</pre>
      </div>
      {note ? <p className="small muted" style={{ marginTop: 10 }}>{note}</p> : null}
      <div className="card card--pad" style={{ marginTop: 10 }}>
        <span className="rmeta" style={{ marginTop: 0 }}>Password</span>
        <span className="mono" style={{ fontSize: 22, letterSpacing: '.04em', userSelect: 'text', WebkitUserSelect: 'text' }}>{password}</span>
      </div>
      <button className="btn" style={{ marginTop: 16 }} onClick={copy}><Icon name="clip" size={18} /> Copy message</button>
      {'share' in navigator ? <button className="btn btn--navy" onClick={share}>Share to WhatsApp…</button> : null}
    </div>
  )
}
