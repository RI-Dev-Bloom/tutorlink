/* A student's attendance per module: one line from 0% to 100%. Private to them.
   The marks at 50% and 75% are the "high points" to aim for. */

import type { MyAttendance } from '../lib/attendance'

export function AttendanceLines({ rows }: { rows: MyAttendance[] }) {
  return (
    <div className="card card--pad">
      {rows.map(r => {
        const pct = r.held ? Math.round((r.attended / r.held) * 100) : 0
        return (
          <div className="att" key={r.module_code}>
            <div className="att__top">
              <span className="att__name">{r.module_name}<span className="mono">{r.module_code}</span></span>
              <span className="att__pct">{r.held ? `${pct}%` : '–'}</span>
            </div>
            <div className="att__track" role="img" aria-label={`${r.module_code}: ${r.attended} of ${r.held} sessions, ${pct}%`}>
              <span className={'att__fill' + (pct >= 75 ? ' high' : '')} style={{ width: `${pct}%` }} />
              <i style={{ left: '50%' }} /><i style={{ left: '75%' }} />
            </div>
            <p className="att__meta">{r.held ? `${r.attended} of ${r.held} session${r.held === 1 ? '' : 's'} this semester` : 'No sessions held yet this semester'}</p>
          </div>
        )
      })}
    </div>
  )
}
