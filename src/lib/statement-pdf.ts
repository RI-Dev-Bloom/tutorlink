/* A tutor's pay statement for a semester as an A4 PDF, in the same navy and gold as the
   attendance register: what's confirmed (and so will be paid), session by session.
   Built on the phone (jsPDF), loaded only when someone taps Download. */

import type { Session } from './tutors'

const NAVY = '#0A2342', GOLD = '#C8A840', TEXT = '#0A1828', MUTED = '#6B7B8F', LINE = '#E2DDD8', LINE_S = '#EFECE7', ROW = '#FAFAF8', GOLD_BG = '#FBF6E6'

export type StatementInfo = {
  tutor: string
  studentNumber: string | null
  semester: string
  startsOn: string | null   // YYYY-MM-DD
  endsOn: string | null
  ratePerHour: number       // today's rate, for sessions not yet confirmed
  waiting: { n: number; amount: number }
  moduleName: (code: string) => string
}

// Plain ASCII money (jsPDF's built-in fonts can't draw the narrow spaces en-ZA uses).
const money = (n: number) => {
  const [whole, cents] = Math.abs(n).toFixed(2).split('.')
  return `R ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}${cents === '00' ? '' : '.' + cents}`
}
const longDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })
const shortDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })
const hrs = (n: number) => `${Number(n)} h`
type Doc = { getTextWidth: (t: string) => number }
const fit = (doc: Doc, text: string, w: number) => {
  if (doc.getTextWidth(text) <= w) return text
  let t = text
  while (t.length > 1 && doc.getTextWidth(t + '…') > w) t = t.slice(0, -1)
  return t.trimEnd() + '…'
}

