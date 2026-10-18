/* Small shared pieces: header, tab bar, empty state, badges. Same markup as the demo. */

import type { ReactNode } from 'react'
import { Icon, type IconName } from './icons'
import { haptic } from './haptic'
import { useStack } from '../nav/Stack'

export function NavBar({ title, left, right }: { title: string; left?: ReactNode; right?: ReactNode }) {
  return (
    <div className="nav">
      <div className="slot">{left}</div>
      <h1>{title}</h1>
      <div className="slot slot--r">{right}</div>
    </div>
  )
}

export function BackButton() {
  const { back } = useStack()
  return (
    <button className="iconbtn" onClick={back} aria-label="Back">
      <Icon name="back" size={24} stroke={2.1} />
    </button>
  )
}

export type Tab<T extends string> = { id: T; icon: IconName; label: string; count?: number }

export function TabBar<T extends string>({ tabs, current, onChange }: { tabs: Tab<T>[]; current: T; onChange: (t: T) => void }) {
  return (
    <div className="tabbar" role="tablist">
      {tabs.map(t => (
        <button key={t.id} role="tab" aria-selected={t.id === current}
          className={'tab' + (t.id === current ? ' on' : '')}
          onClick={() => { haptic(6); onChange(t.id) }}>
          <span className="wrap">
            <Icon name={t.icon} size={21} />
            {t.count ? <span className={'count' + (t.id === 'inbox' ? ' count--msg' : '')}>{t.count}</span> : null}
          </span>
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  )
}

export function Empty({ title, line, icon = 'inbox', action }: { title: string; line: string; icon?: IconName; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="g"><Icon name={icon} size={24} /></div>
      <h3>{title}</h3>
      <p>{line}</p>
      {action ? <div style={{ marginTop: 20 }}>{action}</div> : null}
    </div>
  )
}

export function Badge({ children, tone }: { children: ReactNode; tone: 'green' | 'red' | 'amber' | 'slate' | 'gold' | 'plain' }) {
  return <span className={`badge badge--${tone}`}>{children}</span>
}

export function Loading() {
  return <div className="loading"><div className="spinner" aria-label="Loading" /></div>
}

export const initials = (n: string) =>
  String(n || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
