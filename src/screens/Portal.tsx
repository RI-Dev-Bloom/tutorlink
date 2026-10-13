/* The four portals. Tabs not built yet show a placeholder; Phase 1 fills them in
   slice by slice (see Docs-TLink/Tech/Build plan.md). */

import { useEffect, useState, type ReactNode } from 'react'
import { useAuth, type Profile } from '../lib/auth'
import { Icon } from '../ui/icons'
import { Empty, NavBar, TabBar, initials, type Tab } from '../ui/parts'
import { haptic } from '../ui/haptic'
import { must, useQuery } from '../lib/data'
import { supabase } from '../lib/supabase'
import { displayName } from '../lib/types'
import { AdminApplications, loadOpenCount } from './admin/Applications'
import { AdminOverview } from './admin/Overview'
import { AdminSettings } from './admin/AdminSettings'
import { SetupRows } from '../ui/Setup'
import { resyncPush } from '../lib/push'
import { AdminTutors } from './admin/Tutors'
import { ApplyTab } from './student/Apply'
import { LecturerHome } from './lecturer/Home'
import { Inbox } from './messages/Inbox'
import { loadInbox, unreadTotal, useLiveMessages } from '../lib/messages'
import { TutorPay } from './tutor/Pay'
import { TutorSchedule } from './tutor/Schedule'
import { TutorSessions } from './tutor/Sessions'
import { loadMyTutorModules } from '../lib/student'
import { StudentHome } from './student/Home'
import { MyModulesTab } from './student/Modules'

type View = 'student' | 'tutor' | 'lecturer' | 'admin'

const PORTALS: Record<View, { tabs: Tab<string>[]; titles: Record<string, string> }> = {
  student: {
    tabs: [
      { id: 'home', icon: 'home', label: 'Home' },
      { id: 'modules', icon: 'book', label: 'Modules' },
      { id: 'apply', icon: 'clip', label: 'Apply' },
      { id: 'profile', icon: 'user', label: 'Profile' },
    ],
    titles: { home: 'TutorLink', modules: 'My modules', apply: 'Apply to tutor', profile: 'Profile' },
  },
  tutor: {
    tabs: [
      { id: 'home', icon: 'cal', label: 'Schedule' },
      { id: 'sessions', icon: 'calChk', label: 'Sessions' },
      { id: 'inbox', icon: 'mail', label: 'Messages' },
      { id: 'pay', icon: 'wallet', label: 'Pay' },
      { id: 'profile', icon: 'user', label: 'Profile' },
    ],
    titles: { home: 'TutorLink', sessions: 'Sessions', inbox: 'Messages', pay: 'Pay', profile: 'Profile' },
  },
  lecturer: {
    tabs: [
      { id: 'home', icon: 'people', label: 'Tutors' },
      { id: 'inbox', icon: 'mail', label: 'Messages' },
      { id: 'profile', icon: 'user', label: 'Profile' },
    ],
    titles: { home: 'My tutors', inbox: 'Messages', profile: 'Profile' },
  },
  admin: {
    tabs: [
      { id: 'home', icon: 'board', label: 'Overview' },
      { id: 'apps', icon: 'clip', label: 'Applications' },
      { id: 'tutors', icon: 'people', label: 'Tutors' },
      { id: 'inbox', icon: 'mail', label: 'Messages' },
      { id: 'profile', icon: 'sliders', label: 'Settings' },
    ],
    titles: { home: 'Overview', apps: 'Applications', tutors: 'Tutors', inbox: 'Messages', profile: 'Settings' },
  },
}

const VIEW_KEY = 'tl.view'
const savedView = (): View | null => { try { return localStorage.getItem(VIEW_KEY) as View | null } catch { return null } }

