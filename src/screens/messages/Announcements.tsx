/* Announcements from the programme office.
   Students: live ones sit on the Home feed (× closes one there), and every announcement stays in Messages
   with its end date. Admin posts them from Messages → Announcements: an image, a title and a line of text,
   each optional, shown for 1 day to 2 weeks or until the event date. The image goes when it ends. */

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useAuth } from '../../lib/auth'
import { invalidate, must, useQuery } from '../../lib/data'
import { DURATIONS, fDay, isLive, lastDay, loadAnnouncements, signedImage, useClosedAnnouncements, type Announcement } from '../../lib/announcements'
import { fSize, prepareUpload } from '../../lib/files'
import { friendlyError, supabase } from '../../lib/supabase'
import { todayISO } from '../../lib/types'
import { useStack } from '../../nav/Stack'
import { Icon } from '../../ui/icons'
import { useOverlay } from '../../ui/Overlay'
import { BackButton, Badge, Empty, Loading, NavBar } from '../../ui/parts'
import { haptic } from '../../ui/haptic'

/* Coming back to the app shows anything posted in the meantime. */
function useAnnouncements() {
  const q = useQuery('announcements', loadAnnouncements)
  useEffect(() => {
    const back = () => { if (document.visibilityState === 'visible') q.reload() }
    document.addEventListener('visibilitychange', back)
    return () => document.removeEventListener('visibilitychange', back)
  }, [q.reload])
  return q
}

/* ---------- one announcement ------------------------------ */

function Picture({ path }: { path: string }) {
  const url = useQuery(`ann-img:${path}`, () => signedImage(path))
  if (!url.data) return <span className="ann__img ann__img--wait" />
  return (
    <a className="ann__imglink" href={url.data} target="_blank" rel="noreferrer" aria-label="Open the image">
      <img className="ann__img" src={url.data} alt="" loading="lazy" />
    </a>
  )
}

function Card({ a, onClose, admin }: { a: Announcement; onClose?: () => void; admin?: boolean }) {
  const live = isLive(a)
  return (
    <article className={'ann' + (live ? '' : ' ann--ended')}>
      {onClose ? <button className="iconbtn setup__x ann__x" aria-label="Close" onClick={onClose}><Icon name="x" size={16} /></button> : null}
      {a.image_path && live ? <Picture path={a.image_path} /> : null}
      <div className="ann__text" style={onClose && !(a.image_path && live) ? { paddingRight: 44 } : undefined}>
        {a.title ? <h3 className="ann__title">{a.title}</h3> : null}
        {a.body ? <p className="ann__body">{a.body}</p> : null}
        {!live && (a.image_path || a.image_removed_at) ? <p className="ann__gone"><Icon name="clock" size={13} /> Image removed when it ended</p> : null}
        <p className="ann__meta">
          {a.event_date ? <><Badge tone="gold">{fDay(a.event_date)}</Badge> </> : null}
          <span className="stamp">{live ? `Showing until ${lastDay(a)}` : `Ended ${lastDay(a)}`}{admin ? ` · posted ${fDay(a.created_at)}` : ''}</span>
        </p>
        {admin ? <AdminActions a={a} /> : null}
      </div>
    </article>
  )
}

function AdminActions({ a }: { a: Announcement }) {
  const { toast } = useOverlay()
  const [sure, setSure] = useState(false)
  const [busy, setBusy] = useState(false)
  const run = async (fn: () => PromiseLike<{ data: unknown; error: unknown }>, done: string) => {
    setBusy(true)
    try { await must(fn()); haptic(16); invalidate('announcements'); toast(done) }
    catch (e) { haptic(24); toast(friendlyError(e)) }
    setBusy(false); setSure(false)
  }
  return (
    <div className="btnrow" style={{ marginTop: 12 }}>
      {isLive(a) ? (
        <button className="btn btn--outline btn--sm" disabled={busy}
          onClick={() => run(() => supabase.from('announcements').update({ ends_at: new Date().toISOString() }).eq('id', a.id), 'Ended. Students no longer see it on Home')}>
          End now
        </button>
      ) : null}
      <button className={'btn btn--sm ' + (sure ? 'btn--danger' : 'btn--ghost')} disabled={busy}
        onClick={() => sure ? run(() => supabase.from('announcements').delete().eq('id', a.id), 'Announcement removed') : (haptic(16), setSure(true))}>
        {sure ? 'Yes, remove it' : 'Remove'}
      </button>
    </div>
  )
}

