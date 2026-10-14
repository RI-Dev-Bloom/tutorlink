/* Student → Check in. Point the camera at the tutor's QR, or type the code on the screen
   (6 letters in class, 4 digits online). Name, student number and qualification come from
   your account. Also opened straight from a scanned link (?checkin=…). */

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import type { CheckInResult } from '../../lib/attendance'
import { hhmmOf } from '../../lib/attendance'
import { invalidate } from '../../lib/data'
import { friendlyError, supabase } from '../../lib/supabase'
import { useStack } from '../../nav/Stack'
import { Icon } from '../../ui/icons'
import { useOverlay } from '../../ui/Overlay'
import { BackButton, Loading, NavBar } from '../../ui/parts'
import { QualificationSheet } from '../../ui/Qualification'
import { haptic } from '../../ui/haptic'

type Attempt = { kind: 'token' | 'code'; value: string }

export function CheckIn({ token }: { token?: string }) {
  const { back } = useStack()
  const { openSheet } = useOverlay()
  const [result, setResult] = useState<CheckInResult | null>(null)
  const [busy, setBusy] = useState(!!token)
  const [error, setError] = useState('')
  const [code, setCode] = useState('')
  const sent = useRef(false)

  const submit = useCallback(async (a: Attempt) => {
    setBusy(true); setError('')
    const { data, error: err } = a.kind === 'token'
      ? await supabase.rpc('check_in', { p_token: a.value })
      : await supabase.rpc('check_in_code', { p_code: a.value })
    if (err) {
      setBusy(false)
      // First check-in without a qualification: pick it, then carry on with the same code.
      if (err.message.includes('Choose your qualification')) { openSheet(<QualificationSheet onDone={() => submit(a)} />); return }
      haptic(24); setError(friendlyError(err)); sent.current = false; return
    }
    haptic(20); invalidate('my-attendance', 'my-modules'); setResult(data as CheckInResult); setBusy(false)
  }, [openSheet])

  useEffect(() => { if (token && !sent.current) { sent.current = true; submit({ kind: 'token', value: token }) } }, [token, submit])

  const onScan = useCallback((text: string) => {
    if (sent.current) return
    sent.current = true; haptic(10); submit({ kind: 'token', value: text })
  }, [submit])

  const typed = (e: FormEvent) => { e.preventDefault(); sent.current = true; submit({ kind: 'code', value: code }) }
  const clean = code.replace(/[^a-z0-9]/gi, '')

  if (result) return (
    <>
      <NavBar title="Checked in" left={<BackButton />} />
      <div className="body"><div className="pad">
        <div className="done">
          <span className="done__tick"><Icon name="check" size={34} stroke={2.4} /></span>
          <h2 className="display display--sm" style={{ marginTop: 18 }}>{result.already ? 'Already checked in' : 'You’re checked in'}</h2>
          <p className="sub" style={{ marginTop: 8 }}>{result.module_name}</p>
          {result.title || result.topic ? <p className="small" style={{ marginTop: 4, fontWeight: 600 }}>{[result.title, result.topic].filter(Boolean).join(' · ')}</p> : null}
          <div className="card card--pad" style={{ marginTop: 22, width: '100%', textAlign: 'left' }}>
            <div className="payrow"><span className="muted">Module</span><span className="mono">{result.module_code}</span></div>
            <div className="payrow"><span className="muted">{result.kind === 'lecture' ? 'Lecturer' : 'Tutor'}</span><span>{result.tutor}</span></div>
            <div className="payrow"><span className="muted">Type</span><span>{result.kind === 'lecture' ? 'Lecture' : 'Tutorial'}</span></div>
            {result.venue ? <div className="payrow"><span className="muted">Venue</span><span>{result.venue}</span></div> : null}
            <div className="payrow"><span className="muted">Time</span><span>{hhmmOf(result.checked_in_at)}</span></div>
          </div>
          <button className="btn" style={{ marginTop: 18 }} onClick={() => { haptic(8); back() }}>Done</button>
        </div>
      </div></div>
    </>
  )

  return (
    <>
      <NavBar title="Check in" left={<BackButton />} />
      <div className="body"><div className="pad">
        {token ? (busy ? <Loading /> : null) : <Scanner onScan={onScan} paused={busy} />}
        {error ? (
          <div className="note note--red" style={{ marginTop: 14 }}><Icon name="alert" size={15} /><span>{error}</span></div>
        ) : null}

        <div className="sect" style={{ marginTop: 22 }}>Or type the code</div>
        <form onSubmit={typed}>
          <div className="codein">
            <input type="text" inputMode="text" autoCapitalize="characters" autoComplete="off" spellCheck={false}
              placeholder="Code on the screen" maxLength={7} aria-label="Check-in code" value={code} onChange={e => setCode(e.target.value.toUpperCase())} />
            <button className="btn btn--sm" disabled={busy || !(clean.length === 4 || clean.length === 6)}>{busy ? '…' : 'Check in'}</button>
          </div>
        </form>
        <p className="small muted" style={{ marginTop: 8 }}>6 letters under the QR in class, or the 4-digit code on your tutor's shared screen online.</p>
      </div></div>
    </>
  )
}

/* The camera. Uses the phone's own QR reader where there is one (Android), else a small library. */
function Scanner({ onScan, paused }: { onScan: (text: string) => void; paused: boolean }) {
  const video = useRef<HTMLVideoElement>(null)
  const [state, setState] = useState<'starting' | 'on' | 'blocked' | 'none'>('starting')

  useEffect(() => {
    let stream: MediaStream | null = null, timer = 0, stopped = false
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) { setState('none'); return }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      } catch { setState('blocked'); return }
      if (stopped) { stream.getTracks().forEach(t => t.stop()); return }
      const v = video.current!
      v.srcObject = stream; await v.play().catch(() => {}); setState('on')

      type Detector = { detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]> }
      const Native = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector
      const native = Native ? new Native({ formats: ['qr_code'] }) : null
      const jsQR = native ? null : (await import('jsqr')).default

      const tick = async () => {
        if (stopped) return
        if (v.readyState >= 2 && ctx) {
          try {
            if (native) {
              const found = await native.detect(v)
              if (found[0]?.rawValue) { onScan(found[0].rawValue); return }
            } else if (jsQR) {
              const w = 480, h = Math.round((v.videoHeight / v.videoWidth) * w) || 480
              canvas.width = w; canvas.height = h
              ctx.drawImage(v, 0, 0, w, h)
              const hit = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' })
              if (hit?.data) { onScan(hit.data); return }
            }
          } catch { /* a bad frame; try the next one */ }
        }
        timer = window.setTimeout(tick, 220)
      }
      tick()
    }
    if (!paused) start()
    return () => { stopped = true; clearTimeout(timer); stream?.getTracks().forEach(t => t.stop()) }
  }, [onScan, paused])

  return (
    <div className="scan">
      <video ref={video} playsInline muted aria-label="Camera" />
      <span className="scan__frame" aria-hidden />
      {state !== 'on' ? (
        <div className="scan__msg">
          {state === 'starting' ? 'Starting the camera…'
            : state === 'blocked' ? 'TutorLink can’t use the camera. Allow it in your phone’s settings, or type the code below.'
            : 'This browser can’t scan. Type the code below.'}
        </div>
      ) : <div className="scan__hint">Point at the QR code on the screen</div>}
    </div>
  )
}
