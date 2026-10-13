/* Tutor → Schedule (home). Sessions to mark, what's coming up, what admin still
   has to confirm, and how much of the semester's limit is used. */

import { useState, type FormEvent } from 'react'
import { useAuth } from '../../lib/auth'
import { must } from '../../lib/data'
import { friendlyError, supabase } from '../../lib/supabase'
import { hhmm, fDay, type Session } from '../../lib/tutors'
import { todayISO } from '../../lib/types'
import { Icon } from '../../ui/icons'
import { useOverlay } from '../../ui/Overlay'
import { Badge, Empty, Loading } from '../../ui/parts'
import { haptic } from '../../ui/haptic'
import { refreshMine, useMine } from './mine'

export function TutorSchedule({ go }: { go: (tab: string) => void }) {
  const { profile } = useAuth()
  const { openSheet } = useOverlay()
  const m = useMine()
  const today = todayISO()

  if (m.loading) return <Loading />
  if (m.error || !m.d) return <p className="err pad">{m.error}</p>

  const all = m.d.sessions
  const toMark = all.filter(s => s.status === 'scheduled' && s.session_date <= today)
  const coming = all.filter(s => s.session_date > today && (s.status === 'scheduled' || s.status === 'cancelled')).slice(0, 8)
  const waiting = all.filter(s => s.status === 'logged')
  const first = profile!.full_name.split(' ')[0]

  return (
    <div className="pad stagger">
      <p className="eyebrow">Welcome back</p>
      <h2 className="display display--sm">{first}</h2>
      <div className="chips" style={{ marginTop: 10 }}>
        {m.d.tutor.tutor_modules.map(t => <span key={t.module_code} className="chip chip--static chip--sm"><span className="code">{t.module_code}</span>{t.modules?.name}</span>)}
      </div>

      {m.sem ? (
        <div className="card card--pad" style={{ marginTop: 16 }}>
          <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
            <span className="rname">{m.used} of {m.limit} sessions used</span>
            <span className="small muted">{m.left} left</span>
          </span>
          <span className="quota"><span style={{ width: `${m.limit ? Math.min(100, (m.used / m.limit) * 100) : 0}%` }} data-full={m.used >= m.limit || undefined} /></span>
          <span className="rmeta">{m.sem.name}. Cancelled sessions don't count.</span>
        </div>
      ) : null}

      {toMark.length ? (
        <>
          <div className="sect">To mark</div>
          <div className="card">
            {toMark.map(s => (
              <div className="row" key={s.id}>
                <span className={'avatar avatar--code' + (s.session_date === today ? ' avatar--gold' : '')}>{s.module_code.slice(0, 4)}</span>
                <span className="rmain">
                  <span className="rname">{s.session_date === today ? 'Today' : fDay(s.session_date)}{s.starts_at ? ` · ${hhmm(s.starts_at)}–${hhmm(s.ends_at)}` : ''}</span>
                  <span className="rmeta"><span className="mono">{s.module_code}</span>{s.venue ? ` · ${s.venue}` : ''}</span>
                </span>
                <span className="rside">
                  <button className="btn btn--sm" onClick={() => { haptic(8); openSheet(<MarkSheet session={s} />) }}>Mark</button>
                </span>
              </div>
            ))}
          </div>
          <p className="small muted" style={{ marginTop: 8 }}>After each session, tap Mark and say how many students came.</p>
        </>
      ) : null}

      <div className="sect">Coming up</div>
      {coming.length ? (
        <div className="card">
          {coming.map(s => (
            <div className="row" key={s.id}>
              <span className="avatar avatar--code">{s.module_code.slice(0, 4)}</span>
              <span className="rmain">
                <span className="rname" style={s.status === 'cancelled' ? { color: 'var(--muted)', textDecoration: 'line-through' } : undefined}>
                  {fDay(s.session_date)}{s.starts_at ? ` · ${hhmm(s.starts_at)}–${hhmm(s.ends_at)}` : ''}
                </span>
                <span className="rmeta"><span className="mono">{s.module_code}</span>{s.venue ? ` · ${s.venue}` : ''}</span>
              </span>
              <span className="rside">{s.status === 'cancelled' ? <Badge tone="plain">Cancelled</Badge> : null}</span>
            </div>
          ))}
        </div>
      ) : (
        <Empty icon="cal" title="Nothing scheduled" line="Admin sets your weekly session time. It'll show up here." />
      )}

      {waiting.length ? (
        <>
          <div className="sect">Waiting for admin</div>
          <button className="note note--gold" style={{ width: '100%', textAlign: 'left' }} onClick={() => { haptic(8); go('sessions') }}>
            <Icon name="clock" size={15} />
            <span><b>{waiting.length} session{waiting.length === 1 ? '' : 's'}</b> marked and waiting to be confirmed. Upload the signed register so admin can check it.</span>
          </button>
        </>
      ) : null}
    </div>
  )
}

function MarkSheet({ session: s }: { session: Session }) {
  const { closeSheet, toast } = useOverlay()
  const [n, setN] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      await must(supabase.rpc('tutor_mark_session', { p_session: s.id, p_students: +n }))
      haptic(16); refreshMine(); closeSheet(); toast('Marked — admin will confirm it')
    } catch (err) { haptic(24); setError(friendlyError(err)); setBusy(false) }
  }

  return (
    <form onSubmit={save}>
      <p className="sheet-sub">{s.module_code} · {fDay(s.session_date)}</p>
      <h3 className="sheet-title">How many students came?</h3>
      <p className="sheet-lead">Count everyone who signed the register. Admin confirms it, and then it's paid.</p>
      <div className="sheet-form">
        <div className="field">
          <label htmlFor="f-n">Students</label>
          <input id="f-n" type="text" inputMode="numeric" maxLength={3} autoFocus value={n} onChange={e => setN(e.target.value.replace(/\D/g, ''))} />
        </div>
        {error ? <p className="err">{error}</p> : null}
        <button className="btn" style={{ marginTop: 16 }} disabled={busy || n === ''}>{busy ? 'Saving…' : 'Mark session'}</button>
      </div>
    </form>
  )
}