/* ---------- student Home feed ------------------------------ */

export function AnnouncementFeed({ go }: { go: (tab: string) => void }) {
  const { profile } = useAuth()
  const all = useAnnouncements()
  const [closed, close] = useClosedAnnouncements(profile!.id)
  const shown = (all.data ?? []).filter(a => isLive(a) && !closed.includes(a.id))
  if (!shown.length) return null
  return (
    <>
      <div className="sect" style={{ marginTop: 24 }}>
        <span>Announcements</span>
        <button className="link" onClick={() => { haptic(8); go('inbox') }}>All ›</button>
      </div>
      <div className="ann-list">
        {shown.map(a => <Card key={a.id} a={a} onClose={() => close(a.id)} />)}
      </div>
    </>
  )
}

/* ---------- every announcement (Messages) ------------------ */

export function AnnouncementList({ admin }: { admin?: boolean }) {
  const all = useAnnouncements()
  const list = all.data ?? []
  const live = list.filter(isLive), ended = list.filter(a => !isLive(a))
  return (
    <div className={'pad stagger' + (admin ? ' pad--fab' : '')}>
      {all.loading ? <Loading /> : null}
      {all.error ? <p className="err">{all.error}</p> : null}
      {all.data && !list.length ? (
        <Empty icon="megaphone" title="No announcements yet"
          line={admin ? 'Tap New announcement to tell every student about a new timetable, an event or a venue change.' : 'News from the programme office shows up here, like a new timetable or an event.'} />
      ) : null}
      {live.length ? (
        <>
          <div className="sect">Showing now</div>
          <div className="ann-list">{live.map(a => <Card key={a.id} a={a} admin={admin} />)}</div>
        </>
      ) : null}
      {ended.length ? (
        <>
          <div className="sect" style={{ marginTop: live.length ? 24 : undefined }}>Earlier</div>
          <div className="ann-list">{ended.map(a => <Card key={a.id} a={a} admin={admin} />)}</div>
        </>
      ) : null}
    </div>
  )
}

/* Tutors and admin reach the list from a row at the top of Messages. */
export function AnnouncementsRow() {
  const { push } = useStack()
  const all = useQuery('announcements', loadAnnouncements)
  const live = (all.data ?? []).filter(isLive).length
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <button className="row" onClick={() => { haptic(8); push(<AnnouncementsScreen />) }}>
        <span className="avatar avatar--gold"><Icon name="megaphone" size={18} /></span>
        <span className="rmain">
          <span className="rname">Announcements</span>
          <span className="rmeta">{all.data === undefined ? ' ' : live ? `${live} showing to students now` : 'From the programme office to every student'}</span>
        </span>
        <span className="rside"><Icon name="chev" size={17} stroke={2.1} /></span>
      </button>
    </div>
  )
}

export function AnnouncementsScreen() {
  const { profile } = useAuth()
  const { openSheet } = useOverlay()
  const admin = profile?.role === 'admin'
  return (
    <>
      <NavBar title="Announcements" left={<BackButton />} />
      <div className="body"><AnnouncementList admin={admin} /></div>
      {admin ? (
        <button className="fab fab--low" onClick={() => { haptic(8); openSheet(<NewAnnouncement />) }}>
          <Icon name="plus" size={18} stroke={2.2} /> New announcement
        </button>
      ) : null}
    </>
  )
}

/* ---------- admin: post one -------------------------------- */

const QUICK = ['New timetable is out', 'Venue change', 'Exam reminder', 'Tutoring this week']
const IMAGE_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

