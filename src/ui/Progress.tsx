/* A student's attendance per module as a stamp card: one stamp for every session their tutor (or
   lecturer) has run this semester, filled in gold for each one they came to. Modules earn a seal
   as they go: "Getting there" at half, "On track" at 75%, "Star" at 90%. Private to them. */

import type { MyAttendance } from '../lib/attendance'
import { Icon } from './icons'

const MAX_STAMPS = 16   // more than this, and the rest show as "+N"

const seal = (pct: number, held: number) =>
  !held ? null
    : pct >= 90 ? { label: 'Star', tone: 'star' }
    : pct >= 75 ? { label: 'On track', tone: 'good' }
    : pct >= 50 ? { label: 'Getting there', tone: 'mid' }
    : null

export function AttendanceLines({ rows }: { rows: MyAttendance[] }) {
  const came = rows.reduce((n, r) => n + r.attended, 0)
  const held = rows.reduce((n, r) => n + r.held, 0)
  const pct = held ? Math.round((came / held) * 100) : 0
  const stars = rows.filter(r => r.held && (r.attended / r.held) >= 0.9).length

  return (
    <div className="card card--pad stamps">
      <div className="stamps__head">
        <span className="stamps__big">{came}</span>
        <span className="stamps__sub">
          <b>session{came === 1 ? '' : 's'} attended</b>
          <span>{held ? `${pct}% of all sessions this semester` : 'Your first check-in fills your first stamp'}{stars ? ` · ${stars} star module${stars === 1 ? '' : 's'}` : ''}</span>
        </span>
      </div>

      {rows.map(r => {
        const p = r.held ? Math.round((r.attended / r.held) * 100) : 0
        const s = seal(p, r.held)
        const shown = Math.min(r.held, MAX_STAMPS)
        const filled = Math.min(r.attended, shown)
        return (
          <div className="stamp-row" key={r.module_code + r.kind}>
            <div className="stamp-row__top">
              <span className="att__name">{r.module_name}<span className="mono">{r.module_code}</span>{r.kind === 'lecture' ? <span className="att__kind">Lectures</span> : null}</span>
              {s ? <span className={`seal seal--${s.tone}`}>{s.tone === 'star' ? <Icon name="star" size={12} stroke={2.4} /> : null}{s.label}</span> : null}
            </div>
            <div className="stamp-row__stamps" role="img" aria-label={`${r.module_code}: ${r.attended} of ${r.held} sessions`}>
              {r.held ? Array.from({ length: shown }, (_, i) => (
                <span key={i} className={'stamp' + (i < filled ? ' stamp--on' : '')} style={{ animationDelay: `${i * 40}ms` }}>
                  {i < filled ? <Icon name="check" size={12} stroke={3} /> : null}
                </span>
              )) : <span className="stamp stamp--empty" />}
              {r.held > shown ? <span className="stamp-row__more">+{r.held - shown}</span> : null}
            </div>
            <p className="att__meta">
              {r.held ? `${r.attended} of ${r.held} with your ${r.kind === 'lecture' ? 'lecturer' : 'tutor'}${p >= 75 || !r.held ? '' : ` · ${Math.max(0, Math.ceil(r.held * 0.75) - r.attended)} more to be on track`}`
                : r.kind === 'lecture' ? 'No lectures checked in yet' : 'No tutorials run yet'}
            </p>
          </div>
        )
      })}
    </div>
  )
}
