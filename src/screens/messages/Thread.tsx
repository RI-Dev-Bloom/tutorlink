/* One thread with one person: a timeline, newest first. Tap a message to read it in full.
   Blue dot: unread. Hollow ring: read. Navy: you sent it ("delivered" until they open it).
   A message can carry one file; files are removed after admin's setting (3–5 days). */

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useAuth } from '../../lib/auth'
import { invalidate, must, useQuery } from '../../lib/data'
import { ago, fullTime, loadThread, roleTag, tagClass, type Message, type Person } from '../../lib/messages'
import { friendlyError, supabase } from '../../lib/supabase'
import { displayName } from '../../lib/types'
import { ATTACH_ACCEPT, attachType, fSize, prepareUpload } from '../../lib/files'
import { loadSettings } from '../../lib/student'
import { Icon } from '../../ui/icons'
import { useOverlay } from '../../ui/Overlay'
import { BackButton, Empty, Loading, NavBar } from '../../ui/parts'
import { haptic } from '../../ui/haptic'

export function Thread({ otherId }: { otherId: string }) {
  const { profile } = useAuth()
  const { openSheet } = useOverlay()
  const me = profile!.id
  const thread = useQuery(`thread:${otherId}`, () => loadThread(me, otherId))
  const days = useQuery('settings', loadSettings).data?.file_days ?? 3
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
  const compose = (topic = '') => { haptic(8); openSheet(<Compose to={p} topic={topic} days={days} />) }

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
              <Item key={m.id} m={m} mine={m.sender_id === me} other={p} open={open === m.id} days={days}
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

function Item({ m, mine, other, open, days, onToggle, onReply }: {
  m: Message; mine: boolean; other: Person; open: boolean; days: number; onToggle: () => void; onReply: () => void
}) {
  const unread = !mine && !m.read_at
  return (
    <div className={'tl' + (mine ? ' mine' : '') + (unread ? ' unread' : '') + (open ? ' open' : '')}>
      <button className="tl-head" onClick={onToggle} aria-expanded={open}>
        <span className="tl-top">
          <span className="tl-topic">{m.topic}{m.file_name ? <span className="tl-clip" aria-label="Has a file"><Icon name="attach" size={14} /></span> : null}</span>
          <span className="stamp">{ago(m.created_at)}</span>
        </span>
        <span className="tl-who">
          {mine ? <span className="tag tag--you">You</span> : <><span className={tagClass(other)}>{roleTag(other)}</span><span>{other.full_name.split(' ')[0]}</span></>}
          {mine ? <span className="stamp">· {m.read_at ? 'seen' : 'delivered'}</span> : null}
        </span>
      </button>
      <span className="tl-body" style={open ? { maxHeight: 2000 } : undefined} aria-hidden={!open}>
        {m.body ? <span className="txt">{m.body}</span> : null}
        {m.file_name && open ? <FileCard m={m} days={days} /> : null}
        <span className="stamp" style={{ display: 'block', marginTop: 10 }}>{fullTime(m.created_at)}</span>
        {open && !mine ? <button className="btn btn--outline btn--sm" style={{ marginTop: 12 }} onClick={onReply}>Reply</button> : null}
      </span>
    </div>
  )
}

/* The file on a message: tap to open it while it's still there. */
function FileCard({ m, days }: { m: Message; days: number }) {
  const gone = new Date(m.created_at).getTime() + days * 86_400_000
  const left = gone - Date.now()
  const removed = !m.file_path || left <= 0
  const url = useQuery(`file-url:${m.file_path ?? ''}`, async () =>
    removed ? '' : (await must(supabase.storage.from('attachments').createSignedUrl(m.file_path!, 3600)))?.signedUrl ?? '')
  const daysLeft = Math.ceil(left / 86_400_000)
  const meta = removed
    ? `Removed after ${days} days`
    : [m.file_size ? fSize(m.file_size) : null, left < 86_400_000 ? 'removed later today' : `removed in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`].filter(Boolean).join(' · ')
  const inner = (
    <>
      <span className="file__ico"><Icon name={removed ? 'clock' : 'doc'} size={17} /></span>
      <span className="file__main"><span className="file__name">{m.file_name}</span><span className="file__meta">{meta}</span></span>
    </>
  )
  if (removed) return <span className="file file--gone">{inner}</span>
  return url.data
    ? <a className="file" href={url.data} target="_blank" rel="noreferrer">{inner}<Icon name="chev" size={16} stroke={2.1} /></a>
    : <span className="file">{inner}</span>
}

const TOPICS = ['Venue change', 'This week', 'Documents needed', 'Question']

function Compose({ to, topic: initial, days }: { to: Person; topic: string; days: number }) {
  const { profile } = useAuth()
  const { closeSheet, toast } = useOverlay()
  const [topic, setTopic] = useState(initial)
  const [body, setBody] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState<'' | 'upload' | 'send'>('')
  const [error, setError] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const first = to.full_name.split(' ')[0]

  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setError('')
    if (!attachType(f)) { setError('That kind of file can’t be sent. Use a PDF, a photo, or an Office document'); return }
    const ready = await prepareUpload(f)
    if (ready.size > 10_000_000) { setError(`That file is ${fSize(ready.size)}. The limit is 10 MB`); return }
    haptic(10); setFile(ready)
  }

  const send = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      let p_file = null
      if (file) {
        setBusy('upload')
        const t = attachType(file)!
        const path = `${profile!.id}/${Date.now()}.${t.ext}`
        await must(supabase.storage.from('attachments').upload(path, file, { contentType: t.type }))
        p_file = { path, name: file.name, size: file.size, type: t.type }
      }
      setBusy('send')
      await must(supabase.rpc('send_message', { p_to: to.id, p_topic: topic.trim(), p_body: body.trim(), p_file }))
      haptic(16); invalidate('inbox', 'thread'); closeSheet(); toast(`Sent to ${first}`)
    } catch (err) { haptic(24); setError(friendlyError(err)); setBusy('') }
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
        <input ref={input} type="file" accept={ATTACH_ACCEPT} onChange={pick} hidden />
        {file ? (
          <div className="file">
            <span className="file__ico"><Icon name="doc" size={17} /></span>
            <span className="file__main"><span className="file__name">{file.name}</span><span className="file__meta">{fSize(file.size)} · removed {days} days after sending</span></span>
            <button type="button" className="iconbtn" aria-label="Remove the file" onClick={() => { haptic(6); setFile(null) }}><Icon name="x" size={16} /></button>
          </div>
        ) : (
          <button type="button" className="btn btn--outline btn--sm" style={{ marginTop: 12 }} onClick={() => input.current?.click()}>
            <Icon name="attach" size={16} /> Attach a file
          </button>
        )}
        {error ? <p className="err">{error}</p> : null}
        <button className="btn" style={{ marginTop: 16 }} disabled={!!busy || !topic.trim() || (!body.trim() && !file)}>
          {busy === 'upload' ? 'Uploading file…' : busy ? 'Sending…' : 'Send'}
        </button>
        {!file ? <p className="small muted" style={{ marginTop: 8 }}>Files are removed {days} days after they're sent.</p> : null}
      </div>
    </form>
  )
}
