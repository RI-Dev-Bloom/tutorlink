/* "Get set up": install the app, then turn on notifications.
   SetupCard sits on each home screen until done or dismissed; DeviceSettings lives in Profile/Settings for good. */

import { useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../lib/auth'
import { canPromptInstall, isIOS, isInstalled, onInstallChange, promptInstall, pushState, turnOffPush, turnOnPush, type PushState } from '../lib/push'
import { friendlyError } from '../lib/supabase'
import { Icon } from './icons'
import { useOverlay } from './Overlay'
import { Badge } from './parts'
import { haptic } from './haptic'
import { Group, SRow, Switch } from './Settings'

const HIDE_KEY = 'tl.setup.hidden'
const isPhone = () => isIOS() || /android/i.test(navigator.userAgent)

function usePush() {
  const [state, setState] = useState<PushState | null>(null)
  useEffect(() => { pushState().then(setState).catch(() => setState('unsupported')) }, [])
  return [state, setState] as const
}

function useInstallable() {
  const [, bump] = useState(0)
  useEffect(() => onInstallChange(() => bump(n => n + 1)), [])
  return { installed: isInstalled(), prompt: canPromptInstall() }
}

/* What notifications bring, in each person's terms. */
function why(role: string, tutor: boolean) {
  if (role === 'admin') return 'New applications and messages, even when the app is closed.'
  if (role === 'lecturer') return 'Messages from your tutors and admin, even when the app is closed.'
  if (tutor) return 'Messages, a reminder on session days, and when admin confirms your sessions.'
  return 'Hear back the moment admin decides on your application.'
}

export function SetupCard() {
  const { profile } = useAuth()
  const { openSheet, toast } = useOverlay()
  const [push, setPush] = usePush()
  const install = useInstallable()
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem(HIDE_KEY) === '1' } catch { return false } })
  const [busy, setBusy] = useState(false)

  if (hidden || !profile || push === null) return null
  const needInstall = isPhone() && !install.installed
  const needPush = push === 'off'
  if (!needInstall && !needPush) return null

  const hide = () => { haptic(6); setHidden(true); try { localStorage.setItem(HIDE_KEY, '1') } catch { /* fine */ } }
  const turnOn = async () => {
    setBusy(true)
    try { const s = await turnOnPush(); setPush(s); if (s === 'on') { haptic(16); toast('Notifications are on') } }
    catch (e) { toast(friendlyError(e)) }
    setBusy(false)
  }

  // Step 1 is a slim light-blue strip: tap it to install (or see how), × to hide.
  if (needInstall) return (
    <div className="addhome">
      <button className="addhome__go" onClick={async () => {
        haptic(8)
        if (install.prompt) { if (await promptInstall()) toast('Installed') } else openSheet(<InstallGuide />)
      }}>
        <Icon name="info" size={18} />
        <span>Add TutorLink to your home screen</span>
      </button>
      <button className="addhome__x" aria-label="Hide this" onClick={hide}><Icon name="x" size={15} /></button>
    </div>
  )

  return (
    <div className="card card--pad card--gold setup">
      <button className="iconbtn setup__x" aria-label="Hide this" onClick={hide}><Icon name="x" size={16} /></button>
      {(
        <>
          <p className="eyebrow" style={{ marginBottom: 6 }}>{isPhone() ? 'Get set up · step 2 of 2' : 'Stay in the loop'}</p>
          <span className="rname" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="bell" size={18} /> Turn on notifications</span>
          <p className="small muted" style={{ marginTop: 6 }}>{why(profile.role, profile.is_tutor)}</p>
          <button className="btn btn--sm" style={{ marginTop: 12 }} disabled={busy} onClick={turnOn}>{busy ? 'Turning on…' : 'Turn on'}</button>
        </>
      )}
    </div>
  )
}

/* Settings → Device: notifications and installing, for the phone or computer in your hand. */
export function DeviceSettings() {
  const { profile } = useAuth()
  const { openSheet, toast } = useOverlay()
  const [push, setPush] = usePush()
  const install = useInstallable()
  const [busy, setBusy] = useState(false)
  if (!profile) return null

  const toggle = async (on: boolean) => {
    setBusy(true)
    try {
      if (!on) { await turnOffPush(); setPush('off'); toast('Notifications are off on this device') }
      else { const s = await turnOnPush(); setPush(s); if (s === 'on') { haptic(16); toast('Notifications are on') } }
    } catch (e) { toast(friendlyError(e)) }
    setBusy(false)
  }

  const pushLine: Record<PushState, string> = {
    on: 'On for this device',
    off: why(profile.role, profile.is_tutor),
    blocked: 'Blocked. Allow notifications for TutorLink in your device’s settings.',
    'install-first': 'Add TutorLink to your home screen first, then turn them on.',
    unsupported: 'This browser can’t show notifications.',
  }

  return (
    <Group title="Device" foot="Notifications are set separately on each phone or computer you use.">
      <SRow icon="bell" tone="red" label="Notifications" sub={push ? pushLine[push] : undefined}
        right={push === 'on' || push === 'off'
          ? <Switch on={push === 'on'} disabled={busy} onChange={toggle} label="Notifications" />
          : push === 'blocked' ? <Badge tone="red">Blocked</Badge> : null} />
      {install.installed ? null : (
        <SRow icon="addsq" tone="blue" label="Add to home screen" sub="Opens like a normal app"
          onClick={() => install.prompt ? promptInstall() : openSheet(<InstallGuide />)} />
      )}
    </Group>
  )
}

function InstallGuide() {
  const ios = isIOS()
  const steps: [string, ReactNode][] = ios
    ? [
        ['share', <>Open TutorLink in <b>Safari</b> and tap the <b>Share</b> button (the square with an arrow, at the bottom or top of the screen).</>],
        ['addsq', <>Scroll down and tap <b>Add to Home Screen</b>, then <b>Add</b>.</>],
        ['home', <>Open TutorLink from your home screen from now on, and turn on notifications under Device in Profile.</>],
      ]
    : [
        ['share', <>Open TutorLink in <b>Chrome</b> and tap the <b>⋮</b> menu at the top right.</>],
        ['addsq', <>Tap <b>Add to Home screen</b> (or <b>Install app</b>), then <b>Install</b>.</>],
        ['home', <>Open TutorLink from your home screen from now on.</>],
      ]
  return (
    <div>
      <p className="sheet-sub">{ios ? 'iPhone' : 'Android'}</p>
      <h3 className="sheet-title">Add TutorLink to your home screen</h3>
      <p className="sheet-lead">It's free, takes ten seconds, and there's no app store involved.</p>
      <div className="card" style={{ marginTop: 14 }}>
        {steps.map(([icon, text], i) => (
          <div className="row" key={i} style={{ alignItems: 'flex-start' }}>
            <span className="avatar avatar--code" style={{ fontSize: 13 }}>{i + 1}</span>
            <span className="rmain" style={{ fontSize: 13.5, lineHeight: 1.6 }}>{text}</span>
            <span className="rside" style={{ color: 'var(--muted)' }}><Icon name={icon as 'share'} size={20} /></span>
          </div>
        ))}
      </div>
    </div>
  )
}
