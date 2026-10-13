/* One thread with one person: a timeline, newest first. Tap a message to read it in full.
   Gold dot: unread. Hollow ring: read. Navy: you sent it ("delivered" until they open it). */

import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../../lib/auth'
import { invalidate, must, useQuery } from '../../lib/data'
import { ago, fullTime, loadThread, roleTag, tagClass, type Message, type Person } from '../../lib/messages'
import { friendlyError, supabase } from '../../lib/supabase'
import { displayName } from '../../lib/types'
import { Icon } from '../../ui/icons'
import { useOverlay } from '../../ui/Overlay'
import { BackButton, Empty, Loading, NavBar } from '../../ui/parts'
import { haptic } from '../../ui/haptic'

export function Thread({ otherId }: { otherId: string }) {
  const { profile } = useAuth()
  const { openSheet } = useOverlay()
  const me = profile!.id
  const thread = useQuery(`thread:${otherId}`, () => loadThread(me, otherId))
  const [open, setOpen] = useState<string | null>(null)

  const t = thread.data
  // Opening the thread marks what they sent as read.
  const unreadIds = (t?.messages ?? []).filter(m => m.sender_id !== me && !m.read_at).map(m => m.id).join()
  useEffect(() => {
    if (!unreadIds || !t?.conversationId) return
    supabase.rpc('mark_conversation_read', { p_conversation: t.conversationId }).then(({ error }) => { if (!error) invalidate('inbox') })
  }, [unreadIds, t?.conversationId])

  if (!t) return (<><NavBar title="Messages" left={<BackButton />} />{thread.error ? <p className="err pad">{thread.error}</p> : <Loading />}</>)
  if (!t.person) return (<><NavBar title="Messages" left={<BackButton />} /><Empty icon="mail" title="Not available" line="You can no longer message this person." /></>)

  const p = t.person
  const compose = (topic = '') => { haptic(8); openSheet(<Compose to={p} topic={topic} />) }

  return (
    <>
      <NavBar title={displayName(p)} left={<BackButton />} />
      <div className="body"><div className="pad pad--fab">
        <p className="small muted" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={tagClass(p)}>{roleTag(p)}</span> Tap a message to read it
        </p>
        {t.messages.length ? (
          <div className="timeline">
            {t.messages.map(m => (
              <Item key={m.id} m={m} mine={m.sender_id === me} other={p} open={open === m.id}
                onToggle={() => { haptic(6); setOpen(o => o === m.id ? null : m.id) }} onReply={() => compose(m.topic.startsWith('Re: ') ? m.topic : `Re: ${m.topic}`)} />
            ))}
          </div>
        ) : <Empty icon="mail" title="Nothing sent yet" line={`Send ${p.full_name.split(' ')[0]} the first message.`} />}
      </div></div>
      <button className="fab fab--low" onClick={() => compose()}>
        <Icon name="plus" size={18} stroke={2.2} /> New message
      </button>
    </>
  )
}

function Item({ m, mine, other, open, onToggle, onReply }: {
  m: Message; mine: boolean; other: Person; open: boolean; onToggle: () => void; onReply: () => void
}) {
  const unread = !mine && !m.read_at
  return (
    <div className={'tl' + (mine ? ' mine' : '') + (unread ? ' unread' : '') + (open ? ' open' : '')}>
      <button className="tl-head" onClick={onToggle} aria-expanded={open}>
        <span className="tl-top">
          <span className="tl-topic">{m.topic}</span>
          <span className="stamp">{ago(m.created_at)}</span>
        </span>
        <span className="tl-who">
          {mine ? <span className="tag tag--you">You</span> : <><span className={tagClass(other)}>{roleTag(other)}</span><span>{other.full_name.split(' ')[0]}</span></>}
          {mine ? <span className="stamp">· {m.read_at ? 'seen' : 'delivered'}</span> : null}
        </span>
      </button>
      <span className="tl-body" style={open ? { maxHeight: 2000 } : undefined} aria-hidden={!open}>
        <span className="txt">{m.body}</span>
        <span className="stamp" style={{ display: 'block', marginTop: 10 }}>{fullTime(m.created_at)}</span>
        {open && !mine ? <button className="btn btn--outline btn--sm" style={{ marginTop: 12 }} onClick={onReply}>Reply</button> : null}
      </span>
    </div>
  )
}

const TOPICS = ['Venue change', 'This week', 'Documents needed', 'Question']

function Compose({ to, topic: initial }: { to: Person; topic: string }) {
  const { closeSheet, toast } = useOverlay()
  const [topic, setTopic] = useState(initial)
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const first = to.full_name.split(' ')[0]

  const send = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      await must(supabase.rpc('send_message', { p_to: to.id, p_topic: topic.trim(), p_body: body.trim() }))
      haptic(16); invalidate('inbox', 'thread'); closeSheet(); toast(`Sent to ${first}`)
    } catch (err) { haptic(24); setError(friendlyError(err)); setBusy(false) }
  }

  return (
    <form onSubmit={send}>
      <p className="sheet-sub">To {displayName(to)}</p>
      <h3 className="sheet-title">{initial ? 'Reply' : 'New message'}</h3>
      <div className="sheet-form">
        {!initial ? (
          <div className="chips" style={{ marginTop: 6 }}>
            {TOPICS.map(t => <button type="button" key={t} className={'chip chip--sm' + (topic === t ? ' on' : '')} onClick={() => { haptic(6); setTopic(t) }}>{t}</button>)}
          </div>
        ) : null}
        <div className="field">
          <label htmlFor="f-tp">Topic</label>
          <input id="f-tp" type="text" maxLength={120} placeholder="What's it about?" value={topic} onChange={e => setTopic(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="f-bd">Message</label>
          <textarea id="f-bd" rows={5} maxLength={4000} value={body} onChange={e => setBody(e.target.value)} />
        </div>
        {error ? <p className="err">{error}</p> : null}
        <button className="btn" style={{ marginTop: 16 }} disabled={busy || !topic.trim() || !body.trim()}>{busy ? 'Sending…' : 'Send'}</button>
      </div>
    </form>
  )
}
