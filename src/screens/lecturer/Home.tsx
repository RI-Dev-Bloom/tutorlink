/* Lecturer → My tutors: the tutors on the lecturer's modules, when each one's next
   session is, and their latest message. One tap to message a tutor. */

import { useAuth } from '../../lib/auth'
import { must, useQuery } from '../../lib/data'
import { loadInbox, unreadTotal } from '../../lib/messages'
import { supabase } from '../../lib/supabase'
import { currentSemester, fDay, hhmm, loadSemesters, type Session } from '../../lib/tutors'
import { todayISO } from '../../lib/types'
import { useStack } from '../../nav/Stack'
import { Icon } from '../../ui/icons'
import { Empty, Loading, initials } from '../../ui/parts'
import { Thread } from '../messages/Thread'
import { SetupCard } from '../../ui/Setup'

type Row = { module_code: string; tutor: { id: string; full_name: string } | null }

async function loadMyTutors(uid: string, semId: string | null) {
  const mods = ((await must(supabase.from('lecturer_modules').select('module_code, modules(name)').eq('lecturer_id', uid)
    .returns<{ module_code: string; modules: { name: string } | null }[]>())) ?? [])
  const codes = mods.map(m => m.module_code)
  if (!codes.length) return { mods, tutors: [], sessions: [] as Session[] }
  // The database only shows a lecturer tutors and sessions on modules they teach.
  const [links, sessions] = await Promise.all([
    must(supabase.from('tutor_modules').select('module_code, tutor:profiles!tutor_modules_tutor_id_fkey(id, full_name)').in('module_code', codes).returns<Row[]>()),
    must(supabase.from('sessions').select('id, tutor_id, module_code, semester_id, session_date, starts_at, ends_at, venue, status')
      .in('module_code', codes).neq('status', 'cancelled').order('session_date').returns<Session[]>()),
  ])
  const byTutor = new Map<string, { id: string; full_name: string; modules: string[] }>()
  for (const l of links ?? []) {
    if (!l.tutor) continue
    const t = byTutor.get(l.tutor.id) ?? { ...l.tutor, modules: [] }
    t.modules.push(l.module_code); byTutor.set(t.id, t)
  }
  const tutors = [...byTutor.values()].sort((a, b) => a.full_name.localeCompare(b.full_name))
  return { mods, tutors, sessions: (sessions ?? []).filter(s => !semId || s.semester_id === semId) }
}

export function LecturerHome() {
  const { profile } = useAuth()
  const { push } = useStack()
  const semesters = useQuery('semesters', loadSemesters)
  const sem = semesters.data ? currentSemester(semesters.data) : null
  const data = useQuery(`lecturer-tutors:${profile!.id}:${sem?.id ?? null}`, () => loadMyTutors(profile!.id, sem?.id ?? null))
  const inbox = useQuery('inbox', loadInbox)

  if (data.loading) return <Loading />
  if (data.error || !data.data) return <p className="err pad">{data.error}</p>
  const { mods, tutors, sessions } = data.data
  const today = todayISO()
  const run = sessions.filter(s => s.session_date <= today && s.status !== 'scheduled').length

  return (
    <div className="pad stagger">
      <div className="chips">
        {mods.map(m => <span key={m.module_code} className="chip chip--static chip--sm"><span className="code">{m.module_code}</span>{m.modules?.name}</span>)}
      </div>

      <SetupCard />
      <div className="metrics" style={{ marginTop: 16 }}>
        <div className="metric metric--navy"><div className="n">{tutors.length}</div><div className="l">Tutors</div></div>
        <div className="metric metric--green"><div className="n">{run}</div><div className="l">Sessions run{sem ? ' this semester' : ''}</div></div>
        <div className="metric metric--gold"><div className="n">{unreadTotal(inbox.data)}</div><div className="l">Unread messages</div></div>
      </div>

      <div className="sect">Tutors on your modules</div>
      {tutors.length ? (
        <div className="card">
          {tutors.map(t => {
            const next = sessions.find(s => s.tutor_id === t.id && s.session_date >= today && s.status === 'scheduled')
            const thread = inbox.data?.find(r => r.other_id === t.id && r.last_at)
            return (
              <button className="row" key={t.id} onClick={() => push(<Thread otherId={t.id} />)}>
                <span className="avatar">{initials(t.full_name)}</span>
                <span className="rmain">
                  <span className="rname">{t.full_name}</span>
                  <span className="rmeta"><span className="mono">{t.modules.join(' · ')}</span>
                    {next ? ` · next ${fDay(next.session_date)}${next.starts_at ? ` ${hhmm(next.starts_at)}` : ''}${next.venue ? `, ${next.venue}` : ''}` : ''}</span>
                  {thread ? <span className="rmeta" style={thread.unread ? { color: 'var(--text)', fontWeight: 600 } : undefined}>{thread.last_from_me ? 'You: ' : ''}{thread.last_topic}</span> : null}
                </span>
                <span className="rside">
                  {thread?.unread ? <span className="unread-count">{thread.unread}</span> : null}
                  <Icon name="mail" size={18} />
                </span>
              </button>
            )
          })}
        </div>
      ) : (
        <Empty icon="people" title="No tutors yet" line={mods.length ? 'When admin approves tutors for your modules, they show up here.' : 'Admin hasn’t set your modules yet.'} />
      )}
    </div>
  )
}
