/* Messages tab (tutors, lecturers, admin): one row per person, newest first,
   with a blue count for unread. "New message" picks from the people you're allowed to reach. */

import { useMemo, useState } from 'react'
import { useAuth } from '../../lib/auth'
import { useQuery } from '../../lib/data'
import { ago, loadContacts, loadInbox, roleTag, tagClass, type Person } from '../../lib/messages'
import { displayName } from '../../lib/types'
import { useStack } from '../../nav/Stack'
import { Icon } from '../../ui/icons'
import { useOverlay } from '../../ui/Overlay'
import { Empty, Loading, initials } from '../../ui/parts'
import { haptic } from '../../ui/haptic'
import { Thread } from './Thread'

export function Inbox() {
  const { push } = useStack()
  const { openSheet } = useOverlay()
  const inbox = useQuery('inbox', loadInbox)
  const rows = (inbox.data ?? []).filter(r => r.last_at)   // skip threads with nothing in them yet

  return (
    <>
      <div className="pad pad--fab stagger">
        {inbox.loading ? <Loading /> : null}
        {inbox.error ? <p className="err">{inbox.error}</p> : null}
        {inbox.data && !rows.length ? (
          <Empty icon="mail" title="No messages yet" line="Tap New message to send a note about venues, focus areas or missing documents." />
        ) : null}
        {rows.length ? (
          <div className="card">
            {rows.map(r => (
              <button className="row" key={r.conversation_id} onClick={() => push(<Thread otherId={r.other_id} />)}>
                <span className={'avatar' + (r.other_role === 'lecturer' ? ' avatar--gold' : '')}>{initials(r.other_name)}</span>
                <span className="rmain">
                  <span className="rname" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName({ title: r.other_title, full_name: r.other_name })}</span>
                    <span className={tagClass({ role: r.other_role })}>{roleTag({ role: r.other_role, is_tutor: r.other_is_tutor })}</span>
                  </span>
                  <span className="rmeta" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...(r.unread ? { color: 'var(--text)', fontWeight: 600 } : {}) }}>
                    {r.last_from_me ? 'You: ' : ''}{r.last_topic}
                  </span>
                </span>
                <span className="rside" style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                  <span className="stamp">{r.last_at ? ago(r.last_at) : ''}</span>
                  {r.unread ? <span className="unread-count">{r.unread}</span> : null}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <button className="fab" onClick={() => { haptic(8); openSheet(<ContactSheet onPick={id => push(<Thread otherId={id} />)} />) }}>
        <Icon name="plus" size={18} stroke={2.2} /> New message
      </button>
    </>
  )
}

/* Sheets sit outside the screen stack, so the caller passes what to do with the pick. */
function ContactSheet({ onPick }: { onPick: (id: string) => void }) {
  const { profile } = useAuth()
  const { closeSheet } = useOverlay()
  const people = useQuery(`contacts:${profile!.id}`, () => loadContacts(profile!.id))
  const [q, setQ] = useState('')
  const shown = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    return (people.data ?? []).filter(p => words.every(w => `${displayName(p)} ${roleTag(p)}`.toLowerCase().includes(w)))
  }, [people.data, q])

  const pick = (p: Person) => { haptic(8); closeSheet(); onPick(p.id) }

  return (
    <div>
      <p className="sheet-sub">New message</p>
      <h3 className="sheet-title">Who to?</h3>
      {(people.data?.length ?? 0) > 6 ? (
        <div className="field">
          <input type="search" placeholder="Search by name" value={q} onChange={e => setQ(e.target.value)} aria-label="Search people" />
        </div>
      ) : null}
      <div className="card" style={{ marginTop: 12, maxHeight: '48vh', overflowY: 'auto' }}>
        {people.loading ? <Loading /> : null}
        {shown.map(p => (
          <button className="row" key={p.id} onClick={() => pick(p)}>
            <span className={'avatar' + (p.role === 'lecturer' ? ' avatar--gold' : '')}>{initials(p.full_name)}</span>
            <span className="rmain"><span className="rname">{displayName(p)}</span></span>
            <span className="rside"><span className={tagClass(p)}>{roleTag(p)}</span></span>
          </button>
        ))}
        {people.data && !shown.length ? <p className="small muted" style={{ padding: 14 }}>{q ? 'Nobody matches that.' : 'There’s nobody you can message yet.'}</p> : null}
      </div>
      <p className="small muted" style={{ marginTop: 10 }}>Tutors and lecturers can reach each other only if they share a module. Everyone can reach admin.</p>
    </div>
  )
}
