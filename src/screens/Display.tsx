/* The check-in on a laptop or projector (?show=…). No sign-in: the link only works while the
   check-in is open, and shows the same QR that changes every 15 seconds. */

import { checkinLink, minsLeft, useLive } from '../lib/attendance'
import { supabase } from '../lib/supabase'
import { QR } from '../ui/QR'

export function Display({ id }: { id: string }) {
  const { live, error } = useLive(() => supabase.rpc('checkin_display', { p_display: id }), id)

  if (error) return <div className="show show--msg"><p>{error}</p></div>
  if (!live) return <div className="show show--msg"><p>Loading…</p></div>
  if (!live.open) return (
    <div className="show show--msg">
      <p className="show__brand">TutorLink</p>
      <h1>This check-in has closed</h1>
      <p>Thanks for coming. You can close this tab.</p>
    </div>
  )

  return (
    <div className="show">
      <header className="show__head">
        <span className="show__brand">TutorLink · check in</span>
        <span>{live.module_code} · {live.module_name}{live.venue ? ` · ${live.venue}` : ''}</span>
      </header>
      <main className="show__main">
        {live.mode === 'online' ? (
          <div className="show__pin">{live.online_code}</div>
        ) : live.token ? (
          <div className="show__qr"><QR value={checkinLink(live.token)} label="Check-in QR code" /></div>
        ) : null}
        <div className="show__side">
          <p className="show__step">Open <b>TutorLink</b> on your phone, tap <b>Check in</b> and {live.mode === 'online' ? 'type this code.' : 'scan the code.'}</p>
          {live.mode !== 'online' ? <><p className="show__label">Or type</p><p className="show__code">{live.code}</p></> : null}
          <p className="show__count"><b>{live.count ?? 0}</b> checked in</p>
          <p className="show__small">{live.tutor ? `${live.tutor}'s session · ` : ''}closes in {minsLeft(live.closes_at)}{live.mode === 'online' ? ' · the code changes every 30 seconds' : ' · the code changes every 15 seconds'}</p>
        </div>
      </main>
    </div>
  )
}
