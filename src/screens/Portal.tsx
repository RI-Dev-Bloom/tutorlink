/* The four portals. Tabs not built yet show a placeholder; Phase 1 fills them in
   slice by slice (see Docs-TLink/Tech/Build plan.md). */

import { useEffect, useState } from 'react'
import { useAuth, type Profile } from '../lib/auth'
import { Badge, Empty, NavBar, TabBar, type Tab } from '../ui/parts'
import { haptic } from '../ui/haptic'
import { Icon } from '../ui/icons'
import { must, useQuery } from '../lib/data'
import { supabase } from '../lib/supabase'
import { displayName } from '../lib/types'
import { AdminApplications, loadOpenCount } from './admin/Applications'
import { AdminOverview } from './admin/Overview'
import { AdminSettings } from './admin/AdminSettings'
import { DeviceSettings } from '../ui/Setup'
import { takePendingCheckin } from '../lib/attendance'
import { useStack } from '../nav/Stack'
import { useOverlay } from '../ui/Overlay'
import { QualificationSheet } from '../ui/Qualification'
import { CheckIn } from './student/CheckIn'
import { AttendanceIndex } from './attendance/Attendance'
import { Group, SHead, SRow } from '../ui/Settings'
import { resyncPush } from '../lib/push'
import { AdminTutors } from './admin/Tutors'
import { APP_STATUS, ApplyScreen, appKey } from './student/Apply'
import { loadMyApplication } from '../lib/student'
import { LecturerHome } from './lecturer/Home'
import { Inbox } from './messages/Inbox'
import { loadInbox, unreadTotal, useLiveMessages } from '../lib/messages'
import { TutorPay } from './tutor/Pay'
import { TutorSchedule } from './tutor/Schedule'
import { TutorSessions } from './tutor/Sessions'
import { loadMyTutorModules } from '../lib/student'
import { StudentHome } from './student/Home'
import { MyModulesTab } from './student/Modules'
import { ChangePassword } from './ChangePassword'

type View = 'student' | 'tutor' | 'lecturer' | 'admin'

