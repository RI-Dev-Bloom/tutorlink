/* A student's attendance per module, kept small: one line each, a dot for every session their
   tutor (or lecturer) has run this semester, filling in gold one by one for each they came to.
   The count turns gold at 75%, and a star shows at 90%. Private to them.
   Tutorials and lectures are counted apart (PROG6112 tutorials and PROG6112 lectures are two
   separate lines), so they show as two groups. Every module has a line in both from day one. */

import { useEffect, useState } from 'react'
import type { MyAttendance } from '../lib/attendance'
import { Icon } from './icons'

const MAX_DOTS = 10   // more than this, and the rest show as "+N"

/* Counts up from 0 when it first shows. */
function useCountUp(to: number, ms = 700) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setN(to); return }
    let raf = 0; const t0 = performance.now()
    const step = (t: number) => { const k = Math.min(1, (t - t0) / ms); setN(Math.round(to * (1 - (1 - k) ** 3))); if (k < 1) raf = requestAnimationFrame(step) }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [to, ms])
  return n
}

export function AttendanceLines({ rows }: { rows: MyAttendance[] }) {
  const tut = rows.filter(r => r.kind !== 'lecture')
  const lec = rows.filter(r => r.kind === 'lecture')
  return (
    <>
      {tut.length ? (
        <>
          <p className="attl__group">Tutorials</p>
          <div className="card attl">{tut.map(r => <Line key={r.module_code + r.kind} r={r} />)}</div>
        </>
      ) : null}
      {lec.length ? (
        <>
          <p className="attl__group">Lectures</p>
          <div className="card attl">{lec.map(r => <Line key={r.module_code + r.kind} r={r} />)}</div>
        </>
      ) : null}
    </>
  )
}

function Line({ r }: { r: MyAttendance }) {
  const pct = r.held ? r.attended / r.held : 0
  const shown = Math.min(r.held, MAX_DOTS)
  const filled = Math.min(r.attended, shown)
  const n = useCountUp(r.attended)
  return (
    <div className={'attl__row' + (pct >= 0.75 ? ' good' : '')}>
      <span className="attl__label">
        <span className="attl__name">{r.module_name}</span>
      </span>
      <span className="attl__dots" role="img" aria-label={`${r.module_code}: ${r.attended} of ${r.held} sessions`}>
        {Array.from({ length: shown }, (_, i) => (
          <i key={i} className={i < filled ? 'on' : ''} style={i < filled ? { animationDelay: `${120 + i * 70}ms` } : undefined} />
        ))}
        {r.held > shown ? <span className="attl__more">+{r.held - shown}</span> : null}
      </span>
      <span className="attl__n">
        {r.held ? <b>{n}<span>/{r.held}</span></b> : <span>–</span>}
        {pct >= 0.9 ? <Icon name="star" size={12} stroke={2.2} /> : null}
      </span>
    </div>
  )
}
