/* The four portals. Phase 0: real tab bars and profile; the other tabs are placeholders
   that Phase 1 fills in (see Docs-TLink/Tech/Build plan.md). */

import { useState, type ReactNode } from 'react'
import { useAuth, type Profile } from '../lib/auth'
import { Icon } from '../ui/icons'
import { Empty, NavBar, TabBar, initials, type Tab } from '../ui/parts'
import { haptic } from '../ui/haptic'

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
  const [tutorView, setTutorView] = useState<'tutor' | 'student'>(() => savedView() === 'student' ? 'student' : 'tutor')
  const [tab, setTab] = useState('home')
  if (!profile) return null

  const view: View = profile.role !== 'student' ? profile.role : profile.is_tutor ? tutorView : 'student'
  const { tabs, titles } = PORTALS[view]

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
        {tab === 'profile' ? <ProfileTab profile={profile} view={view} /> : <Soon />}
      </div>
      <TabBar tabs={tabs} current={tab} onChange={setTab} />
    </>
  )
}

function Soon() {
  return <Empty icon="clock" title="Coming in Phase 1" line="This screen is part of the next build step. The app's frame, sign-in and data rules are in place." />
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
          <span className="rname" style={{ fontSize: 16 }}>{profile.full_name || 'No name yet'}</span>
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

      <button className="btn btn--outline" style={{ marginTop: 26 }} onClick={() => { haptic(10); signOut() }}>
        <Icon name="out" size={18} /> Sign out
      </button>
    </div>
  )
}