function NewAnnouncement() {
  const { profile } = useAuth()
  const { closeSheet, toast } = useOverlay()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [days, setDays] = useState(7)
  const [event, setEvent] = useState('')
  const [busy, setBusy] = useState<'' | 'upload' | 'post'>('')
  const [error, setError] = useState('')
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!image) { setPreview(''); return }
    const u = URL.createObjectURL(image)
    setPreview(u)
    return () => URL.revokeObjectURL(u)
  }, [image])

  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setError('')
    if (!f.type.startsWith('image/')) { setError('Choose a photo or picture (JPG, PNG or WebP)'); return }
    const ready = await prepareUpload(f)
    if (!IMAGE_TYPES[ready.type]) { setError('That picture type can’t be used. Use a JPG, PNG or WebP'); return }
    if (ready.size > 10_000_000) { setError(`That image is ${fSize(ready.size)}. The limit is 10 MB`); return }
    haptic(10); setImage(ready)
  }

  // When it will stop showing: after the chosen time, or at the end of the event day if sooner.
  const byDays = new Date(Date.now() + days * 86_400_000)
  const byEvent = event ? new Date(event + 'T23:59:00+02:00') : null
  const ends = byEvent && byEvent < byDays ? event : byDays.toISOString()

  const post = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      let path: string | null = null
      if (image) {
        setBusy('upload')
        path = `${profile!.id}/${Date.now()}.${IMAGE_TYPES[image.type]}`
        await must(supabase.storage.from('announcements').upload(path, image, { contentType: image.type }))
      }
      setBusy('post')
      await must(supabase.rpc('post_announcement', { p_title: title.trim(), p_body: body.trim(), p_image: path, p_days: days, p_event: event || null }))
      haptic(16); invalidate('announcements'); closeSheet(); toast('Posted to every student')
    } catch (err) { haptic(24); setError(friendlyError(err)); setBusy('') }
  }

  return (
    <form onSubmit={post}>
      <p className="sheet-sub">To every student</p>
      <h3 className="sheet-title">New announcement</h3>
      <div className="sheet-form">
        <input ref={input} type="file" accept="image/*" onChange={pick} hidden />
        {preview ? (
          <div className="ann-pick">
            <img src={preview} alt="The image you picked" />
            <button type="button" className="iconbtn ann-pick__x" aria-label="Remove the image" onClick={() => { haptic(6); setImage(null) }}><Icon name="x" size={16} /></button>
          </div>
        ) : (
          <button type="button" className="btn btn--outline btn--sm" style={{ marginTop: 6 }} onClick={() => input.current?.click()}>
            <Icon name="upload" size={16} /> Add an image
          </button>
        )}
        <div className="chips" style={{ marginTop: 14 }}>
          {QUICK.map(t => <button type="button" key={t} className={'chip chip--sm' + (title === t ? ' on' : '')} onClick={() => { haptic(6); setTitle(t) }}>{t}</button>)}
        </div>
        <div className="field">
          <label htmlFor="f-at">Title <span className="muted">(optional)</span></label>
          <input id="f-at" type="text" maxLength={120} value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="f-ab">Text <span className="muted">(optional)</span></label>
          <textarea id="f-ab" rows={3} maxLength={2000} value={body} onChange={e => setBody(e.target.value)} />
        </div>
        <div className="field">
          <label>Show on the feed for</label>
          <div className="seg">
            {DURATIONS.map(d => <button type="button" key={d.days} className={days === d.days ? 'on' : ''} onClick={() => { haptic(6); setDays(d.days) }}>{d.label}</button>)}
          </div>
        </div>
        <div className="field">
          <label htmlFor="f-ae">Event date <span className="muted">(optional)</span></label>
          <input id="f-ae" type="date" min={todayISO()} value={event} onChange={e => setEvent(e.target.value)} />
        </div>
        <p className="small muted" style={{ marginTop: 6 }}>
          Shows until {ends.length === 10 ? fDay(ends) : lastDay({ ends_at: ends })}{byEvent && byEvent < byDays ? ', the event day' : ''}. Then it moves to Messages{image ? ' and the image is removed' : ''}.
        </p>
        {error ? <p className="err">{error}</p> : null}
        <button className="btn" style={{ marginTop: 16 }} disabled={!!busy || (!title.trim() && !body.trim() && !image)}>
          {busy === 'upload' ? 'Uploading image…' : busy ? 'Posting…' : 'Post to students'}
        </button>
        <p className="small muted" style={{ marginTop: 8 }}>Students with notifications on get one straight away.</p>
      </div>
    </form>
  )
}
