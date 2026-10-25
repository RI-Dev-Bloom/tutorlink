/* Pieces of the live check-in screen: the counter (a ring that runs down until check-in closes,
   with the count in the middle and the latest arrivals beside it), and the typed code that stays
   blurred until the tutor or lecturer taps it, so a student can't copy it off the screen and
   send it to a friend who isn't there. */

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { initials } from './parts'
import { haptic } from './haptic'

const WINDOWS = [5, 10, 15, 20, 30, 60, 120, 240]   // check-in lengths in minutes, to size the ring

const clock = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000))
  return s >= 3600 ? `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function LiveCounter({ count, closesAt, names, children }: {
  count: number
  closesAt?: string
  names: string[]        // newest first
  children?: ReactNode   // the close button
}) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])
  const left = closesAt ? new Date(closesAt).getTime() - now : 0
  // How long the window was: the smallest usual length that fits what's left when we first see it.
  const total = useRef(0)
  const mins = left / 60000
  if (mins > total.current) total.current = WINDOWS.find(w => w >= mins) ?? Math.ceil(mins)
  const frac = total.current ? Math.min(1, Math.max(0, mins / total.current)) : 0
  const R = 52, C = 2 * Math.PI * R
  const late = left < 60_000

  const shown = names.slice(0, 5)
  return (
    <div className="counter">
      <div className={'counter__ring' + (late ? ' counter__ring--late' : '')}>
        <svg viewBox="0 0 120 120" aria-hidden>
          <circle cx="60" cy="60" r={R} className="counter__track" />
          <circle cx="60" cy="60" r={R} className="counter__time" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} transform="rotate(-90 60 60)" />
        </svg>
        <span className="counter__num" key={count} aria-live="polite">{count}</span>
        <span className="counter__label">checked in</span>
      </div>
      <div className="counter__side">
        <span className="counter__eyebrow">Closes in</span>
        <span className="counter__clock">{clock(left)}</span>
        <div className="counter__faces" aria-label={shown.length ? `Latest: ${shown.join(', ')}` : undefined}>
          {shown.length ? shown.map((n, i) => <span key={n + i} className="counter__face" title={n}>{initials(n)}</span>) : <span className="counter__wait">Waiting for the first scan…</span>}
          {names.length > shown.length ? <span className="counter__more">+{names.length - shown.length}</span> : null}
        </div>
        {children}
      </div>
    </div>
  )
}

/* The typed code under the QR: blurred until tapped, and blurred again after 30 seconds. */
export function HiddenCode({ code, className }: { code?: string; className: string }) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    if (!shown) return
    const t = window.setTimeout(() => setShown(false), 30_000)
    return () => clearTimeout(t)
  }, [shown])
  return (
    <button type="button" className={'hidecode ' + className + (shown ? '' : ' hidecode--off')}
      onClick={() => { haptic(6); setShown(s => !s) }} aria-label={shown ? `Code ${code}. Tap to hide` : 'Code hidden. Tap to show'}>
      <span className="hidecode__text">{code}</span>
      <span className="hidecode__tag">{shown ? 'Tap to hide' : 'Tap to show the code'}</span>
    </button>
  )
}
