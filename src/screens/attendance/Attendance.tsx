/* Attendance views, shared by lecturers (their modules), admin (every module) and tutors
   (their own sessions): the database decides what each person is counted on.
   The index lists modules for a semester; a module shows each student's rate and each session. */

import { useState } from 'react'
import { useAuth } from '../../lib/auth'
import {
  KIND_LABEL, checkinRows, loadCheckins, loadHeld, loadOpenCheckin, loadRoster, loadSummary, loadTotals, type Kind, type RosterRow,
} from '../../lib/attendance'
import { downloadCsv } from '../../lib/csv'
import { must, useQuery } from '../../lib/data'
import { friendlyError, supabase } from '../../lib/supabase'
import { SESSION_COLS, currentSemester, fDay, hhmm, loadSemesters, sessionLabel, type Session } from '../../lib/tutors'
import type { Semester } from '../../lib/types'
import { useStack } from '../../nav/Stack'
import { Icon } from '../../ui/icons'
import { useOverlay } from '../../ui/Overlay'
import { BackButton, Empty, Loading, NavBar, initials } from '../../ui/parts'
import { haptic } from '../../ui/haptic'
import { SessionScreen, StartCheckinSheet } from '../tutor/Checkin'

const avg = (checkins: number, sessions: number) => sessions ? (checkins / sessions).toFixed(1).replace(/\.0$/, '') : '–'
const pct = (r: RosterRow) => r.held ? Math.round((r.attended / r.held) * 100) : 0

function useSemester() {
  const semesters = useQuery('semesters', loadSemesters)
  const [picked, setPicked] = useState<string | null>(null)
  const sem = (semesters.data ?? []).find(s => s.id === picked) ?? (semesters.data ? currentSemester(semesters.data) : null)
  return { semesters: semesters.data ?? [], sem, setPicked, loading: semesters.loading }
}

function SemesterChips({ list, sem, onPick }: { list: Semester[]; sem: Semester | null; onPick: (id: string) => void }) {
  if (list.length < 2) return null
  return (
    <div className="filters" style={{ marginBottom: 14 }}>
      {list.map(s => <button key={s.id} className={'chip' + (s.id === sem?.id ? ' on' : '')} onClick={() => { haptic(6); onPick(s.id) }}>{s.name}</button>)}
    </div>
  )
}

function Figures({ items }: { items: [number | string, string][] }) {
  return (
    <div className="figs">
      {items.map(([n, l]) => <div key={l}><b>{n}</b><span>{l}</span></div>)}
    </div>
  )
}

/* ---------- every module this semester -------------------- */