export function Portal() {
  const { profile } = useAuth()
  // Tutors keep their student account and flip between the two views.
  // A tapped notification opens the app at ?view=…&tab=… (e.g. a new message → Messages).
  const [link] = useState(() => {
    const q = new URLSearchParams(window.location.search)
    if (q.has('tab') || q.has('view')) history.replaceState(history.state, '', window.location.pathname)
    return { view: q.get('view'), tab: q.get('tab') }
  })
  const [tutorView, setTutorView] = useState<'tutor' | 'student'>(() =>
    link.view === 'student' || link.view === 'tutor' ? link.view : savedView() === 'student' ? 'student' : 'tutor')
  const [tab, setTab] = useState(link.tab ?? 'home')
  // The Applications tab shows how many are waiting. Shares the 'applications' key, so a decision updates it.
  const openApps = useQuery('applications', () => profile?.role === 'admin' ? loadOpenCount() : Promise.resolve(0))
  // Plain students have no messages; everyone else gets live updates and an unread count.
  const messaging = !!profile && (profile.role !== 'student' || profile.is_tutor)
  const inbox = useQuery('inbox', () => messaging ? loadInbox() : Promise.resolve([]))
  useLiveMessages(messaging)
  const uid = profile?.id
  useEffect(() => { if (uid) resyncPush(uid) }, [uid])
  if (!profile) return null

  const view: View = profile.role !== 'student' ? profile.role : profile.is_tutor ? tutorView : 'student'
  const { titles } = PORTALS[view]
  if (!titles[tab]) setTab('home')   // a link to a tab this person doesn't have
  const unread = unreadTotal(inbox.data)
  const tabs = PORTALS[view].tabs.map(t => t.id === 'apps' ? { ...t, count: openApps.data } : t.id === 'inbox' ? { ...t, count: unread } : t)

  const flip = () => {
    const next = tutorView === 'tutor' ? 'student' : 'tutor'
    try { localStorage.setItem(VIEW_KEY, next) } catch { /* private mode */ }
    haptic(10); setTutorView(next); setTab('home')
  }
  const switcher = profile.is_tutor
    ? <button className="chip chip--sm" onClick={flip} style={{ marginRight: -4 }}>{tutorView === 'tutor' ? 'Student' : 'Tutor'}</button>
    : null

  return (
    <>
      <NavBar title={titles[tab]} right={switcher} />
      <div className="body">
        {tab === 'profile' ? (view === 'admin' ? <AdminSettings /> : <ProfileTab profile={profile} view={view} />)
          : view === 'student' && tab === 'home' ? <StudentHome go={setTab} />
          : view === 'student' && tab === 'modules' ? <MyModulesTab />
          : view === 'student' && tab === 'apply' ? <ApplyTab />
          : tab === 'inbox' ? <Inbox />
          : view === 'lecturer' && tab === 'home' ? <LecturerHome />
          : view === 'tutor' && tab === 'home' ? <TutorSchedule go={setTab} unread={unread} />
          : view === 'tutor' && tab === 'sessions' ? <TutorSessions />
          : view === 'tutor' && tab === 'pay' ? <TutorPay />
          : view === 'admin' && tab === 'apps' ? <AdminApplications />
          : view === 'admin' && tab === 'tutors' ? <AdminTutors />
          : view === 'admin' && tab === 'home' ? <AdminOverview go={setTab} />
          : <Soon />}
      </div>
      <TabBar tabs={tabs} current={tab} onChange={setTab} />
    </>
  )
}

function Soon() {
  return <Empty icon="clock" title="Coming soon" line="This screen is being built in the next steps of Phase 1." />
}

const ROLE_LINE: Record<View, string> = {
  student: 'Student', tutor: 'Tutor', lecturer: 'Lecturer', admin: 'Administrator',
}

function ProfileTab({ profile, view }: { profile: Profile; view: View }) {
  const { signOut } = useAuth()
  const rows: [string, ReactNode][] = [
    ['Email', profile.email],
    ...(profile.student_number ? [['Student number', <span key="sn" className="mono">{profile.student_number}</span>] as [string, ReactNode]] : []),
    ['Role', profile.is_tutor ? 'Student and tutor' : ROLE_LINE[view]],
  ]
  return (
    <div className="pad stagger">
      <div className="card card--pad" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span className={'avatar avatar--lg' + (view === 'lecturer' ? ' avatar--gold' : '')}>{initials(profile.full_name || profile.email)}</span>
        <span style={{ minWidth: 0 }}>
          <span className="rname" style={{ fontSize: 16 }}>{displayName(profile) || 'No name yet'}</span>
          <span className="rmeta">{ROLE_LINE[view]} · Rosebank International</span>
        </span>
      </div>

      <div className="sect" style={{ marginTop: 26 }}>Account</div>
      <div className="card">
        {rows.map(([k, v]) => (
          <div className="row" key={k}>
            <span className="rmain"><span className="rmeta" style={{ marginTop: 0 }}>{k}</span></span>
            <span className="rside" style={{ color: 'var(--text)', fontSize: 13.5 }}>{v}</span>
          </div>
        ))}
      </div>

      {view === 'lecturer' ? <MyModules id={profile.id} /> : null}
      {view === 'tutor' ? <TutorModules id={profile.id} /> : null}

      <SetupRows />

      <button className="btn btn--outline" style={{ marginTop: 26 }} onClick={() => { haptic(10); signOut() }}>
        <Icon name="out" size={18} /> Sign out
      </button>
    </div>
  )
}

/* Tutors see the modules they were approved for. More can be added by applying again. */
function TutorModules({ id }: { id: string }) {
  const mods = useQuery(`my-tutor-modules:${id}`, () => loadMyTutorModules(id))
  return (
    <>
      <div className="sect" style={{ marginTop: 26 }}>Modules you tutor</div>
      <div className="chips">
        {(mods.data ?? []).map(m => (
          <span key={m.module_code} className="chip chip--static"><span className="code">{m.module_code}</span>{m.modules?.name}</span>
        ))}
      </div>
      <p className="small muted" style={{ marginTop: 10 }}>Want to tutor another module? Switch to Student and apply again.</p>
    </>
  )
}

/* Lecturers see what they teach; only admin can change it. */
function MyModules({ id }: { id: string }) {
  const mods = useQuery(`lecturer-modules:${id}`, () =>
    must(supabase.from('lecturer_modules').select('module_code, modules(name)').eq('lecturer_id', id)
      .returns<{ module_code: string; modules: { name: string } | null }[]>()))
  return (
    <>
      <div className="sect" style={{ marginTop: 26 }}>Modules you teach</div>
      <div className="chips">
        {(mods.data ?? []).map(m => (
          <span key={m.module_code} className="chip chip--static"><span className="code">{m.module_code}</span>{m.modules?.name}</span>
        ))}
      </div>
      <p className="small muted" style={{ marginTop: 10 }}>Teaching something different this semester? Ask admin to update your modules.</p>
    </>
  )
}
