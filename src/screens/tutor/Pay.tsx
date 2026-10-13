/* Tutor → Pay: what admin has approved, what's still waiting, what's been paid,
   and a CSV statement. The app tracks pay; Rosebank pays as usual. */

import { useAuth } from '../../lib/auth'
import { fDay, owed, type Session } from '../../lib/tutors'
import { rand, todayISO } from '../../lib/types'
import { Icon } from '../../ui/icons'
import { useOverlay } from '../../ui/Overlay'
import { Badge, Loading } from '../../ui/parts'
import { haptic } from '../../ui/haptic'
import { useMine } from './mine'

export function TutorPay() {
  const { profile } = useAuth()
  const { toast } = useOverlay()
  const m = useMine()

  if (m.loading) return <Loading />
  if (m.error || !m.d) return <p className="err pad">{m.error}</p>

  const all = m.d.sessions
  const confirmed = all.filter(s => s.status === 'confirmed')
  const waiting = all.filter(s => s.status === 'logged')
  const paid = all.filter(s => s.status === 'paid')
  const sum = (list: Session[]) => list.reduce((n, s) => n + Number(s.rate ?? 0), 0)
  const paidThisSem = sum(paid.filter(s => s.semester_id === m.sem?.id))
  const statement = [...confirmed, ...paid].sort((a, b) => b.session_date.localeCompare(a.session_date))

  const exportCsv = () => {
    const rows = [['Date', 'Module', 'Students', 'Status', 'Rate (R)', 'Paid on']]
    for (const s of [...statement].reverse()) {
      rows.push([s.session_date, s.module_code, String(s.students_attended ?? ''), s.status === 'paid' ? 'Paid' : 'Approved', String(Number(s.rate ?? 0)), s.paid_at?.slice(0, 10) ?? ''])
    }
    const csv = rows.map(r => r.map(c => /[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }))   // BOM so Excel reads it right
    const a = Object.assign(document.createElement('a'), {
      href: url, download: `TutorLink statement - ${profile!.full_name} - ${todayISO()}.csv`,
    })
    document.body.append(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    haptic(12); toast('Statement downloaded')
  }

  return (
    <div className="pad stagger">
      <div className="card card--pad card--gold">
        <p className="eyebrow" style={{ marginBottom: 6 }}>Approved, not paid yet</p>
        <div className="money">{rand(owed(all))}</div>
        <p className="small muted" style={{ marginTop: 8 }}>{confirmed.length} confirmed session{confirmed.length === 1 ? '' : 's'}</p>
        <div style={{ marginTop: 14, borderTop: '1px solid var(--lineS)', paddingTop: 6 }}>
          <div className="payrow"><span className="muted">Rate per session</span><span style={{ fontWeight: 600 }}>{rand(m.rate)}</span></div>
          <div className="payrow"><span className="muted">Waiting for admin ({waiting.length})</span><span style={{ fontWeight: 600, color: 'var(--amber)' }}>about {rand(waiting.length * m.rate)}</span></div>
          <div className="payrow"><span className="muted">Paid this semester</span><span style={{ fontWeight: 600, color: 'var(--green)' }}>{rand(paidThisSem)}</span></div>
          <div className="payrow"><span className="muted">Paid in total</span><span style={{ fontWeight: 600 }}>{rand(sum(paid))}</span></div>
        </div>
      </div>

      <div className="sect">Statement</div>
      {statement.length ? (
        <div className="card">
          {statement.map(s => (
            <div className="row" key={s.id}>
              <span className="avatar avatar--code">{s.module_code.slice(0, 4)}</span>
              <span className="rmain">
                <span className="rname">{fDay(s.session_date)}</span>
                <span className="rmeta"><span className="mono">{s.module_code}</span>{s.students_attended !== null ? ` · ${s.students_attended} students` : ''}</span>
              </span>
              <span className="rside">
                <span className="small" style={{ fontWeight: 700 }}>{rand(Number(s.rate ?? 0))}</span>
                <Badge tone={s.status === 'paid' ? 'green' : 'gold'}>{s.status === 'paid' ? 'Paid' : 'Approved'}</Badge>
              </span>
            </div>
          ))}
        </div>
      ) : <p className="small muted">Nothing confirmed yet. Sessions show up here once admin confirms them.</p>}

      <button className="btn btn--outline" style={{ marginTop: 16 }} disabled={!statement.length} onClick={exportCsv}>
        <Icon name="down" size={16} /> Download statement (CSV)
      </button>
      <p className="small muted" style={{ marginTop: 10 }}>The app keeps track of what you're owed. Rosebank pays you as usual.</p>
    </div>
  )
}