/* Lecturers: start a lecture check-in (or jump back into the open one), and their recent lectures. */
function LecturerCheckin() {
  const { profile } = useAuth()
  const { push } = useStack()
  const { openSheet } = useOverlay()
  const uid = profile!.id
  const mods = useQuery(`lecturer-modules:${uid}`, () =>
    must(supabase.from('lecturer_modules').select('module_code, modules(name)').eq('lecturer_id', uid)
      .returns<{ module_code: string; modules: { name: string } | null }[]>()))
  const openId = useQuery('open-checkin', loadOpenCheckin)
  const lectures = useQuery(`my-lectures:${uid}`, async () =>
    (await must(supabase.from('sessions').select(SESSION_COLS).eq('tutor_id', uid).eq('kind', 'lecture')
      .order('session_date', { ascending: false }).order('starts_at', { ascending: false }).limit(8).returns<Session[]>())) ?? [])
  const open = (id: string) => { haptic(8); push(<SessionScreen sessionId={id} />) }
  const modules = (mods.data ?? []).map(m => ({ code: m.module_code, name: m.modules?.name ?? m.module_code }))

  return (
    <>
      {openId.data ? (
        <button className="live-card" style={{ marginTop: 0 }} onClick={() => open(openId.data!)}>
          <span className="live-dot" aria-hidden />
          <span className="rmain"><span className="rname">Check-in is open</span><span className="rmeta">Show the code, see who's here, close it when you're done</span></span>
          <Icon name="chev" size={17} stroke={2.1} />
        </button>
      ) : (
        <button className="btn" disabled={!modules.length} onClick={() => { haptic(10); openSheet(<StartCheckinSheet kind="lecture" modules={modules} onStarted={open} />) }}>
          <Icon name="calChk" size={18} /> Start a lecture check-in
        </button>
      )}
      <p className="small muted" style={{ marginTop: 8 }}>For any lecture in your modules. Students scan the code, and their attendance shows up here.</p>

      {lectures.data?.length ? (
        <>
          <div className="sect">Your recent lectures</div>
          <div className="card">
            {lectures.data.map(s => (
              <button className="row" key={s.id} onClick={() => open(s.id)}>
                <span className="avatar avatar--code">{s.module_code.slice(0, 4)}</span>
                <span className="rmain">
                  <span className="rname">{sessionLabel(s) || s.module_code}</span>
                  <span className="rmeta"><span className="mono">{s.module_code}</span> · {fDay(s.session_date)}{s.starts_at ? ` ${hhmm(s.starts_at)}` : ''}{s.venue ? ` · ${s.venue}` : ''}</span>
                </span>
                <span className="rside rside--num"><b>{s.students_attended ?? 0}</b><span>checked in</span></span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </>
  )
}

export function AttendanceIndex() {
  const { profile } = useAuth()
  const { push } = useStack()
  const { toast } = useOverlay()
  const { semesters, sem, setPicked, loading } = useSemester()
  const role = profile?.role
  // Tutors only run tutorials; lecturers and admin see tutorials and lectures separately.
  const [kind, setKind] = useState<Kind>('tutorial')
  const semId = sem?.id ?? ''
  const totals = useQuery(`att-totals:${semId}:${kind}`, () => semId ? loadTotals(semId, kind) : Promise.resolve(null))
  const summary = useQuery(`att-summary:${semId}:${kind}`, () => semId ? loadSummary(semId, kind) : Promise.resolve([]))
  const [busy, setBusy] = useState(false)
  const who = role === 'lecturer' ? 'your modules' : role === 'admin' ? 'every module' : 'your sessions'
  const word = kind === 'lecture' ? 'lecture' : 'session'

  const exportAll = async () => {
    if (!sem) return
    setBusy(true)
    try { downloadCsv(checkinRows(await loadCheckins(sem.id, undefined, kind)), `TutorLink ${kind === 'lecture' ? 'lecture' : 'tutorial'} check-ins - ${sem.name}.csv`); haptic(12); toast('Check-ins downloaded') }
    catch (e) { toast(friendlyError(e)) }
    setBusy(false)
  }

  if (loading) return <Loading />
  if (!sem) return <Empty icon="cal" title="No semester yet" line="Attendance shows up once a semester is set up." />
  const t = totals.data
  const rows = summary.data ?? []

  return (
    <div className="pad stagger">
      {role === 'lecturer' ? <div style={{ marginBottom: 24 }}><LecturerCheckin /></div> : null}
      <SemesterChips list={semesters} sem={sem} onPick={setPicked} />
      {role === 'lecturer' || role === 'admin' ? (
        <div className="seg" style={{ marginBottom: 14 }}>
          {(['tutorial', 'lecture'] as Kind[]).map(k => <button key={k} className={kind === k ? 'on' : ''} onClick={() => { haptic(6); setKind(k) }}>{KIND_LABEL[k]}</button>)}
        </div>
      ) : null}
      <p className="small muted" style={{ marginBottom: 12 }}>{sem.name} · {KIND_LABEL[kind].toLowerCase()} · {who}</p>
      <Figures items={[[t?.sessions ?? '…', kind === 'lecture' ? 'Lectures held' : 'Sessions held'], [t?.students ?? '…', 'Students reached'], [t ? avg(t.checkins, t.sessions) : '…', `Per ${word}`]]} />

      <div className="sect">By module</div>
      {summary.loading ? <Loading /> : rows.length ? (
        <div className="card">
          {rows.map(m => (
            <button className="row" key={m.module_code} onClick={() => { haptic(8); push(<ModuleAttendance code={m.module_code} name={m.module_name} sem={sem} kind={kind} />) }}>
              <span className="avatar avatar--code">{m.module_code.slice(0, 4)}</span>
              <span className="rmain">
                <span className="rname">{m.module_name}</span>
                <span className="rmeta"><span className="mono">{m.module_code}</span> · {m.sessions} {word}{m.sessions === 1 ? '' : 's'} · {m.students} student{m.students === 1 ? '' : 's'} · {avg(m.checkins, m.sessions)} per {word}</span>
              </span>
              <span className="rside"><Icon name="chev" size={17} stroke={2.1} /></span>
            </button>
          ))}
        </div>
      ) : <p className="small muted">No {word}s checked in yet this semester.</p>}

      <button className="btn btn--outline" style={{ marginTop: 16 }} disabled={busy || !t?.checkins} onClick={exportAll}>
        <Icon name="down" size={16} /> {busy ? 'Preparing…' : `Download every ${word} check-in (CSV)`}
      </button>
    </div>
  )
}

/* Pushed from admin's Overview and the tutor's Sessions tab. */
export function AttendanceScreen() {
  return (
    <>
      <NavBar title="Attendance" left={<BackButton />} />
      <div className="body"><AttendanceIndex /></div>
    </>
  )
}

/* ---------- one module ------------------------------------ */

export function ModuleAttendance({ code, name, sem, kind = 'tutorial' }: { code: string; name: string; sem: Semester; kind?: Kind }) {
  const { push } = useStack()
  const { toast } = useOverlay()
  const roster = useQuery(`att-roster:${sem.id}:${code}:${kind}`, () => loadRoster(sem.id, code, kind))
  const held = useQuery(`att-held:${sem.id}:${code}:${kind}`, () => loadHeld(sem.id, code, kind))
  const [view, setView] = useState<'students' | 'sessions'>('students')
  const [busy, setBusy] = useState(false)

  const students = roster.data ?? []
  const sessions = held.data ?? []
  // Real check-ins only (sessions from before check-in existed may carry a typed-in count).
  const checkins = students.reduce((n, r) => n + r.attended, 0)

  const exportCheckins = async () => {
    setBusy(true)
    try { downloadCsv(checkinRows(await loadCheckins(sem.id, code, kind)), `TutorLink ${kind} check-ins - ${code} - ${sem.name}.csv`); haptic(12); toast('Check-ins downloaded') }
    catch (e) { toast(friendlyError(e)) }
    setBusy(false)
  }
  const exportStudents = () => {
    downloadCsv([
      ['Student number', 'Name', 'Qualification', 'Sessions attended', 'Sessions held', 'Attendance %', 'Last checked in'],
      ...students.map(r => [r.student_number, r.full_name, r.qualification_code ?? '', r.attended, r.held, pct(r), r.last_at?.slice(0, 10) ?? '']),
    ], `TutorLink ${kind} attendance - ${code} - ${sem.name}.csv`)
    haptic(12); toast('Student list downloaded')
  }

  return (
    <>
      <NavBar title={code} left={<BackButton />} />
      <div className="body"><div className="pad stagger">
        <div className="sess-head"><span className="rname">{name}</span><span className="rmeta">{sem.name} · {KIND_LABEL[kind].toLowerCase()}</span></div>
        <Figures items={[[sessions.length, 'Sessions held'], [students.length, 'Students'], [avg(checkins, sessions.length), 'Per session']]} />

        <div className="seg" style={{ marginTop: 18 }}>
          <button className={view === 'students' ? 'on' : ''} onClick={() => { haptic(6); setView('students') }}>Students</button>
          <button className={view === 'sessions' ? 'on' : ''} onClick={() => { haptic(6); setView('sessions') }}>{kind === 'lecture' ? 'Lectures' : 'Sessions'}</button>
        </div>

        {view === 'students' ? (
          roster.loading ? <Loading /> : students.length ? (
            <div className="card" style={{ marginTop: 12 }}>
              {students.map(r => (
                <div className="row" key={r.student_number}>
                  <span className="avatar">{initials(r.full_name)}</span>
                  <span className="rmain">
                    <span className="rname">{r.full_name}</span>
                    <span className="rmeta"><span className="mono">{r.student_number}</span>{r.qualification_code ? ` · ${r.qualification_code}` : ''}</span>
                    <span className="minibar" aria-hidden><span className={pct(r) >= 75 ? 'high' : ''} style={{ width: `${pct(r)}%` }} /></span>
                  </span>
                  <span className="rside rside--num"><b>{pct(r)}%</b><span>{r.attended} of {r.held}</span></span>
                </div>
              ))}
            </div>
          ) : <p className="small muted" style={{ marginTop: 12 }}>Nobody has checked in to {code} yet.</p>
        ) : (
          held.loading ? <Loading /> : sessions.length ? (
            <div className="card" style={{ marginTop: 12 }}>
              {sessions.map(s => (
                <button className="row" key={s.id} onClick={() => { haptic(8); push(<SessionScreen sessionId={s.id} />) }}>
                  <span className="rmain">
                    <span className="rname">{fDay(s.session_date)}{s.starts_at ? ` · ${hhmm(s.starts_at)}` : ''}</span>
                    {sessionLabel(s) ? <span className="rmeta" style={{ color: 'var(--text)' }}>{sessionLabel(s)}</span> : null}
                    <span className="rmeta">{s.tutor ? [s.tutor.title, s.tutor.full_name].filter(Boolean).join(' ') : 'Tutor'}{s.venue ? ` · ${s.venue}` : ''} · {Number(s.hours)} h</span>
                  </span>
                  <span className="rside rside--num"><b>{s.students_attended ?? 0}</b><span>checked in</span></span>
                </button>
              ))}
            </div>
          ) : <p className="small muted" style={{ marginTop: 12 }}>No {code} sessions held yet.</p>
        )}

        <div className="btnrow" style={{ marginTop: 16 }}>
          <button className="btn btn--outline btn--sm" disabled={!students.length} onClick={exportStudents}><Icon name="down" size={15} /> Student list</button>
          <button className="btn btn--outline btn--sm" disabled={busy || !checkins} onClick={exportCheckins}><Icon name="down" size={15} /> {busy ? 'Preparing…' : 'Check-ins'}</button>
        </div>
        <p className="small muted" style={{ marginTop: 8, textAlign: 'center' }}>CSV files that open in Excel</p>
      </div></div>
    </>
  )
}
