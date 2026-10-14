/* Admin → Semester pay: the pay sheet for the end of a semester. Every tutor's confirmed
   sessions and total, anything still waiting to be confirmed, and a CSV for finance. */

import { useMemo, useState } from 'react'
import { must, useQuery } from '../../lib/data'
import { supabase } from '../../lib/supabase'
import { SESSION_COLS, currentSemester, isEarned, loadSemesters, needsConfirming, type Session } from '../../lib/tutors'
import { fDate, rand, todayISO } from '../../lib/types'
import { useStack } from '../../nav/Stack'
import { Icon } from '../../ui/icons'
import { useOverlay } from '../../ui/Overlay'
import { BackButton, Badge, Empty, Loading, NavBar, initials } from '../../ui/parts'
import { haptic } from '../../ui/haptic'
import { TutorDetail } from './TutorDetail'

type Who = { id: string; full_name: string; student_number: string | null; email: string }
type PaySession = Session & { tutor: Who | null }

const loadSemesterSessions = async (semId: string) =>
  (await must(supabase.from('sessions')
    .select(`${SESSION_COLS}, tutor:profiles!sessions_tutor_id_fkey(id, full_name, student_number, email)`)
    .eq('semester_id', semId).eq('kind', 'tutorial').neq('status', 'cancelled').returns<PaySession[]>())) ?? []

export function SemesterPay() {
  const { push } = useStack()
  const { toast } = useOverlay()
  const semesters = useQuery('semesters', loadSemesters)
  const [picked, setPicked] = useState<string | null>(null)
  const sem = (semesters.data ?? []).find(s => s.id === picked) ?? (semesters.data ? currentSemester(semesters.data) : null)
  const sessions = useQuery(`sessions:semester:${sem?.id ?? ''}`, () => sem ? loadSemesterSessions(sem.id) : Promise.resolve([]))
  const today = todayISO()

  const rows = useMemo(() => {
    const by = new Map<string, { who: Who; confirmed: number; hours: number; amount: number; waiting: number }>()
    for (const s of sessions.data ?? []) {
      if (!s.tutor) continue
      const r = by.get(s.tutor_id) ?? { who: s.tutor, confirmed: 0, hours: 0, amount: 0, waiting: 0 }
      if (isEarned(s)) { r.confirmed++; r.hours += Number(s.hours); r.amount += Number(s.amount ?? 0) }
      else if (needsConfirming(s)) r.waiting++
      by.set(s.tutor_id, r)
    }
    return [...by.values()].filter(r => r.confirmed || r.waiting).sort((a, b) => a.who.full_name.localeCompare(b.who.full_name))
  }, [sessions.data])

  const total = rows.reduce((n, r) => n + r.amount, 0)
  const confirmedN = rows.reduce((n, r) => n + r.confirmed, 0)
  const waitingN = rows.reduce((n, r) => n + r.waiting, 0)
  const ended = !!sem && sem.ends_on < today
  const paidTutors = rows.filter(r => r.confirmed).length

  const exportCsv = () => {
    if (!sem) return
    const out = [['Tutor', 'Student number', 'Email', 'Confirmed sessions', 'Hours', 'Amount (R)']]
    for (const r of rows.filter(r => r.confirmed)) out.push([r.who.full_name, r.who.student_number ?? '', r.who.email, String(r.confirmed), String(r.hours), String(r.amount)])
    out.push([], ['Total', '', '', String(confirmedN), String(rows.reduce((n, r) => n + r.hours, 0)), String(total)])
    const csv = out.map(r => r.map(c => /[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: `TutorLink pay sheet - ${sem.name}.csv` })
    document.body.append(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    haptic(12); toast('Pay sheet downloaded')
  }

  return (
    <>
      <NavBar title="Semester pay" left={<BackButton />} />
      <div className="body"><div className="pad stagger">
        {(semesters.data?.length ?? 0) > 1 ? (
          <div className="filters">
            {semesters.data!.map(s => (
              <button key={s.id} className={'chip' + (s.id === sem?.id ? ' on' : '')} onClick={() => { haptic(6); setPicked(s.id) }}>{s.name}</button>
            ))}
          </div>
        ) : null}

        {!sem ? <Empty icon="wallet" title="No semesters yet" line="Add a semester in Settings first." /> : (
          <>
            <div className="ledger" style={{ marginTop: 14 }}>
              <p className="eyebrow ledger__label">{sem.name} · {ended ? 'ended' : 'so far'}</p>
              <div className="money">{rand(total)}</div>
              <p className="ledger__sub">{confirmedN} confirmed session{confirmedN === 1 ? '' : 's'} · {paidTutors} tutor{paidTutors === 1 ? '' : 's'}</p>
              <p className="ledger__foot"><Icon name="cal" size={14} />
                {ended ? `The semester ended on ${fDate(sem.ends_on)}. This is what Rosebank pays out.` : `Paid out after the semester ends on ${fDate(sem.ends_on)}. It grows as you confirm sessions.`}</p>
            </div>

            {waitingN ? (
              <div className="note note--amber" style={{ marginTop: 12 }}><Icon name="alert" size={15} />
                <span><b>{waitingN} session{waitingN === 1 ? '' : 's'}</b> still need{waitingN === 1 ? 's' : ''} confirming. Only confirmed sessions are on the pay sheet.</span></div>
            ) : null}

            <div className="sect">Per tutor</div>
            {sessions.loading ? <Loading /> : rows.length ? (
              <div className="card">
                {rows.map(r => (
                  <button className="row" key={r.who.id} onClick={() => push(<TutorDetail id={r.who.id} />)}>
                    <span className="avatar">{initials(r.who.full_name)}</span>
                    <span className="rmain">
                      <span className="rname">{r.who.full_name}</span>
                      <span className="rmeta">{r.confirmed} confirmed · {r.hours} h{r.who.student_number ? <> · <span className="mono">{r.who.student_number}</span></> : null}</span>
                    </span>
                    <span className="rside">
                      {r.waiting ? <Badge tone="amber">{r.waiting} to confirm</Badge> : null}
                      <span className="small" style={{ fontWeight: 700, color: 'var(--text)' }}>{rand(r.amount)}</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : <p className="small muted">No sessions confirmed in {sem.name} yet.</p>}

            <button className="btn" style={{ marginTop: 16 }} disabled={!confirmedN} onClick={exportCsv}>
              <Icon name="down" size={16} /> Download pay sheet (CSV)
            </button>
            <p className="small muted" style={{ marginTop: 10, textAlign: 'center' }}>For finance: one line per tutor, with the total.</p>
          </>
        )}
      </div></div>
    </>
  )
}
