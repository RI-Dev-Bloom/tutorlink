/* A session's attendance register as a PDF, in TutorLink's navy and gold: who checked in,
   their student number and qualification, the time and how. Built on the phone (jsPDF),
   loaded only when someone taps Download. */

import type { AttendanceRow } from './attendance'
import { METHOD } from './attendance'

const NAVY = '#0A2342', GOLD = '#C8A840', TEXT = '#0A1828', MUTED = '#6B7B8F', LINE = '#E2DDD8', LINE_S = '#EFECE7', ROW = '#FAFAF8', AMBER = '#92400E'

export type RegisterInfo = {
  moduleCode: string
  moduleName: string
  date: string          // YYYY-MM-DD
  from: string | null   // HH:MM
  to: string | null
  venue: string
  hours: number
  tutor: string
  status: string        // e.g. "Confirmed by admin"
  kind: 'tutorial' | 'lecture'
  title: string | null  // e.g. Revision
  topic: string | null  // e.g. Loops and arrays
}

const longDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const time = (iso: string) => new Date(iso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })

export async function downloadRegister(info: RegisterInfo, rows: AttendanceRow[]) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210, M = 18, right = W - M
  const list = [...rows].sort((a, b) => a.checked_in_at.localeCompare(b.checked_in_at))
  const online = list.some(r => r.method === 'online')

  // ---- heading
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(MUTED)
  doc.setCharSpace(0.6); doc.text('TUTORLINK  ·  ROSEBANK INTERNATIONAL', M, 20); doc.setCharSpace(0)
  doc.setFont('times', 'bold'); doc.setFontSize(24); doc.setTextColor(NAVY)
  doc.text('Attendance register', M, 31)
  doc.setDrawColor(GOLD); doc.setLineWidth(0.9); doc.line(M, 35, M + 28, 35)

  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(TEXT)
  doc.text(info.moduleName, M, 45)
  doc.setFont('courier', 'normal'); doc.setFontSize(9.5); doc.setTextColor(MUTED)
  doc.text(info.moduleCode, M, 50.5)
  const label = [info.title, info.topic].filter(Boolean).join(' · ')
  if (label) { doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(TEXT); doc.text(label, M + 22, 50.5) }

  // ---- details, two columns
  const details: [string, string][] = [
    ['Date', longDate(info.date)],
    ['Time', info.from ? `${info.from} – ${info.to ?? ''}` : '–'],
    ['Venue', info.venue || (online ? 'Online' : '–')],
    ['Length', `${info.hours} hour${info.hours === 1 ? '' : 's'}`],
    [info.kind === 'lecture' ? 'Lecturer' : 'Tutor', info.tutor],
    ['Type', `${info.kind === 'lecture' ? 'Lecture' : 'Tutorial'} · ${online ? 'online (Teams)' : 'in class'}`],
    ['Checked in', `${list.length} student${list.length === 1 ? '' : 's'}`],
    ['Status', info.status],
  ]
  let y = 61
  details.forEach(([label, value], i) => {
    const x = i % 2 === 0 ? M : M + 88
    if (i % 2 === 0 && i) y += 11
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(MUTED)
    doc.setCharSpace(0.4); doc.text(label.toUpperCase(), x, y); doc.setCharSpace(0)
    doc.setFontSize(10.5); doc.setTextColor(TEXT)
    doc.text(doc.splitTextToSize(value, 84)[0], x, y + 5)
  })
  y += 16

  // ---- the table
  const cols = [
    { title: '#', w: 8 }, { title: 'Student number', w: 31 }, { title: 'Name and surname', w: 55 },
    { title: 'Qualification', w: 29 }, { title: 'Time', w: 15 }, { title: 'Checked in by', w: 36 },
  ]
  const header = (top: number) => {
    doc.setFillColor(NAVY); doc.rect(M, top, right - M, 8, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor('#FFFFFF'); doc.setCharSpace(0.3)
    let x = M + 2.5
    cols.forEach(c => { doc.text(c.title.toUpperCase(), x, top + 5.3); x += c.w })
    doc.setCharSpace(0)
    return top + 8
  }
  y = header(y)

  const footer = () => {
    const pages = doc.getNumberOfPages()
    const made = new Date().toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p)
      doc.setDrawColor(LINE); doc.setLineWidth(0.3); doc.line(M, 282, right, 282)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(MUTED)
      doc.text(`Recorded with TutorLink check-in · generated ${made}`, M, 287)
      doc.text(`Page ${p} of ${pages}`, right, 287, { align: 'right' })
    }
  }

  if (!list.length) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(MUTED)
    doc.text('Nobody checked in to this session.', M + 2.5, y + 8)
  }
  list.forEach((r, i) => {
    if (y > 270) { doc.addPage(); y = header(20) }
    if (i % 2 === 1) { doc.setFillColor(ROW); doc.rect(M, y, right - M, 8, 'F') }
    doc.setDrawColor(LINE_S); doc.setLineWidth(0.2); doc.line(M, y + 8, right, y + 8)
    const cells = [String(i + 1), r.student_number, r.full_name, r.qualification_code ?? '–', time(r.checked_in_at), METHOD[r.method]]
    let x = M + 2.5
    cells.forEach((c, k) => {
      const manual = k === 5 && r.method === 'manual'
      doc.setFont(k === 1 ? 'courier' : 'helvetica', k === 2 ? 'bold' : manual ? 'italic' : 'normal')
      doc.setFontSize(k === 1 ? 9 : 9.5)
      doc.setTextColor(manual ? AMBER : k === 0 ? MUTED : TEXT)
      doc.text(doc.splitTextToSize(manual ? 'Manual (by tutor)' : c, cols[k].w - 3)[0], x, y + 5.4)
      x += cols[k].w
    })
    y += 8
  })

  footer()
  doc.save(`Attendance register - ${info.moduleCode} - ${info.date}.pdf`)
}