export async function downloadStatement(info: StatementInfo, confirmed: Session[]) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210, M = 18, right = W - M
  const list = [...confirmed].sort((a, b) => a.session_date.localeCompare(b.session_date))
  const hours = list.reduce((n, s) => n + Number(s.hours ?? 1), 0)
  const total = list.reduce((n, s) => n + Number(s.amount ?? 0), 0)

  // ---- heading
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(MUTED)
  doc.setCharSpace(0.6); doc.text('TUTORLINK  ·  ROSEBANK INTERNATIONAL', M, 20); doc.setCharSpace(0)
  doc.setFont('times', 'bold'); doc.setFontSize(24); doc.setTextColor(NAVY)
  doc.text('Pay statement', M, 31)
  doc.setDrawColor(GOLD); doc.setLineWidth(0.9); doc.line(M, 35, M + 28, 35)

  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(TEXT)
  doc.text(info.tutor, M, 45)
  doc.setFont('courier', 'normal'); doc.setFontSize(9.5); doc.setTextColor(MUTED)
  doc.text(info.studentNumber ?? '', M, 50.5)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(TEXT)
  const when = info.startsOn && info.endsOn ? `${info.semester}  ·  ${longDate(info.startsOn)} – ${longDate(info.endsOn)}` : info.semester
  doc.text(when, info.studentNumber ? M + 26 : M, 50.5)

  // ---- the total, in a gold band
  let y = 59
  doc.setFillColor(GOLD_BG); doc.setDrawColor(GOLD); doc.setLineWidth(0.4)
  doc.roundedRect(M, y, right - M, 24, 2, 2, 'FD')
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(MUTED); doc.setCharSpace(0.4)
  doc.text('CONFIRMED · TO BE PAID', M + 6, y + 7.5)
  doc.text('SESSIONS', M + 78, y + 7.5)
  doc.text('HOURS', M + 102, y + 7.5)
  doc.text('NOT CONFIRMED YET', M + 124, y + 7.5)
  doc.setCharSpace(0)
  doc.setFont('times', 'bold'); doc.setFontSize(20); doc.setTextColor(NAVY)
  doc.text(money(total), M + 6, y + 17.5)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(TEXT)
  doc.text(String(list.length), M + 78, y + 17)
  doc.text(String(hours), M + 102, y + 17)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(info.waiting.n ? TEXT : MUTED)
  doc.text(info.waiting.n ? `${info.waiting.n} session${info.waiting.n === 1 ? '' : 's'} · about ${money(info.waiting.amount)}` : 'None', M + 124, y + 17)

  y += 31
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(MUTED)
  const note = info.endsOn
    ? `Paid out in one payment after the semester ends on ${longDate(info.endsOn)}. Each session is paid per hour at the rate on the day admin confirmed it (now ${money(info.ratePerHour)} an hour).`
    : `Paid out in one payment after the semester ends. Each session is paid per hour at the rate on the day admin confirmed it (now ${money(info.ratePerHour)} an hour).`
  const noteLines = doc.splitTextToSize(note, right - M)
  doc.text(noteLines, M, y)
  y += noteLines.length * 4.2 + 5

  // ---- the table
  const cols = [
    { title: '#', w: 8 }, { title: 'Date', w: 26 }, { title: 'Module', w: 52 }, { title: 'Session', w: 34 },
    { title: 'Students', w: 20, num: true }, { title: 'Hours', w: 14, num: true }, { title: 'Amount', w: 20, num: true },
  ]
  const header = (top: number) => {
    doc.setFillColor(NAVY); doc.rect(M, top, right - M, 8, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor('#FFFFFF'); doc.setCharSpace(0.3)
    let x = M
    cols.forEach(c => {
      if (c.num) doc.text(c.title.toUpperCase(), x + c.w - 2.5, top + 5.3, { align: 'right' })
      else doc.text(c.title.toUpperCase(), x + 2.5, top + 5.3)
      x += c.w
    })
    doc.setCharSpace(0)
    return top + 8
  }
  y = header(y)

  if (!list.length) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(MUTED)
    doc.text('No sessions confirmed yet this semester.', M + 2.5, y + 8)
    y += 12
  }
  list.forEach((s, i) => {
    if (y > 262) { doc.addPage(); y = header(20) }
    const h = 10
    if (i % 2 === 1) { doc.setFillColor(ROW); doc.rect(M, y, right - M, h, 'F') }
    doc.setDrawColor(LINE_S); doc.setLineWidth(0.2); doc.line(M, y + h, right, y + h)
    let x = M
    const put = (k: number, text: string, opts: { font?: string; style?: string; size?: number; color?: string } = {}) => {
      const c = cols[k]
      doc.setFont(opts.font ?? 'helvetica', opts.style ?? 'normal'); doc.setFontSize(opts.size ?? 9.3); doc.setTextColor(opts.color ?? TEXT)
      const t = fit(doc, text, c.w - 4)
      if (c.num) doc.text(t, x + c.w - 2.5, y + 6.2, { align: 'right' })
      else doc.text(t, x + 2.5, y + 6.2)
      x += c.w
    }
    put(0, String(i + 1), { color: MUTED })
    put(1, shortDate(s.session_date))
    // Module: name, with the code small underneath.
    const mx = x
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.3); doc.setTextColor(TEXT)
    doc.text(fit(doc, info.moduleName(s.module_code) || s.module_code, cols[2].w - 4), mx + 2.5, y + 4.6)
    doc.setFont('courier', 'normal'); doc.setFontSize(7.5); doc.setTextColor(MUTED)
    doc.text(s.module_code, mx + 2.5, y + 8.2)
    x += cols[2].w
    const sx = x
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.3); doc.setTextColor(s.title || s.topic ? TEXT : MUTED)
    doc.text(fit(doc, s.title || s.topic || 'Tutorial', cols[3].w - 4), sx + 2.5, s.title && s.topic ? y + 4.6 : y + 6.2)
    if (s.title && s.topic) {
      doc.setFontSize(7.5); doc.setTextColor(MUTED)
      doc.text(fit(doc, s.topic, cols[3].w - 4), sx + 2.5, y + 8.2)
    }
    x += cols[3].w
    put(4, s.students_attended === null ? '–' : String(s.students_attended))
    put(5, hrs(Number(s.hours)))
    put(6, money(Number(s.amount ?? 0)), { style: 'bold' })
    y += h
  })

  // ---- total row
  if (list.length) {
    if (y > 268) { doc.addPage(); y = 20 }
    doc.setDrawColor(NAVY); doc.setLineWidth(0.6); doc.line(M, y + 0.3, right, y + 0.3)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(NAVY)
    doc.text('Total', M + 2.5, y + 7)
    const hx = M + cols.slice(0, 6).reduce((n, c) => n + c.w, 0)
    doc.text(hrs(hours), hx - 2.5, y + 7, { align: 'right' })
    doc.text(money(total), right - 2.5, y + 7, { align: 'right' })
  }

  // ---- footer on every page
  const pages = doc.getNumberOfPages()
  const made = new Date().toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setDrawColor(LINE); doc.setLineWidth(0.3); doc.line(M, 282, right, 282)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(MUTED)
    doc.text(`Confirmed sessions only · TutorLink · generated ${made}`, M, 287)
    doc.text(`Page ${p} of ${pages}`, right, 287, { align: 'right' })
  }

  doc.save(`TutorLink pay statement - ${info.tutor} - ${info.semester}.pdf`)
}
