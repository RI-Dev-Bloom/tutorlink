/* Save rows as a CSV file that opens straight in Excel. */

export function downloadCsv(rows: (string | number | null | undefined)[][], filename: string) {
  const cell = (c: string | number | null | undefined) => {
    const s = c === null || c === undefined ? '' : String(c)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = rows.map(r => r.map(cell).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }))   // BOM so Excel reads it right
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.append(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
