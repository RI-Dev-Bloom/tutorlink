/* Admin → tutor → Add weekly slot. As admin fills it in, the app does a trial run
   (nothing saved) and says how many sessions it would make, and what won't fit. */

import { useEffect, useState } from 'react'
import { invalidate, must } from '../../lib/data'
import { friendlyError, supabase } from '../../lib/supabase'
import { WEEKDAYS, type TutorRow } from '../../lib/tutors'
import { fDate, todayISO, type Semester } from '../../lib/types'
import { useStack } from '../../nav/Stack'
import { Icon } from '../../ui/icons'
import { useOverlay } from '../../ui/Overlay'
import { BackButton, NavBar } from '../../ui/parts'
import { haptic } from '../../ui/haptic'

type Trial = { weeks: number; created: number; over_quota: number; outside_semester: number }

export function SlotForm({ tutor, sem, left }: { tutor: TutorRow; sem: Semester; left: number }) {
  const { back } = useStack()
  const { toast } = useOverlay()
  const first = tutor.full_name.split(' ')[0]
  const today = todayISO()
  const [module, setModule] = useState(tutor.tutor_modules[0]?.module_code ?? '')
  const [weekday, setWeekday] = useState(1)
  const [starts, setStarts] = useState('14:00')
  const [ends, setEnds] = useState('15:00')
  const [venue, setVenue] = useState('')
  const [from, setFrom] = useState(sem.starts_on > today ? sem.starts_on : today)
  const [until, setUntil] = useState(sem.ends_on)
  const [trial, setTrial] = useState<Trial | null>(null)
  const [checking, setChecking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const problem =
    !module ? 'Pick a module'
    : !starts || !ends || ends <= starts ? 'The end time must be after the start time'
    : !from || !until || until < from ? 'The end date must be on or after the start date'
    : ''

  const args = { p_tutor: tutor.id, p_module: module, p_weekday: weekday, p_starts: starts, p_ends: ends, p_venue: venue.trim(), p_starts_on: from, p_until: until }

  // Trial run whenever the inputs settle.
  const argsKey = JSON.stringify(args)
  useEffect(() => {
    if (problem) return
    let alive = true
    const timer = setTimeout(async () => {
      setChecking(true)
      const { data, error: err } = await supabase.rpc('admin_create_slot', { ...JSON.parse(argsKey), p_dry_run: true })
      if (!alive) return
      setChecking(false)
      if (err) { setTrial(null); setError(friendlyError(err)); return }
      setError(''); setTrial((data as Trial[])[0])
    }, 350)
    return () => { alive = false; clearTimeout(timer) }
  }, [argsKey, problem])

  const create = async () => {
    setBusy(true); setError('')
    try {
      const [r] = await must(supabase.rpc('admin_create_slot', { ...args, p_dry_run: false })) as Trial[]
      haptic(18); invalidate('tutor', 'tutors', 'sessions')
      back(); toast(`${r.created} session${r.created === 1 ? '' : 's'} added for ${first}`)
    } catch (e) { haptic(24); setError(friendlyError(e)); setBusy(false) }
  }

  const day = WEEKDAYS[weekday - 1]
  const shown = !problem ? trial : null

  return (
    <>
      <NavBar title="Weekly slot" left={<BackButton />} />
      <div className="body"><div className="pad">
        <p className="small muted">{first} gets a session every week on this day, from the start date to the end date. {left} session{left === 1 ? '' : 's'} left this semester.</p>

        <div className="field">
          <label>Module</label>
          <div className="chips">
            {tutor.tutor_modules.map(m => (
              <button type="button" key={m.module_code} className={'chip chip--sm' + (module === m.module_code ? ' on' : '')} onClick={() => { haptic(6); setModule(m.module_code) }}>
                <span className="code">{m.module_code}</span>{m.modules?.name}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Day</label>
          <div className="chips">
            {WEEKDAYS.slice(0, 6).map((w, i) => (
              <button type="button" key={w} className={'chip chip--sm' + (weekday === i + 1 ? ' on' : '')} onClick={() => { haptic(6); setWeekday(i + 1) }}>{w.slice(0, 3)}</button>
            ))}
          </div>
        </div>

        <div className="btnrow" style={{ marginTop: 14 }}>
          <div className="field" style={{ flex: 1, marginTop: 0 }}><label htmlFor="f-ss">From</label><input id="f-ss" type="time" value={starts} onChange={e => setStarts(e.target.value)} /></div>
          <div className="field" style={{ flex: 1, marginTop: 0 }}><label htmlFor="f-se">To</label><input id="f-se" type="time" value={ends} onChange={e => setEnds(e.target.value)} /></div>
        </div>
        <div className="field">
          <label htmlFor="f-sv">Venue</label>
          <input id="f-sv" type="text" placeholder="e.g. Lab 2" maxLength={60} value={venue} onChange={e => setVenue(e.target.value)} />
        </div>
        <div className="btnrow" style={{ marginTop: 14 }}>
          <div className="field" style={{ flex: 1, marginTop: 0 }}><label htmlFor="f-sf">Start date</label><input id="f-sf" type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
          <div className="field" style={{ flex: 1, marginTop: 0 }}><label htmlFor="f-su">Until</label><input id="f-su" type="date" value={until} min={from} onChange={e => setUntil(e.target.value)} /></div>
        </div>
        <p className="small muted" style={{ marginTop: 6 }}>{sem.name} ends {fDate(sem.ends_on)}.</p>

        {problem ? <p className="err">{problem}</p> : null}

        {shown ? (
          <div className="card card--pad" style={{ marginTop: 18 }} aria-live="polite">
            <span className="rname">{shown.weeks} {day}{shown.weeks === 1 ? '' : 's'} in that range</span>
            <div className="payrow" style={{ marginTop: 8 }}><span className="muted">Sessions that will be added</span><b>{shown.created}</b></div>
            {shown.over_quota ? <div className="payrow"><span className="muted">Over {first}'s limit, skipped</span><span style={{ color: 'var(--red)' }}>{shown.over_quota}</span></div> : null}
            {shown.outside_semester ? <div className="payrow"><span className="muted">Outside any semester, skipped</span><span style={{ color: 'var(--amber)' }}>{shown.outside_semester}</span></div> : null}
          </div>
        ) : null}
        {shown && shown.over_quota ? (
          <div className="note note--amber" style={{ marginTop: 12 }}><Icon name="alert" size={15} />
            <span>{first} only has {left} session{left === 1 ? '' : 's'} left, so the last {shown.over_quota} week{shown.over_quota === 1 ? '' : 's'} won't be added. Raise {first}'s limit first if they should run.</span></div>
        ) : null}
        {error ? <p className="err">{error}</p> : null}

        <button className="btn" style={{ marginTop: 18 }} disabled={busy || checking || !!problem || !shown || !shown.created} onClick={create}>
          {busy ? 'Adding…' : checking ? 'Checking…' : shown?.created ? `Add ${shown.created} session${shown.created === 1 ? '' : 's'}` : 'Nothing to add'}
        </button>
      </div></div>
    </>
  )
}
