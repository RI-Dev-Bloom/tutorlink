/* A QR code drawn as one SVG path: sharp at any size, on a phone or a projector. */

import { useMemo } from 'react'
import qrcode from 'qrcode-generator'

export function QR({ value, label }: { value: string; label: string }) {
  const { n, d } = useMemo(() => {
    const q = qrcode(0, 'M')
    q.addData(value)
    q.make()
    const n = q.getModuleCount()
    let d = ''
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + 4} ${r + 4}h1v1h-1z`
    return { n: n + 8, d }   // 4 modules of white around it, as scanners expect
  }, [value])
  return (
    <svg className="qr" viewBox={`0 0 ${n} ${n}`} role="img" aria-label={label} shapeRendering="crispEdges">
      <rect width={n} height={n} fill="#fff" />
      <path d={d} fill="#0A2342" />
    </svg>
  )
}