const PORTALS: Record<View, { tabs: Tab<string>[]; titles: Record<string, string> }> = {
  student: {
    tabs: [
      { id: 'home', icon: 'home', label: 'Home' },
      { id: 'modules', icon: 'book', label: 'Modules' },
      { id: 'checkin', icon: 'qr', label: 'Check in' },
      { id: 'profile', icon: 'user', label: 'Profile' },
    ],
    titles: { home: 'TutorLink', modules: 'My modules', checkin: 'Check in', profile: 'Profile' },
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
      { id: 'attendance', icon: 'calChk', label: 'Attendance' },
      { id: 'inbox', icon: 'mail', label: 'Messages' },
      { id: 'profile', icon: 'user', label: 'Profile' },
    ],
    titles: { home: 'My tutors', attendance: 'Attendance', inbox: 'Messages', profile: 'Profile' },
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
  // Applying lives in Profile now; a notification about an application opens it there.
  const [tab, setTab] = useState(link.tab === 'apply' ? 'profile' : link.tab ?? 'home')
  // The Applications tab shows how many are waiting. Shares the 'applications' key, so a decision updates it.
  const openApps = useQuery('applications', () => profile?.role === 'admin' ? loadOpenCount() : Promise.resolve(0))
  // Plain students have no messages; everyone else gets live updates and an unread count.
  const messaging = !!profile && (profile.role !== 'student' || profile.is_tutor)
  const inbox = useQuery('inbox', () => messaging ? loadInbox() : Promise.resolve([]))
  useLiveMessages(messaging)
  const uid = profile?.id
  useEffect(() => { if (uid) resyncPush() }, [uid])
  // A check-in QR scanned with the phone's own camera opened the app: finish the check-in.
  const { push } = useStack()
  const isStudent = profile?.role === 'student'
  useEffect(() => {
    if (!uid || !isStudent) return
    const t = takePendingCheckin()
    if (t) push(<CheckIn token={t} />)
    else if (link.tab === 'apply') push(<ApplyScreen />)
  }, [uid, isStudent, push, link.tab])
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

  // Tutors and lecturers: a small glass message button, top right under the bar, while something is unread.
  const nudge = (view === 'tutor' || view === 'lecturer') && unread > 0 && tab !== 'inbox'
    ? (
      <button className="glassmsg" onClick={() => { haptic(8); setTab('inbox') }} aria-label={`${unread} unread message${unread === 1 ? '' : 's'}`}>
        <Icon name="mail" size={17} stroke={1.9} />
        <span className="glassmsg__n">{unread > 9 ? '9+' : unread}</span>
      </button>
    )
    : null

  return (
    <>
      <NavBar title={titles[tab]} right={switcher} />
      {nudge}
      <div className="body">
        {tab === 'profile' ? (view === 'admin' ? <AdminSettings /> : <ProfileTab profile={profile} view={view} />)
          : view === 'student' && tab === 'home' ? <StudentHome go={setTab} />
          : view === 'student' && tab === 'modules' ? <MyModulesTab />
          : view === 'student' && tab === 'checkin' ? <CheckIn inTab />
          : tab === 'inbox' ? <Inbox />
          : view === 'lecturer' && tab === 'home' ? <LecturerHome />
          : view === 'lecturer' && tab === 'attendance' ? <AttendanceIndex />
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
  const { openSheet } = useOverlay()
  const { push } = useStack()
  return (
    <div className="pad stagger">
      <SHead name={displayName(profile) || profile.email} line={`${ROLE_LINE[view]} · Rosebank International`} gold={view === 'lecturer'} />

      <Group title="Account">
        <SRow icon="mail" tone="blue" label="Email" value={profile.email} />
        {profile.student_number ? <SRow icon="cap" tone="navy" label="Student number" value={<span className="mono">{profile.student_number}</span>} /> : null}
        {profile.role === 'student' ? (
          <SRow icon="book" tone="gold" label="Qualification" value={<span className="mono">{profile.qualification_code ? `${profile.qualification_code}${profile.study_year ? ` · Y${profile.study_year}` : ''}` : 'Choose'}</span>}
            onClick={() => openSheet(<QualificationSheet />)} />
        ) : null}
        <SRow icon="user" tone="slate" label="Role" value={profile.is_tutor ? 'Student and tutor' : ROLE_LINE[view]} />
      </Group>

      {view === 'lecturer' ? <MyModules id={profile.id} /> : null}
      {view === 'tutor' ? <TutorModules id={profile.id} /> : null}
      {profile.role === 'student' ? <Tutoring profile={profile} /> : null}

      <DeviceSettings />

      <Group>
        <SRow label="Change my password" onClick={() => push(<ChangePassword why="change" />)} />
        <SRow label="Sign out" danger onClick={signOut} />
      </Group>
      <p className="app-foot">TutorLink · Rosebank International</p>
    </div>
  )
}

type ModRow = { module_code: string; modules: { name: string } | null }

function ModuleRows({ title, foot, mods }: { title: string; foot: string; mods: ModRow[] | undefined }) {
  return (
    <Group title={title} foot={foot}>
      {mods === undefined ? <SRow label="…" /> : mods.length ? mods.map(m => (
        <SRow key={m.module_code} icon="book" tone="gold" label={m.modules?.name ?? m.module_code} value={<span className="mono">{m.module_code}</span>} />
      )) : <SRow label="None yet" />}
    </Group>
  )
}

/* Profile → Tutoring: apply to become a tutor (or for more modules), and where it stands. */
function Tutoring({ profile }: { profile: Profile }) {
  const { push } = useStack()
  const app = useQuery(appKey(profile.id), () => loadMyApplication(profile.id))
  const a = app.data
  return (
    <Group title="Tutoring" foot={a ? undefined : 'Got a great mark in a high-risk module? Help others with it and get paid per hour.'}>
      <SRow icon="clip" tone="gold" label={profile.is_tutor ? 'Apply for more modules' : 'Apply to become a tutor'}
        value={a ? <Badge tone={APP_STATUS[a.status].tone}>{APP_STATUS[a.status].label}</Badge> : undefined}
        onClick={() => push(<ApplyScreen />)} />
    </Group>
  )
}

/* Tutors see the modules they were approved for. More can be added by applying again. */
function TutorModules({ id }: { id: string }) {
  const mods = useQuery(`my-tutor-modules:${id}`, () => loadMyTutorModules(id))
  return <ModuleRows title="Modules you tutor" mods={mods.data} foot="Want to tutor another module? Apply for more below." />
}

/* Lecturers see what they teach; only admin can change it. */
function MyModules({ id }: { id: string }) {
  const mods = useQuery(`lecturer-modules:${id}`, () =>
    must(supabase.from('lecturer_modules').select('module_code, modules(name)').eq('lecturer_id', id).returns<ModRow[]>()))
  return <ModuleRows title="Modules you teach" mods={mods.data ?? undefined} foot="Teaching something different this semester? Ask admin to update your modules." />
}
