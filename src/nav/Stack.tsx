/* The screen stack from the demo, in React.
   push: slides in from the right while the screen behind slides 24% left and dims.
   pop:  reverses it — via the back button, a swipe from the left edge, or Android's back gesture.
   reset: replaces everything with one screen, cross-faded (used when signing in or out). */

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react'
import { haptic } from '../ui/haptic'

type Phase = 'enter' | 'active' | 'behind' | 'leaving'
type Entry = { key: number; node: ReactNode; phase: Phase; fade: boolean }

type StackApi = {
  push: (node: ReactNode) => void
  back: () => void
  reset: (node: ReactNode) => void
  depth: number
}

const StackCtx = createContext<StackApi | null>(null)

export function useStack() {
  const api = useContext(StackCtx)
  if (!api) throw new Error('useStack outside <StackProvider>')
  return api
}

const SLIDE_MS = 500
let nextKey = 1

export function StackProvider({ children }: { children?: ReactNode }) {
  const [entries, setEntries] = useState<Entry[]>([])
  const entriesRef = useRef(entries)
  useLayoutEffect(() => { entriesRef.current = entries }, [entries])
  const live = () => entriesRef.current.filter(e => e.phase !== 'leaving')

  // Two frames so the browser paints the starting position before animating.
  const settle = (key: number, fade: boolean) =>
    requestAnimationFrame(() => requestAnimationFrame(() =>
      setEntries(list => list.map(e =>
        e.key === key ? { ...e, phase: 'active' }
        : e.phase === 'active' && !fade ? { ...e, phase: 'behind' }
        : e)),
    ))

  const push = useCallback((node: ReactNode) => {
    const key = nextKey++
    setEntries(list => [...list, { key, node, phase: 'enter', fade: false }])
    history.pushState({ depth: live().length }, '')
    settle(key, false)
  }, [])

  const reset = useCallback((node: ReactNode) => {
    const key = nextKey++
    const old = entriesRef.current.map(e => e.key)
    setEntries(list => [...list.map(e => ({ ...e, phase: 'leaving' as Phase, fade: true })), { key, node, phase: 'enter', fade: true }])
    history.replaceState({ depth: 0 }, '')
    settle(key, true)
    setTimeout(() => setEntries(list => list.filter(e => !old.includes(e.key))), SLIDE_MS)
  }, [])

  const popTo = useCallback((depth: number) => {
    const current = live()
    if (current.length - 1 <= depth) return
    const leaving = current.slice(depth + 1).map(e => e.key)
    const top = current[depth].key
    setEntries(list => list.map(e =>
      leaving.includes(e.key) ? { ...e, phase: 'leaving' } : e.key === top ? { ...e, phase: 'active' } : e))
    setTimeout(() => setEntries(list => list.filter(e => !leaving.includes(e.key))), SLIDE_MS)
  }, [])

  const back = useCallback(() => {
    if (live().length < 2) return
    haptic(6)
    history.back()
  }, [])

  // Browser / Android back → pop to the depth that history now points at.
  useEffect(() => {
    const onPop = (e: PopStateEvent) => popTo((e.state && e.state.depth) || 0)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [popTo])

  // Swipe from the left edge to go back.
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0]
    swipe.current = t.clientX < 26 && live().length > 1 ? { x: t.clientX, y: t.clientY } : null
  }
  const onTouchMove = (e: TouchEvent) => {
    const s = swipe.current
    if (!s) return
    const t = e.touches[0]
    if (Math.abs(t.clientY - s.y) > 60) swipe.current = null
    else if (t.clientX - s.x > 70) { swipe.current = null; back() }
  }

  const depth = entries.filter(e => e.phase !== 'leaving').length - 1
  return (
    <StackCtx.Provider value={{ push, back, reset, depth }}>
      <div id="stage" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={() => { swipe.current = null }}>
        {entries.map(e => (
          <div key={e.key} className={screenClass(e)} aria-hidden={e.phase !== 'active'}>
            {e.node}
          </div>
        ))}
      </div>
      {children}
    </StackCtx.Provider>
  )
}

function screenClass(e: Entry) {
  const c = ['screen']
  if (e.fade) c.push('fade')
  if (e.phase === 'enter' || e.phase === 'leaving') c.push('enter')
  if (e.phase === 'behind') c.push('behind')
  return c.join(' ')
}
