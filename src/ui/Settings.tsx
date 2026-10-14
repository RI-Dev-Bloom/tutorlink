/* The building blocks of a settings screen, like a phone's own Settings app:
   grouped lists with a coloured icon, the current value on the right, and footnotes. */

import type { ReactNode } from 'react'
import { Icon, type IconName } from './icons'
import { initials } from './parts'
import { haptic } from './haptic'

export type Tone = 'navy' | 'gold' | 'green' | 'blue' | 'red' | 'slate' | 'amber'

export function SHead({ name, line, gold }: { name: string; line: string; gold?: boolean }) {
  return (
    <div className="shead">
      <span className={'avatar shead__av' + (gold ? ' avatar--gold' : '')}>{initials(name)}</span>
      <span className="shead__name">{name}</span>
      <span className="shead__line">{line}</span>
    </div>
  )
}

export function Group({ title, foot, children }: { title?: string; foot?: ReactNode; children: ReactNode }) {
  return (
    <section className="sgroup">
      {title ? <h3 className="sgroup__t">{title}</h3> : null}
      <div className="card">{children}</div>
      {foot ? <p className="sgroup__f">{foot}</p> : null}
    </section>
  )
}

export function SRow({ icon, tone = 'navy', label, sub, value, right, onClick, danger }: {
  icon?: IconName; tone?: Tone; label: ReactNode; sub?: ReactNode; value?: ReactNode; right?: ReactNode
  onClick?: () => void; danger?: boolean
}) {
  const inner = (
    <>
      {icon ? <span className={`sico sico--${tone}`}><Icon name={icon} size={16} stroke={2} /></span> : null}
      <span className="slabel">{label}{sub ? <small>{sub}</small> : null}</span>
      {value !== undefined ? <span className="sval">{value}</span> : null}
      {right}
      {onClick && !danger ? <span className="schev"><Icon name="chev" size={16} stroke={2.1} /></span> : null}
    </>
  )
  const cls = 'srow' + (danger ? ' srow--danger' : '') + (icon ? '' : ' srow--plain')
  return onClick
    ? <button className={cls} onClick={() => { haptic(6); onClick() }}>{inner}</button>
    : <div className={cls}>{inner}</div>
}

export function Switch({ on, onChange, disabled, label }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button type="button" role="switch" className="switch" aria-checked={on} aria-label={label} disabled={disabled}
      onClick={() => { haptic(10); onChange(!on) }} />
  )
}
