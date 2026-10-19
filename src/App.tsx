import { useEffect } from 'react'
import { AuthProvider, useAuth } from './lib/auth'
import { StackProvider, useStack } from './nav/Stack'
import { OverlayProvider } from './ui/Overlay'
import { Empty, Loading } from './ui/parts'
import { Welcome } from './screens/Welcome'
import { Onboarding } from './screens/Onboarding'
import { Portal } from './screens/Portal'
import { ChangePassword } from './screens/ChangePassword'
import { Display } from './screens/Display'

// A check-in shown on a laptop or projector: a page of its own, no sign-in, no phone frame.
const SHOW = new URLSearchParams(window.location.search).get('show')

export default function App() {
  if (SHOW) return <Display id={SHOW} />
  return (
    <div id="device">
      <AuthProvider>
        <OverlayProvider>
          <StackProvider>
            <Router />
          </StackProvider>
        </OverlayProvider>
      </AuthProvider>
    </div>
  )
}

/* Picks the root screen from who is signed in; a change cross-fades to the new root. */
function Router() {
  const { ready, session, profile, profileError, recovering } = useAuth()
  const { reset } = useStack()

  const route =
    !ready ? 'loading'
    : !session ? 'welcome'
    : profileError ? 'error'
    : !profile ? 'loading'
    : recovering ? 'recovery'
    : profile.must_change_password ? 'change-password'
    : profile.role === 'student' && !profile.student_number ? 'onboarding'
    : `portal:${profile.id}`

  useEffect(() => {
    if (route === 'loading') reset(<Loading />)
    else if (route === 'welcome') reset(<Welcome />)
    else if (route === 'onboarding') reset(<Onboarding />)
    else if (route === 'change-password') reset(<ChangePassword />)
    else if (route === 'recovery') reset(<ChangePassword why="recovery" />)
    else if (route === 'error') reset(<AccountError />)
    else reset(<Portal />)
  }, [route, reset])

  return null
}

function AccountError() {
  const { signOut } = useAuth()
  return (
    <Empty icon="alert" title="Couldn't load your account" line="Check your connection and try again."
      action={<button className="btn btn--outline" onClick={signOut}>Sign out</button>} />
  )
}
