/* Bottom sheet + toast, shared by every screen.
   Sheets slide up over a dimmed screen and are dragged down (past 90px) to dismiss. */

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react'
import { haptic } from './haptic'

type OverlayApi = {
  openSheet: (node: ReactNode) => void
  closeSheet: () => void
  toast: (msg: string) => void
}

const OverlayCtx = createContext<OverlayApi | null>(null)

export function useOverlay() {
  const api = useContext(OverlayCtx)
  if (!api) throw new Error('useOverlay outside <OverlayProvider>')
  return api
}

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [sheet, setSheet] = useState<ReactNode>(null)
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState('')
  const [toastOn, setToastOn] = useState(false)
  const toastTimer = useRef<number | undefined>(undefined)
  const sheetEl = useRef<HTMLDivElement>(null)

  const openSheet = useCallback((node: ReactNode) => {
    setSheet(node)
    if (sheetEl.current) sheetEl.current.scrollTop = 0
    requestAnimationFrame(() => setOpen(true))
    haptic(10)
  }, [])
  const closeSheet = useCallback(() => setOpen(false), [])

  const toast = useCallback((m: string) => {
    setMsg(m)
    setToastOn(true)
    clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToastOn(false), 2400)
  }, [])

  // Drop the sheet's content once it has slid away.
  useEffect(() => {
    if (open) return
    const t = setTimeout(() => setSheet(null), 460)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Drag down to dismiss.
  const drag = useRef<{ y0: number; dy: number } | null>(null)
  const onPointerDown = (e: ReactPointerEvent) => {
    if ((e.target as HTMLElement).closest('input,textarea,select,button,label')) return
    if (sheetEl.current && sheetEl.current.scrollTop > 0) return
    drag.current = { y0: e.clientY, dy: 0 }
    sheetEl.current?.classList.add('drag')
  }
  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!drag.current || !sheetEl.current) return
      drag.current.dy = Math.max(0, e.clientY - drag.current.y0)
      sheetEl.current.style.transform = `translate3d(0,${drag.current.dy}px,0)`
    }
    const up = () => {
      if (!drag.current || !sheetEl.current) return
      sheetEl.current.classList.remove('drag')
      sheetEl.current.style.transform = ''
      if (drag.current.dy > 90) setOpen(false)
      drag.current = null
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
  }, [])

  return (
    <OverlayCtx.Provider value={{ openSheet, closeSheet, toast }}>
      {children}
      <div id="scrim" className={open ? 'on' : ''} onClick={closeSheet} />
      <div id="sheet" ref={sheetEl} className={open ? 'on' : ''} onPointerDown={onPointerDown}
        role="dialog" aria-modal="true" aria-hidden={!open}>
        <div className="grabber" />
        {sheet}
      </div>
      <div id="toast" className={toastOn ? 'on' : ''} role="status" aria-live="polite">{msg}</div>
    </OverlayCtx.Provider>
  )
}
