/* ============================================================
   TutorLink — Mobile demo (Android / iOS)
   Same programme, same Rosebank design language as the web app,
   rebuilt as a phone app: role portals, a screen stack with
   native push transitions, bottom sheets, haptics — plus the
   Phase 2 additions (lecturer portal + messaging).
   No build step, no dependencies.
   ============================================================ */

/* ---------- data ------------------------------------------ */

const MODULES = [
  { code: 'DATA6211', name: 'Database (Introduction)' },
  { code: 'ISEC6321', name: 'Information Security' },
  { code: 'PROG6221', name: 'Programming 2A' },
  { code: 'SAND6221', name: 'System Analysis & Design' },
  { code: 'DATA6222', name: 'Database (Intermediate)' },
  { code: 'HCIN6222', name: 'Human Computer Interaction' },
  { code: 'IPMA6212', name: 'IT Project Management' },
  { code: 'PROG6212', name: 'Programming 2B' },
  { code: 'PROG1111', name: 'Programming 1' },
  { code: 'NETW1111', name: 'Networking Fundamentals' },
  { code: 'MATH1111', name: 'Mathematics for IT' },
]

const RESPONSE_TEMPLATES = [
  { id: 1, label: 'Role Already Filled',        text: 'Thank you for your application. The tutor position for the selected module(s) has already been filled for this intake. We encourage you to apply again in the next cycle.' },
  { id: 2, label: 'Does Not Meet Standards',    text: 'After reviewing your academic record, your application does not meet the required 75% threshold for the module(s) you selected. We encourage you to reapply once you have achieved the required academic standing.' },
  { id: 3, label: 'Application Incomplete',     text: 'Your application could not be processed as required documentation appears to be incomplete. Please resubmit with a complete and verified Academic Statement of Results.' },
  { id: 4, label: 'Congratulations — Approved', text: 'Congratulations! Your application to join the Rosebank Tutoring Programme has been approved. You will receive onboarding information within 2–3 business days. Welcome to the team.' },
]

const ADMIN_USER = {
  id: 'admin_001', role: 'admin', name: 'Programme Admin',
  email: 'admin@rosebank.ac.za', password: 'admin123',
}

const LECTURER_USER = {
  id: 'lect_001', role: 'lecturer', name: 'Dr M. Pretorius',
  email: 'm.pretorius@rosebank.ac.za', password: 'lect123',
  modules: ['PROG1111', 'NETW1111'],
}

const DEMO_APPS = [
  {
    id: 'app_001', name: 'Dylan Lluigi Di-Caprio Gorrah', email: 'dylan.gorrah@student.rosebank.ac.za',
    studentNumber: 'ST10398445', programme: 'Diploma in IT — Software Development',
    appliedModules: ['ISEC6321', 'PROG6221', 'DATA6222', 'HCIN6222'],
    reportModules: [
      { code: 'DATA6211', mark: 17, result: 'F'  },
      { code: 'ISEC6321', mark: 85, result: 'PD' },
      { code: 'PROG6221', mark: 77, result: 'PD' },
      { code: 'SAND6221', mark: 76, result: 'PD' },
      { code: 'DATA6222', mark: 81, result: 'PD' },
      { code: 'HCIN6222', mark: 92, result: 'PD' },
      { code: 'IPMA6212', mark: 70, result: 'P'  },
      { code: 'PROG6212', mark: 76, result: 'PD' },
    ],
    submittedAt: '2026-05-01', status: 'pending', backgroundChecked: false, responseMessage: '', processedAt: null,
  },
  {
    id: 'app_002', name: 'Achuma Welemtsha', email: 'achuma.w@student.rosebank.ac.za',
    studentNumber: 'ST10312345', programme: 'Diploma in IT — Software Development',
    appliedModules: ['PROG1111', 'MATH1111'],
    reportModules: [
      { code: 'PROG1111', mark: 82, result: 'PD' },
      { code: 'MATH1111', mark: 78, result: 'PD' },
      { code: 'NETW1111', mark: 79, result: 'PD' },
    ],
    submittedAt: '2026-04-28', status: 'under_review', backgroundChecked: true, responseMessage: '', processedAt: null,
  },
  {
    id: 'app_003', name: 'Thandeka Mokoena', email: 'thandeka.m@student.rosebank.ac.za',
    studentNumber: 'ST10401872', programme: 'Diploma in IT — Software Development',
    appliedModules: ['DATA6211', 'IPMA6212'],
    reportModules: [
      { code: 'DATA6211', mark: 58, result: 'P' },
      { code: 'IPMA6212', mark: 62, result: 'P' },
      { code: 'PROG1111', mark: 71, result: 'P' },
      { code: 'NETW1111', mark: 65, result: 'P' },
    ],
    submittedAt: '2026-05-03', status: 'pending', backgroundChecked: false, responseMessage: '', processedAt: null,
  },
  {
    id: 'app_004', name: 'Sipho Ndlovu', email: 'sipho.n@student.rosebank.ac.za',
    studentNumber: 'ST10289761', programme: 'Diploma in IT — Software Development',
    appliedModules: ['NETW1111', 'PROG1111'],
    reportModules: [
      { code: 'NETW1111', mark: 91, result: 'PD' },
      { code: 'PROG1111', mark: 88, result: 'PD' },
    ],
    submittedAt: '2026-04-25', status: 'approved', backgroundChecked: true,
    responseMessage: 'Congratulations! Your application has been approved. Welcome to the Rosebank Tutoring Programme.',
    processedAt: '2026-04-30',
  },
]

const DEMO_TUTORS = [
  {
    id: 'tutor_001', name: 'Refiloe Matsau', studentNumber: 'ST10312234',
    email: 'refiloe.matsau@tutor.rosebank.ac.za', password: 'refiloe123',
    modules: ['PROG1111', 'NETW1111'], approvedAt: '2026-03-15', paid: false,
    sessions: [
      { id: 's1', date: '2026-04-28', module: 'PROG1111', students: 8,  confirmed: true,  paid: false, loggedBy: 'admin' },
      { id: 's2', date: '2026-05-02', module: 'PROG1111', students: 6,  confirmed: true,  paid: false, loggedBy: 'admin' },
      { id: 's3', date: '2026-05-05', module: 'NETW1111', students: 10, confirmed: true,  paid: false, loggedBy: 'tutor' },
      { id: 's4', date: '2026-05-09', module: 'PROG1111', students: 7,  confirmed: false, paid: false, loggedBy: 'tutor' },
    ],
    attendanceDocs: [
      { id: 'd1', name: 'Attendance_April_Week4.pdf', uploadedAt: '2026-04-30', module: 'PROG1111' },
      { id: 'd2', name: 'Attendance_May_Week1.pdf',   uploadedAt: '2026-05-06', module: 'NETW1111' },
    ],
  },
  {
    id: 'tutor_002', name: 'Sipho Ndlovu', studentNumber: 'ST10289761',
    email: 'sipho.n@tutor.rosebank.ac.za', password: 'sipho123',
    modules: ['NETW1111', 'PROG1111'], approvedAt: '2026-04-30', paid: false,
    sessions: [
      { id: 's5', date: '2026-05-07', module: 'NETW1111', students: 9, confirmed: true,  paid: false, loggedBy: 'tutor' },
      { id: 's6', date: '2026-05-10', module: 'PROG1111', students: 5, confirmed: false, paid: false, loggedBy: 'tutor' },
    ],
    attendanceDocs: [
      { id: 'd3', name: 'Attendance_May_07.pdf', uploadedAt: '2026-05-08', module: 'NETW1111' },
    ],
  },
]

const MIN = 60000, HR = 3600000, DAY = 86400000
const NOW = Date.now()

/* Messages are grouped by the tutor they involve — that is the thread. */
const DEMO_MESSAGES = [
  { id: 'm1', tutorId: 'tutor_001', senderId: 'lect_001',  senderRole: 'lecturer', senderName: 'Dr M. Pretorius',
    topic: 'Week 8 session focus', ts: NOW - 42 * MIN, readByTutor: false,
    body: 'Please centre this week on arrays and the enhanced for loop. Half the class lost marks on Question 3 of the test for index errors. Work through two examples on the board before the practical.' },
  { id: 'm2', tutorId: 'tutor_001', senderId: 'admin_001', senderRole: 'admin',    senderName: 'Programme Admin',
    topic: 'Statement of results outstanding', ts: NOW - 90 * MIN, readByTutor: false,
    body: 'We have no updated Academic Statement of Results on file for this semester. Upload it on the web portal by Friday or your sessions will be paused.' },
  { id: 'm3', tutorId: 'tutor_001', senderId: 'lect_001',  senderRole: 'lecturer', senderName: 'Dr M. Pretorius',
    topic: 'Attendance register still open', ts: NOW - 2 * DAY, readByTutor: true,
    body: 'Your Thursday register is still open on the system. Close it off before Friday so the hours pull through to the payment run.' },
  { id: 'm4', tutorId: 'tutor_001', senderId: 'admin_001', senderRole: 'admin',    senderName: 'Programme Admin',
    topic: 'Payment run confirmed', ts: NOW - 6 * DAY, readByTutor: true,
    body: 'April hours have been approved at R150 per confirmed session. Payment goes out on the 25th. Any late submissions move to the next run.' },

  { id: 'm5', tutorId: 'tutor_002', senderId: 'lect_001',  senderRole: 'lecturer', senderName: 'Dr M. Pretorius',
    topic: 'Venue change Thursday', ts: NOW - 5 * HR, readByTutor: false,
    body: 'Thursday moves from Lab 2 to Lab 4. Same time. Lab 2 is booked for the second year assessment.' },
  { id: 'm6', tutorId: 'tutor_002', senderId: 'admin_001', senderRole: 'admin',    senderName: 'Programme Admin',
    topic: 'Contract renewal', ts: NOW - 3 * DAY, readByTutor: true,
    body: 'Your tutor contract runs to 30 November. Sign the renewal in the admin office before month end to carry over to Semester 1.' },
  { id: 'm7', tutorId: 'tutor_002', senderId: 'lect_001',  senderRole: 'lecturer', senderName: 'Dr M. Pretorius',
    topic: 'Subnetting worked examples', ts: NOW - 8 * DAY, readByTutor: true,
    body: 'Use the campus network diagram from the workbook for VLSM. The students already have the table so you can go straight into the calculations.' },
]

/* Upcoming sessions — the timetable side the web app never had. */
const DEMO_SCHEDULE = [
  { id: 'sc1', tutorId: 'tutor_001', module: 'PROG1111', day: 'Today',    time: '14:00 – 15:30', venue: 'Lab 2',    students: 14, live: true,  marked: false },
  { id: 'sc2', tutorId: 'tutor_001', module: 'NETW1111', day: 'Tomorrow', time: '10:00 – 11:30', venue: 'Room 314', students: 9,  live: false, marked: false },
  { id: 'sc3', tutorId: 'tutor_001', module: 'PROG1111', day: 'Thursday', time: '14:00 – 15:30', venue: 'Lab 4',    students: 14, live: false, marked: false },
  { id: 'sc4', tutorId: 'tutor_002', module: 'NETW1111', day: 'Today',    time: '08:00 – 09:30', venue: 'Lab 1',    students: 11, live: true,  marked: false },
  { id: 'sc5', tutorId: 'tutor_002', module: 'PROG1111', day: 'Friday',   time: '09:00 – 10:30', venue: 'Room 210', students: 7,  live: false, marked: false },
]

const DEMO_SETTINGS = { ratePerSession: 150, minMark: 75, predefinedResponses: RESPONSE_TEMPLATES }

const DEMO_LOGINS = {
  tutor:    { email: 'refiloe.matsau@tutor.rosebank.ac.za', password: 'refiloe123' },
  lecturer: { email: 'm.pretorius@rosebank.ac.za',          password: 'lect123' },
  admin:    { email: 'admin@rosebank.ac.za',                password: 'admin123' },
}

/* ---------- utils ----------------------------------------- */

const $  = (s, r) => (r || document).querySelector(s)
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s))
const clone = o => JSON.parse(JSON.stringify(o))
const today = () => new Date().toISOString().split('T')[0]

function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

const mName = code => (MODULES.find(m => m.code === code) || {}).name || code
const initials = n => String(n || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()

const fDate = s => s ? new Date(s).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

function ago(ts) {
  const d = Date.now() - ts
  if (d < MIN) return 'now'
  if (d < HR)  return Math.round(d / MIN) + 'm'
  if (d < DAY) return Math.round(d / HR) + 'h'
  if (d < 2 * DAY) return 'Yst'
  if (d < 7 * DAY) return Math.round(d / DAY) + 'd'
  return new Date(ts).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
}
const fullTime = ts => new Date(ts).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/* Real vibration on Android Chrome; silently does nothing on iOS Safari. */
function haptic(ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 8) } catch (e) {} }

const toastEl = $('#toast')
function toast(msg) {
  toastEl.textContent = msg
  toastEl.classList.add('on')
  clearTimeout(toastEl._t)
  toastEl._t = setTimeout(() => toastEl.classList.remove('on'), 2000)
}

function downloadCSV(rows, filename) {
  if (!rows.length) return
  const header = Object.keys(rows[0]).join(',')
  const body = rows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([header + '\n' + body], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

const C = { navy: '#0A2342', gold: '#C8A840', green: '#166534', red: '#991B1B', amber: '#92400E', muted: '#6B7B8F' }
const markColor = m => (m >= 75 ? C.green : m >= 50 ? C.amber : C.red)
const statusLabel = s => ({ approved: 'Approved', rejected: 'Rejected', under_review: 'Under Review', pending: 'Pending' }[s] || 'Pending')
const statusClass = s => ({ approved: 'badge--green', rejected: 'badge--red', under_review: 'badge--amber', pending: 'badge--slate' }[s] || 'badge--slate')

function autoFlag(app) {
  if (!app || !app.reportModules || !app.reportModules.length) return null
  for (const code of app.appliedModules) {
    const found = app.reportModules.find(m => m.code === code)
    if (!found || found.mark < state.settings.minMark) return 'fail'
  }
  return 'pass'
}

/* ---------- icons ----------------------------------------- */

const P = {
  back:   '<path d="M15 18l-6-6 6-6"/>',
  chev:   '<path d="M9 18l6-6-6-6"/>',
  mail:   '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.6 7.5l7.3 5.2a2 2 0 0 0 2.2 0l7.3-5.2"/>',
  inbox:  '<path d="M3 13.5V7a2.5 2.5 0 0 1 2.5-2.5h13A2.5 2.5 0 0 1 21 7v6.5"/><path d="M3 13.5h4.6l1.4 2.6h6l1.4-2.6H21v3.9a2.6 2.6 0 0 1-2.6 2.6H5.6A2.6 2.6 0 0 1 3 17.4z"/>',
  cap:    '<path d="M2.5 8.5L12 4l9.5 4.5L12 13z"/><path d="M6.5 10.8V16c0 1.4 2.5 2.6 5.5 2.6s5.5-1.2 5.5-2.6v-5.2"/><path d="M21 9v5"/>',
  board:  '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M12 17v3M8.5 20h7M8 9.5l2.2 2.2L16 8"/>',
  shield: '<path d="M12 3l7.5 3v5.4c0 4.3-3 8.1-7.5 9.6-4.5-1.5-7.5-5.3-7.5-9.6V6z"/><path d="M9.3 12l1.9 1.9 3.6-3.8"/>',
  people: '<circle cx="9" cy="8.5" r="3.3"/><path d="M2.8 19.2c.5-3.1 3.1-5 6.2-5s5.7 1.9 6.2 5"/><path d="M16.2 6.2a3.2 3.2 0 0 1 0 6.1"/><path d="M17.6 14.6c2 .6 3.4 2.2 3.7 4.6"/>',
  user:   '<circle cx="12" cy="8.4" r="3.7"/><path d="M4.6 20c.6-3.7 3.7-6 7.4-6s6.8 2.3 7.4 6"/>',
  cal:    '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  calChk: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M9 15l2 2 4-4"/>',
  clip:   '<path d="M16 4h1.5A2.5 2.5 0 0 1 20 6.5v12A2.5 2.5 0 0 1 17.5 21h-11A2.5 2.5 0 0 1 4 18.5v-12A2.5 2.5 0 0 1 6.5 4H8"/><rect x="8" y="2.5" width="8" height="3.6" rx="1.2"/><path d="M8.5 13l1.8 1.8 3.5-3.6"/>',
  wallet: '<path d="M3 8.5A2.5 2.5 0 0 1 5.5 6H18a2 2 0 0 1 2 2v1"/><rect x="3" y="8.5" width="18" height="11" rx="2.5"/><path d="M16.5 14h1.2"/>',
  doc:    '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
  upload: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 18v-6M9.5 14.5L12 12l2.5 2.5"/>',
  plus:   '<path d="M12 5v14M5 12h14"/>',
  check:  '<path d="M4 12.5l5 5L20 6.5"/>',
  x:      '<path d="M18 6L6 18M6 6l12 12"/>',
  alert:  '<path d="M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4M12 17h.01"/>',
  clock:  '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.2 1.9"/>',
  sliders:'<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1.5 14h5M9.5 8h5M17.5 16h5"/>',
  down:   '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7.5 10.5L12 15l4.5-4.5M12 15V3"/>',
  pin:    '<path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>',
}
function ic(n, size, sw) {
  return `<svg width="${size || 22}" height="${size || 22}" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="${sw || 1.7}" stroke-linecap="round" stroke-linejoin="round">${P[n] || ''}</svg>`
}

/* ---------- state ----------------------------------------- */

function initialState() {
  return {
    user: null,
    tab: 'home',
    applications: clone(DEMO_APPS),
    tutors: clone(DEMO_TUTORS),
    messages: clone(DEMO_MESSAGES),
    schedule: clone(DEMO_SCHEDULE),
    settings: clone(DEMO_SETTINGS),
    lecturers: [clone(LECTURER_USER)],             // every lecturer account — demo one plus anyone who signs up
    pendingLecturer: null,                         // half-finished sign-up, committed once modules are picked
    lecturerModules: [],
    picking: [],                                   // module chips during lecturer sign-up
    filter: 'all',
    decision: { type: 'predefined', tplId: '', custom: '' },
    upload: { status: 'idle', name: '' },
  }
}
let state = initialState()

const role = () => (state.user || {}).role
const meTutor = () => state.tutors.find(t => t.id === (state.user || {}).id) || null
const tutorById = id => state.tutors.find(t => t.id === id) || null
const appById = id => state.applications.find(a => a.id === id) || null

const thread = tid => state.messages.filter(m => m.tutorId === tid).sort((a, b) => b.ts - a.ts)
const isMine = m => !!state.user && m.senderId === state.user.id
const unreadForTutor = tid => state.messages.filter(m => m.tutorId === tid && !m.readByTutor).length

/* Tutors this lecturer may see: the ones teaching a module they teach. */
function myTutors() {
  if (role() === 'admin') return state.tutors
  const mods = state.lecturerModules
  return state.tutors.filter(t => t.modules.some(c => mods.indexOf(c) > -1))
}
/* The lecturer's Messages tab is the "what have I said lately" view, so it
   lists what this lecturer sent. The per-tutor thread is still the shared
   record — admin and other lecturers' notices are all in there. */
function myThreads() {
  const ids = myTutors().map(t => t.id)
  const list = state.messages.filter(m => ids.indexOf(m.tutorId) > -1)
  return (role() === 'lecturer' ? list.filter(isMine) : list).sort((a, b) => b.ts - a.ts)
}
const unreadDelivered = tid => state.messages.some(m => m.tutorId === tid && !m.readByTutor)

const lecturerByEmail = e =>
  state.lecturers.find(l => l.email.toLowerCase() === String(e || '').trim().toLowerCase()) || null

function signIn(email, password, want) {
  const e = String(email || '').trim().toLowerCase()
  if (want === 'admin' && e === ADMIN_USER.email && password === ADMIN_USER.password) return Object.assign({}, ADMIN_USER)
  if (want === 'lecturer') {
    /* every lecturer account lives in state.lecturers, so an account
       created in this session signs in exactly like the demo one */
    const l = lecturerByEmail(e)
    if (l && l.password === password) return Object.assign({}, l)
  }
  if (want === 'tutor') {
    const t = state.tutors.find(t => t.email.toLowerCase() === e && t.password === password)
    if (t) return { id: t.id, role: 'tutor', name: t.name, email: t.email }
  }
  throw new Error('Those details do not match an account.')
}

/* ---------- sign-up rules --------------------------------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i
const CAMPUS = 'rosebank.ac.za'

const emailTaken = e =>
  !!lecturerByEmail(e) || e === ADMIN_USER.email || state.tutors.some(t => t.email.toLowerCase() === e)

/* Returns the first thing wrong with the form as a sentence, or null. */
function registerError(name, email, pass, pass2) {
  const e = String(email || '').trim().toLowerCase()
  if (!name) return 'Enter your full name'
  if (!EMAIL_RE.test(e)) return 'Enter a valid email address'
  const domain = e.split('@')[1] || ''
  if (domain !== CAMPUS && domain.slice(-(CAMPUS.length + 1)) !== '.' + CAMPUS)
    return 'Use your rosebank.ac.za campus address'
  if (emailTaken(e)) return 'An account already uses that email'
  if (pass.length < 6) return 'Password needs at least 6 characters'
  if (pass !== pass2) return 'The two passwords do not match'
  return null
}

function enterApp(user) {
  state.user = user
  state.lecturerModules = user.role === 'lecturer' ? (state.lecturerModules.length ? state.lecturerModules : (user.modules || []).slice()) : []
  state.tab = user.role === 'tutor' ? 'home' : user.role === 'lecturer' ? 'tutors' : 'home'
  root('app')
}

/* ---------- router ---------------------------------------- */

const stage = $('#stage')
const stack = []

const VIEWS = {
  roles:      () => vRoles(),
  auth:       p => vAuth(p),
  pickMods:   () => vPickModules(),
  app:        () => vApp(),
  thread:     p => vThread(p.tid),
  appDetail:  p => vAppDetail(p.id),
  tutorDetail:p => vTutorDetail(p.id),
}

function render(entry) { return VIEWS[entry.name](entry.params || {}) }

function push(name, params, mode) {
  const fade = mode === 'fade' || mode === 'root'
  const entry = { name: name, params: params || {} }
  const el = document.createElement('div')
  el.className = 'screen enter' + (fade ? ' fade' : '')
  el.innerHTML = render(entry)
  entry.el = el
  stage.appendChild(el)
  const prev = stack[stack.length - 1]
  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.classList.remove('enter')
    if (prev && !fade) prev.el.classList.add('behind')
    if (prev && fade) prev.el.style.opacity = '0'
  }))
  stack.push(entry)
  if (mode !== 'root') history.pushState({ d: stack.length - 1 }, '')
  return entry
}

function popScreen() {
  if (stack.length < 2) return
  const entry = stack.pop()
  /* backing out of step 2 abandons the sign-up rather than leaving
     a half-made account lying around */
  if (entry.name === 'pickMods' && state.pendingLecturer) state.pendingLecturer = null
  const prev = stack[stack.length - 1]
  prev.el.classList.remove('behind')
  prev.el.style.opacity = ''
  refresh()
  entry.el.classList.add('enter')
  setTimeout(() => entry.el.remove(), 500)
}
function goBack() { if (stack.length < 2) return; haptic(6); history.back() }

function root(name, params) {
  stack.forEach(e => e.el.remove())
  stack.length = 0
  push(name, params, 'root')
  history.replaceState({ d: 0 }, '')
}

/* Re-render the top screen in place, keeping the scroll position. */
function refresh() {
  const entry = stack[stack.length - 1]
  if (!entry) return
  const old = entry.el.querySelector('.body')
  const y = old ? old.scrollTop : 0
  entry.el.innerHTML = render(entry)
  const now = entry.el.querySelector('.body')
  if (now) now.scrollTop = y
}

window.addEventListener('popstate', e => {
  const d = (e.state && e.state.d) || 0
  while (stack.length - 1 > d) popScreen()
})

/* ---------- sheet ----------------------------------------- */

const scrim = $('#scrim'), sheet = $('#sheet')

function openSheet(html) {
  sheet.innerHTML = `<div class="grabber"></div>${html}`
  sheet.scrollTop = 0
  scrim.classList.add('on')
  requestAnimationFrame(() => sheet.classList.add('on'))
  haptic(10)
}
function setSheet(html) { sheet.innerHTML = `<div class="grabber"></div>${html}` }
function closeSheet() { sheet.classList.remove('on'); scrim.classList.remove('on') }
const sheetOpen = () => sheet.classList.contains('on')

scrim.addEventListener('click', closeSheet)

/* drag the sheet down to dismiss */
;(function () {
  let y0 = null, dy = 0
  sheet.addEventListener('pointerdown', e => {
    if (e.target.closest('input,textarea,select,button,label')) return
    if (sheet.scrollTop > 0) return
    y0 = e.clientY; dy = 0; sheet.classList.add('drag')
  })
  window.addEventListener('pointermove', e => {
    if (y0 === null) return
    dy = Math.max(0, e.clientY - y0)
    sheet.style.transform = `translate3d(0,${dy}px,0)`
  })
  window.addEventListener('pointerup', () => {
    if (y0 === null) return
    sheet.classList.remove('drag')
    sheet.style.transform = ''
    if (dy > 90) closeSheet()
    y0 = null
  })
})()

/* ---------- shared pieces --------------------------------- */

function navBar(title, left, right) {
  return `<div class="nav">
    <div class="slot">${left || ''}</div>
    <h1>${esc(title)}</h1>
    <div class="slot slot--r">${right || ''}</div>
  </div>`
}
const backBtn = `<button class="iconbtn" data-a="back" aria-label="Back">${ic('back', 24, 2.1)}</button>`
const demoBtn = `<button class="iconbtn" data-a="demo" aria-label="Demo controls">${ic('sliders', 20)}</button>`

function tabBtn(id, iconName, label, count) {
  const on = state.tab === id
  return `<button class="tab${on ? ' on' : ''}" data-a="tab" data-tab="${id}">
    <span class="wrap">${ic(iconName, 21)}${count ? `<span class="count">${count}</span>` : ''}</span>
    <span>${label}</span>
  </button>`
}

function shell(title, tabs, body, opts) {
  const o = opts || {}
  return `${navBar(title, o.left || '', (o.right || '') + demoBtn)}
    <div class="body">${body}</div>
    ${o.fab || ''}
    <div class="tabbar">${tabs}</div>`
}

function badge(text, cls) { return `<span class="badge ${cls}">${text}</span>` }
function flagBadge(flag) {
  if (flag === 'pass') return badge('Eligible', 'badge--green')
  if (flag === 'fail') return badge('Ineligible', 'badge--red')
  return badge('Pending', 'badge--plain')
}
function empty(title, line, action, iconName) {
  return `<div class="empty"><div class="g">${ic(iconName || 'inbox', 24)}</div>
    <h3>${esc(title)}</h3><p>${esc(line)}</p>
    ${action ? `<div style="margin-top:20px">${action}</div>` : ''}</div>`
}
function moduleChips(codes, cls) {
  return `<div class="chips">${codes.map(c =>
    `<span class="chip chip--static ${cls || ''}"><span class="code">${c}</span>${esc(mName(c))}</span>`).join('')}</div>`
}
function metric(value, label, cls, small) {
  return `<div class="metric ${cls || ''}"><div class="n${small ? ' n--sm' : ''}">${esc(value)}</div><div class="l">${esc(label)}</div></div>`
}
function profileCard(name, line, gold) {
  return `<div class="card card--pad" style="display:flex;align-items:center;gap:14px">
    <span class="avatar avatar--lg${gold ? ' avatar--gold' : ''}">${initials(name)}</span>
    <span style="min-width:0">
      <span class="rname" style="font-size:16px">${esc(name)}</span>
      <span class="rmeta">${esc(line)}</span>
    </span>
  </div>`
}

/* one entry in a message thread */
function tlItem(m) {
  const mine = isMine(m)
  const unread = role() === 'tutor' ? !m.readByTutor : (!m.readByTutor && mine)
  const tag = mine ? '<span class="tag tag--you">You</span>'
    : m.senderRole === 'lecturer' ? '<span class="tag tag--lect">Lecturer</span>'
    : '<span class="tag tag--admin">Admin</span>'
  const receipt = mine && !m.readByTutor ? '<span class="stamp">· delivered</span>' : ''
  return `<button class="tl${mine ? ' mine' : ''}${unread && !mine ? ' unread' : ''}" data-a="msg" data-id="${m.id}">
    <span class="tl-top">
      <span class="tl-topic">${esc(m.topic)}</span>
      <span class="stamp">${ago(m.ts)}</span>
    </span>
    <span class="tl-who">${tag}${mine ? '' : `<span>${esc(m.senderName)}</span>`}${receipt}</span>
    <span class="tl-body">
      <span class="txt">${esc(m.body)}</span>
      <span class="stamp" style="display:block;margin-top:10px">${fullTime(m.ts)}</span>
    </span>
  </button>`
}

function threadRow(tid) {
  const t = tutorById(tid)
  const list = thread(tid)
  const last = list[0]
  const un = unreadDelivered(tid)
  return `<button class="row" data-a="thread" data-id="${tid}">
    <span class="avatar">${initials(t.name)}</span>
    <span class="rmain">
      <span class="rname">${esc(t.name)}</span>
      <span class="rmeta">${last ? esc(last.topic) : t.modules.join(' · ')}</span>
    </span>
    <span class="rside">
      ${last ? `<span class="stamp">${ago(last.ts)}</span>` : ''}
      ${un ? '<span class="dot"></span>' : ''}${ic('chev', 17, 2.1)}
    </span>
  </button>`
}

/* ---------- view: role select ----------------------------- */

const ROLES = [
  { id: 'tutor',    icon: 'cap',    title: 'Tutor',    desc: 'Sessions, attendance, pay, messages' },
  { id: 'lecturer', icon: 'board',  title: 'Lecturer', desc: 'Your modules and their tutors',      gold: true, tag: 'New' },
  { id: 'admin',    icon: 'shield', title: 'Admin',    desc: 'Applications, tutors, oversight' },
]

function vRoles() {
  return `
  <div class="brandbar" style="display:flex;align-items:center;justify-content:space-between">
    <img src="IMG/Rosebank+International+University.webp" alt="Rosebank College" />
    <button class="iconbtn" style="margin:0 -10px 0 0" data-a="demo" aria-label="Demo controls">${ic('sliders', 20)}</button>
  </div>
  <div class="body"><div class="pad">
    <p class="eyebrow">Rosebank College</p>
    <h1 class="display">TutorLink</h1>
    <p class="sub">The peer tutoring programme, on your phone. Choose how you use it.</p>
    <div class="roles stagger">
      ${ROLES.map((r, i) => `
        <button class="role${r.gold ? ' role--gold' : ''}" data-a="role" data-id="${r.id}" style="animation-delay:${.05 + i * .07}s">
          <span class="glyph">${ic(r.icon, 22)}</span>
          <span class="rmain">
            <span class="rname">${r.title}${r.tag ? ` <span class="badge badge--gold" style="margin-left:6px">${r.tag}</span>` : ''}</span>
            <span class="rdesc">${r.desc}</span>
          </span>
          <span class="chev">${ic('chev', 18, 2.1)}</span>
        </button>`).join('')}
    </div>
    <p class="small muted" style="margin-top:26px;line-height:1.7">
      Students still apply to tutor on the web portal — that happens once, with a PDF upload, and it belongs on a laptop.
    </p>
  </div></div>`
}

/* ---------- view: sign in / register ---------------------- */

function vAuth(p) {
  const r = p.role
  const label = r === 'tutor' ? 'Tutor' : r === 'lecturer' ? 'Lecturer' : 'Admin'
  const reg = p.mode === 'register'
  const creds = DEMO_LOGINS[r]
  return `
  ${navBar(label, backBtn)}
  <div class="body"><div class="pad">
    ${reg ? '<p class="eyebrow">Step 1 of 2 · Your details</p>' : ''}
    <h2 class="display display--sm">${reg ? 'Create your<br>lecturer account' : 'Welcome<br>back'}</h2>
    <p class="sub">${reg ? 'Register once, then pick the modules you teach.' : 'Sign in with your campus account.'}</p>

    <div style="margin-top:24px">
      ${reg ? `<div class="field"><label>Full name</label>
        <input id="f-name" type="text" autocomplete="name" placeholder="Dr M. Pretorius" /></div>` : ''}
      <div class="field"><label>Campus email</label>
        <input id="f-mail" type="email" inputmode="email" autocapitalize="off" autocomplete="${reg ? 'username' : 'email'}"
          placeholder="name@rosebank.ac.za" value="${reg ? '' : esc(creds.email)}" /></div>
      <div class="field"><label>Password</label>
        <input id="f-pass" type="password" autocomplete="${reg ? 'new-password' : 'current-password'}"
          placeholder="${reg ? 'At least 6 characters' : '••••••••'}" value="${reg ? '' : esc(creds.password)}" /></div>
      ${reg ? `<div class="field"><label>Confirm password</label>
        <input id="f-pass2" type="password" autocomplete="new-password" placeholder="Type it again" /></div>` : ''}
    </div>

    ${reg ? `<div class="note note--plain" style="margin-top:16px">${ic('alert', 15)}
      <span>Use your <b>rosebank.ac.za</b> address — it is how the programme office identifies you.</span></div>` : ''}

    <button class="btn"${reg ? ' style="margin-top:18px"' : ''} data-a="auth" data-role="${r}" data-mode="${p.mode}">${reg ? 'Continue' : 'Sign in'}</button>

    ${reg ? `<button class="btn btn--ghost" data-a="authMode" data-role="${r}" data-mode="signin">Already registered? Sign in</button>`
      : r === 'lecturer'
        ? `<button class="btn btn--ghost" data-a="authMode" data-role="${r}" data-mode="register">New lecturer? Create an account</button>`
        : `<div class="note note--plain" style="margin-top:16px">${ic('alert', 15)}
            <span>${r === 'tutor'
              ? 'Tutor accounts are created automatically when an application is approved.'
              : 'Admin accounts are issued by the programme office.'}</span>
           </div>`}

    ${reg ? '' : `<div class="note note--gold" style="margin-top:14px">${ic('sliders', 15)}
      <span><b>Demo account</b> — already filled in: ${esc(creds.email)}</span></div>`}

    ${!reg && r === 'lecturer' && state.lecturers.length > 1 ? `<div class="note note--plain" style="margin-top:10px">${ic('alert', 15)}
      <span>Accounts you created in this demo sign in here too — clear the fields and use your own email.</span></div>` : ''}
  </div></div>`
}

/* ---------- view: lecturer module picker ------------------ */

function vPickModules() {
  const signup = !!state.pendingLecturer          // step 2 of registration vs editing later
  const n = state.picking.length
  return `
  ${navBar(signup ? 'Modules' : 'Edit modules', backBtn)}
  <div class="body"><div class="pad">
    <p class="eyebrow">${signup ? 'Step 2 of 2 · Your modules' : 'Your teaching load'}</p>
    <h2 class="display display--sm">Which modules<br>do you teach?</h2>
    <p class="sub">Tutors on these modules appear on your dashboard, and they are the only tutors you can message.</p>
    <div class="chips" style="margin-top:22px">
      ${MODULES.map(m => `<button class="chip${state.picking.indexOf(m.code) > -1 ? ' on' : ''}" data-a="pick" data-code="${m.code}">
        <span class="code">${m.code}</span>${esc(m.name)}</button>`).join('')}
    </div>
    <button class="btn" style="margin-top:24px" data-a="picked"${n ? '' : ' disabled'}>
      ${signup ? 'Create account' : 'Save modules'}${n ? ` (${n})` : ''}
    </button>
    <p class="small muted" style="margin-top:14px;line-height:1.7">
      ${signup
        ? 'Pick at least one. You can change this any time from your profile, and your dashboard updates straight away.'
        : 'Removing a module hides its tutors and stops you messaging them.'}
    </p>
  </div></div>`
}

/* ---------- view: app shell ------------------------------- */

function vApp() {
  if (role() === 'tutor')    return vTutorApp()
  if (role() === 'lecturer') return vLecturerApp()
  return vAdminApp()
}

/* ================= TUTOR =================================== */

function vTutorApp() {
  const t = meTutor()
  if (!t) return ''
  const un = unreadForTutor(t.id)
  const titles = { home: 'TutorLink', sessions: 'Sessions', inbox: 'Messages', pay: 'Pay', profile: 'Profile' }
  const body =
      state.tab === 'sessions' ? tutorSessions(t)
    : state.tab === 'inbox'    ? tutorInbox(t)
    : state.tab === 'pay'      ? tutorPay(t)
    : state.tab === 'profile'  ? tutorProfile(t)
    : tutorHome(t)

  const tabs = tabBtn('home', 'cal', 'Schedule')
             + tabBtn('sessions', 'calChk', 'Sessions')
             + tabBtn('inbox', 'inbox', 'Messages', un)
             + tabBtn('pay', 'wallet', 'Pay')
             + tabBtn('profile', 'user', 'Profile')

  const left = `<button class="iconbtn" data-a="tab" data-tab="inbox" aria-label="Messages">
      ${ic('mail', 22)}${un ? `<span class="count">${un}</span>` : ''}</button>`

  const fab = state.tab === 'sessions'
    ? `<button class="fab" data-a="logSession">${ic('plus', 18, 2.3)} Log session</button>` : ''

  return shell(titles[state.tab] || 'TutorLink', tabs, body, { left: left, fab: fab })
}

function tutorHome(t) {
  const confirmed = t.sessions.filter(s => s.confirmed)
  const pending = t.sessions.filter(s => !s.confirmed)
  const earned = confirmed.length * state.settings.ratePerSession
  const mine = state.schedule.filter(s => s.tutorId === t.id)
  const un = unreadForTutor(t.id)

  return `<div class="pad stagger">
    <p class="eyebrow">Welcome back</p>
    <h2 class="display display--sm">${esc(t.name.split(' ')[0])}</h2>
    ${moduleChips(t.modules)}

    ${un ? `<button class="note note--gold" style="width:100%;text-align:left;margin-top:18px" data-a="tab" data-tab="inbox">
      ${ic('mail', 16)}<span><b>${un} unread message${un > 1 ? 's' : ''}</b> from your lecturer or admin</span>
    </button>` : ''}

    <div class="sect">Upcoming</div>
    <div class="card">
      ${mine.length ? mine.map(s => `
        <div class="row">
          <span class="avatar avatar--code${s.live ? ' avatar--gold' : ''}">${s.module.slice(0, 4)}</span>
          <span class="rmain">
            <span class="rname">${s.day} · ${s.time}</span>
            <span class="rmeta">${esc(s.venue)} · ${s.students} students · ${esc(mName(s.module))}</span>
          </span>
          <span class="rside">
            ${s.live && !s.marked ? `<button class="btn btn--sm btn--outline" data-a="markAtt" data-id="${s.id}">Mark</button>`
              : s.marked ? badge('Logged', 'badge--green') : `<span class="stamp">${s.day}</span>`}
          </span>
        </div>`).join('') : '<div class="row"><span class="rmain"><span class="rmeta">Nothing scheduled this week.</span></span></div>'}
    </div>

    <div class="sect">This month</div>
    <div class="metrics">
      ${metric(t.sessions.length, 'Sessions', 'metric--navy')}
      ${metric(confirmed.length, 'Confirmed', 'metric--green')}
      ${metric('R' + earned.toLocaleString(), 'Earned', 'metric--gold', true)}
    </div>

    ${pending.length ? `
      <div class="sect">Awaiting admin confirmation</div>
      <div class="card">
        ${pending.map(s => `<div class="row">
          <span class="avatar avatar--code">${s.module.slice(0, 4)}</span>
          <span class="rmain">
            <span class="rname">${esc(mName(s.module))}</span>
            <span class="rmeta">${fDate(s.date)} · ${s.students} students</span>
          </span>
          <span class="rside">${badge('Pending', 'badge--amber')}</span>
        </div>`).join('')}
      </div>` : ''}
  </div>`
}

function tutorSessions(t) {
  const rows = t.sessions.slice().reverse()
  return `<div class="pad pad--fab stagger">
    <div class="sect">Logged sessions <span class="muted">${t.sessions.length}</span></div>
    <div class="card">
      ${rows.length ? rows.map(s => `<div class="row">
        <span class="avatar avatar--code">${s.module.slice(0, 4)}</span>
        <span class="rmain">
          <span class="rname">${esc(mName(s.module))}</span>
          <span class="rmeta">${fDate(s.date)} · ${s.students} students · logged by ${s.loggedBy}</span>
        </span>
        <span class="rside">${badge(s.confirmed ? 'Confirmed' : 'Pending', s.confirmed ? 'badge--green' : 'badge--amber')}</span>
      </div>`).join('') : '<div class="row"><span class="rmain"><span class="rmeta">No sessions yet — tap Log session.</span></span></div>'}
    </div>

    <div class="sect">Attendance registers
      <button class="link" data-a="uploadReg">Upload</button>
    </div>
    <div class="card">
      ${t.attendanceDocs.length ? t.attendanceDocs.map(d => `<div class="row">
        <span class="avatar avatar--code">${ic('doc', 18)}</span>
        <span class="rmain">
          <span class="rname">${esc(d.name)}</span>
          <span class="rmeta">${esc(d.module)} · uploaded ${fDate(d.uploadedAt)}</span>
        </span>
      </div>`).join('') : '<div class="row"><span class="rmain"><span class="rmeta">No registers uploaded yet.</span></span></div>'}
    </div>
    <div class="note note--plain" style="margin-top:12px">${ic('alert', 15)}
      <span>A session only counts towards pay once admin confirms it against the signed register.</span></div>
  </div>`
}

function tutorInbox(t) {
  const list = thread(t.id)
  if (!list.length) return empty('No messages', 'Your lecturer and the programme admin will reach you here.')
  return `<div class="pad">
    <p class="eyebrow">Notices · ${list.length}</p>
    <div class="timeline">${list.map(tlItem).join('')}</div>
  </div>`
}

function tutorPay(t) {
  const rate = state.settings.ratePerSession
  const confirmed = t.sessions.filter(s => s.confirmed)
  const pending = t.sessions.filter(s => !s.confirmed)
  const total = confirmed.length * rate
  return `<div class="pad stagger">
    <div class="card card--pad card--gold">
      <p class="eyebrow" style="margin-bottom:6px">Approved earnings</p>
      <div class="money">R${total.toLocaleString()}</div>
      <p class="small muted" style="margin-top:8px">${confirmed.length} confirmed session${confirmed.length === 1 ? '' : 's'} at R${rate} each</p>
      <div style="margin-top:14px;border-top:1px solid var(--lineS);padding-top:6px">
        <div class="payrow"><span class="muted">Rate per session</span><span style="font-weight:600">R${rate}</span></div>
        <div class="payrow"><span class="muted">Awaiting confirmation</span><span style="font-weight:600;color:${C.amber}">R${(pending.length * rate).toLocaleString()}</span></div>
        <div class="payrow"><span class="muted">Projected total</span><span style="font-weight:600;color:var(--goldD)">R${(t.sessions.length * rate).toLocaleString()}</span></div>
      </div>
    </div>

    <div class="sect">Breakdown</div>
    <div class="card">
      ${confirmed.length ? confirmed.map(s => `<div class="row">
        <span class="avatar avatar--code">${s.module.slice(0, 4)}</span>
        <span class="rmain">
          <span class="rname">${esc(mName(s.module))}</span>
          <span class="rmeta">${fDate(s.date)} · ${s.students} students</span>
        </span>
        <span class="rside" style="font-weight:700;color:${C.green};font-size:13px">R${rate}</span>
      </div>`).join('') : '<div class="row"><span class="rmain"><span class="rmeta">Nothing confirmed yet.</span></span></div>'}
    </div>

    <button class="btn btn--outline" style="margin-top:16px" data-a="csv"${confirmed.length ? '' : ' disabled'}>
      ${ic('down', 16)} Export statement (CSV)</button>
    ${t.paid ? `<div class="note note--green" style="margin-top:12px">${ic('check', 15, 2.2)}<span>Marked as paid by admin.</span></div>` : ''}
  </div>`
}

function tutorProfile(t) {
  return `<div class="pad stagger">
    ${profileCard(t.name, 'Approved tutor · ' + t.studentNumber)}
    <div class="sect">Modules tutored</div>
    <div class="card">
      ${t.modules.map(c => `<div class="row">
        <span class="rmain"><span class="rname">${esc(mName(c))}</span><span class="rmeta mono">${c}</span></span>
      </div>`).join('')}
    </div>
    <div class="sect">Account</div>
    <div class="card">
      <div class="row"><span class="rmain"><span class="rname">Email</span><span class="rmeta">${esc(t.email)}</span></span></div>
      <div class="row"><span class="rmain"><span class="rname">Approved</span><span class="rmeta">${fDate(t.approvedAt)}</span></span></div>
      <div class="row"><span class="rmain"><span class="rname">Registers on file</span><span class="rmeta">${t.attendanceDocs.length} document${t.attendanceDocs.length === 1 ? '' : 's'}</span></span></div>
    </div>
    <button class="btn btn--outline" style="margin-top:18px" data-a="signout">Sign out</button>
  </div>`
}

/* ================= LECTURER ================================ */

function vLecturerApp() {
  const titles = { tutors: 'My tutors', messages: 'Messages', profile: 'Profile' }
  const body = state.tab === 'messages' ? lecturerMessages()
    : state.tab === 'profile' ? lecturerProfile()
    : lecturerTutors()
  const tabs = tabBtn('tutors', 'people', 'Tutors')
             + tabBtn('messages', 'mail', 'Messages')
             + tabBtn('profile', 'user', 'Profile')
  return shell(titles[state.tab] || 'My tutors', tabs, body)
}

/* A lecturer is "new" until they have actually sent something — that is
   what decides whether they get the first-run copy or the normal one. */
const firstRun = () => !!(state.user || {}).isNew && !state.messages.some(isMine)

function lecturerTutors() {
  const list = myTutors()
  const mods = state.lecturerModules
  const sessions = list.reduce((n, t) => n + t.sessions.length, 0)
  const editBtn = `<button class="btn btn--outline btn--sm" data-a="editMods">Choose modules</button>`

  if (!mods.length) {
    return `<div class="pad">${empty('No modules yet',
      'Pick the modules you teach and the tutors on them appear here.', editBtn, 'board')}</div>`
  }

  if (!list.length) {
    return `<div class="pad stagger">
      <p class="eyebrow">Modules you teach</p>
      ${moduleChips(mods)}
      ${empty('No tutors yet',
        'Nobody has been approved to tutor ' + (mods.length > 1 ? 'these modules' : mods[0]) +
        ' so far. As soon as admin approves one, they appear here and you can message them.',
        editBtn, 'people')}
    </div>`
  }

  return `<div class="pad stagger">
    <p class="eyebrow">Modules you teach</p>
    ${moduleChips(mods)}
    <div class="metrics" style="margin-top:16px">
      ${metric(list.length, 'Tutors', 'metric--navy')}
      ${metric(mods.length, 'Modules', 'metric--gold')}
      ${metric(sessions, 'Sessions run', 'metric--green')}
    </div>

    ${firstRun() ? `<div class="note note--gold" style="margin-top:16px">${ic('mail', 16)}
      <span><b>Your account is ready.</b> These are the tutors on your modules — tap a name to read the thread and send your first notice.</span>
    </div>` : ''}

    <div class="sect">Tutors <span class="muted">${list.length}</span></div>
    <div class="card">${list.map(t => threadRow(t.id)).join('')}</div>
    <div class="note note--plain" style="margin-top:12px">${ic('alert', 15)}
      <span>You only see tutors on the modules you teach. Tap a name to open the thread.</span></div>
  </div>`
}

function lecturerMessages() {
  const all = myThreads()
  if (!all.length) {
    return `<div class="pad">${empty('Nothing sent yet',
      myTutors().length
        ? 'Everything you send to your tutors collects here. Open one from your dashboard to write the first notice.'
        : 'Once there are tutors on your modules, everything you send them collects here.',
      myTutors().length ? '<button class="btn btn--outline btn--sm" data-a="tab" data-tab="tutors">Go to my tutors</button>' : '',
      'mail')}</div>`
  }
  return `<div class="pad stagger">
    <p class="eyebrow">Sent by you</p>
    <div class="card">
      ${all.map(m => {
        const t = tutorById(m.tutorId)
        if (!t) return ''
        return `<button class="row" data-a="thread" data-id="${m.tutorId}">
          <span class="avatar avatar--gold">${initials(t.name)}</span>
          <span class="rmain">
            <span class="rname">${esc(m.topic)}</span>
            <span class="rmeta">To ${esc(t.name)}${m.readByTutor ? '' : ' · delivered'}</span>
          </span>
          <span class="rside"><span class="stamp">${ago(m.ts)}</span>${ic('chev', 17, 2.1)}</span>
        </button>`
      }).join('')}
    </div>
    <div class="note note--plain" style="margin-top:12px">${ic('alert', 15)}
      <span>Notices from admin and other lecturers sit in each tutor's thread — tap one to read the full record.</span></div>
  </div>`
}

function lecturerProfile() {
  return `<div class="pad stagger">
    ${profileCard(state.user.name, 'Lecturer · Rosebank College', true)}
    <div class="sect">Modules taught
      <button class="link" data-a="editMods">Edit</button>
    </div>
    <div class="card">
      ${state.lecturerModules.length ? state.lecturerModules.map(c => `<div class="row">
        <span class="rmain"><span class="rname">${esc(mName(c))}</span><span class="rmeta mono">${c}</span></span>
        <span class="rside">${badge(state.tutors.filter(t => t.modules.indexOf(c) > -1).length + ' tutors', 'badge--plain')}</span>
      </div>`).join('')
        : `<div class="row"><span class="rmain"><span class="rmeta">None chosen yet — tap Edit to pick the modules you teach.</span></span></div>`}
    </div>
    <div class="sect">Account</div>
    <div class="card">
      <div class="row"><span class="rmain"><span class="rname">Email</span><span class="rmeta">${esc(state.user.email)}</span></span></div>
      <div class="row"><span class="rmain"><span class="rname">Joined</span><span class="rmeta">${fDate(state.user.joinedAt) === '—' ? 'Demo account' : fDate(state.user.joinedAt)}</span></span></div>
      <div class="row"><span class="rmain"><span class="rname">Messages sent</span><span class="rmeta">${state.messages.filter(isMine).length}</span></span></div>
    </div>
    <button class="btn btn--outline" style="margin-top:18px" data-a="signout">Sign out</button>
  </div>`
}

/* ================= ADMIN =================================== */

function vAdminApp() {
  const titles = { home: 'Overview', apps: 'Applications', tutors: 'Tutors', messages: 'Messages', profile: 'Settings' }
  const body =
      state.tab === 'apps'     ? adminApps()
    : state.tab === 'tutors'   ? adminTutors()
    : state.tab === 'messages' ? adminMessages()
    : state.tab === 'profile'  ? adminSettings()
    : adminHome()
  const tabs = tabBtn('home', 'board', 'Overview')
             + tabBtn('apps', 'clip', 'Applications', state.applications.filter(a => a.status === 'pending').length)
             + tabBtn('tutors', 'people', 'Tutors')
             + tabBtn('messages', 'mail', 'Messages')
             + tabBtn('profile', 'user', 'Settings')
  const fab = state.tab === 'messages'
    ? `<button class="fab" data-a="pickTutor">${ic('plus', 18, 2.3)} New message</button>` : ''
  return shell(titles[state.tab] || 'Overview', tabs, body, { fab: fab })
}

function adminHome() {
  const pending = state.applications.filter(a => a.status === 'pending' || a.status === 'under_review')
  const unpaid = state.tutors.reduce((n, t) => n + t.sessions.filter(s => s.confirmed && !s.paid).length, 0)
  const owed = unpaid * state.settings.ratePerSession
  const toConfirm = state.tutors.reduce((n, t) => n + t.sessions.filter(s => !s.confirmed).length, 0)

  return `<div class="pad stagger">
    <p class="eyebrow">Programme</p>
    <div class="metrics">
      ${metric(pending.length, 'Open applications', 'metric--amber')}
      ${metric(state.tutors.length, 'Active tutors', 'metric--navy')}
      ${metric('R' + owed.toLocaleString(), 'Outstanding', 'metric--gold', true)}
    </div>

    ${toConfirm ? `<div class="note note--amber" style="margin-top:14px">${ic('clock', 15)}
      <span><b>${toConfirm} session${toConfirm > 1 ? 's' : ''}</b> logged by tutors are waiting for your confirmation.</span></div>` : ''}

    <div class="sect">Recent applications <button class="link" data-a="tab" data-tab="apps">View all</button></div>
    <div class="card">
      ${state.applications.slice(0, 4).map(a => `<button class="row" data-a="openApp" data-id="${a.id}">
        <span class="avatar">${initials(a.name)}</span>
        <span class="rmain">
          <span class="rname">${esc(a.name)}</span>
          <span class="rmeta">${esc(a.studentNumber)} · ${a.appliedModules.length} module${a.appliedModules.length === 1 ? '' : 's'}</span>
        </span>
        <span class="rside">${badge(statusLabel(a.status), statusClass(a.status))}${ic('chev', 17, 2.1)}</span>
      </button>`).join('')}
    </div>

    <div class="sect">Tutors</div>
    <div class="card">
      ${state.tutors.map(t => {
        const conf = t.sessions.filter(s => s.confirmed && !s.paid).length
        return `<button class="row" data-a="openTutor" data-id="${t.id}">
          <span class="avatar">${initials(t.name)}</span>
          <span class="rmain">
            <span class="rname">${esc(t.name)}</span>
            <span class="rmeta">${t.modules.join(' · ')} · ${t.sessions.length} sessions</span>
          </span>
          <span class="rside" style="color:var(--goldD);font-weight:700;font-size:13px">R${(conf * state.settings.ratePerSession).toLocaleString()}${ic('chev', 17, 2.1)}</span>
        </button>`
      }).join('')}
    </div>
  </div>`
}

const APP_FILTERS = ['all', 'pending', 'under_review', 'approved', 'rejected']

function adminApps() {
  const f = state.filter
  const rows = f === 'all' ? state.applications : state.applications.filter(a => a.status === f)
  return `<div class="pad stagger">
    <div class="filters">
      ${APP_FILTERS.map(s => `<button class="chip${f === s ? ' on' : ''}" data-a="filter" data-f="${s}">
        ${s === 'all' ? 'All' : statusLabel(s)}</button>`).join('')}
    </div>
    <div class="sect" style="margin-top:18px">${rows.length} application${rows.length === 1 ? '' : 's'}</div>
    <div class="card">
      ${rows.length ? rows.map(a => `<button class="row" data-a="openApp" data-id="${a.id}">
        <span class="avatar">${initials(a.name)}</span>
        <span class="rmain">
          <span class="rname">${esc(a.name)}</span>
          <span class="rmeta">${esc(a.appliedModules.join(' · '))}</span>
        </span>
        <span class="rside">${flagBadge(autoFlag(a))}${ic('chev', 17, 2.1)}</span>
      </button>`).join('') : '<div class="row"><span class="rmain"><span class="rmeta">Nothing in this filter.</span></span></div>'}
    </div>
  </div>`
}

function adminTutors() {
  return `<div class="pad stagger">
    <p class="eyebrow">Active tutors · ${state.tutors.length}</p>
    <div class="card">
      ${state.tutors.map(t => {
        const conf = t.sessions.filter(s => s.confirmed && !s.paid).length
        return `<button class="row" data-a="openTutor" data-id="${t.id}">
          <span class="avatar">${initials(t.name)}</span>
          <span class="rmain">
            <span class="rname">${esc(t.name)}</span>
            <span class="rmeta">${esc(t.email)}</span>
          </span>
          <span class="rside">${t.paid ? badge('Paid', 'badge--green') : badge('R' + (conf * state.settings.ratePerSession), 'badge--gold')}${ic('chev', 17, 2.1)}</span>
        </button>`
      }).join('')}
    </div>
  </div>`
}

function adminMessages() {
  const all = state.messages.slice().sort((a, b) => b.ts - a.ts)
  if (!all.length) return empty('No messages yet', 'Tap New message to reach a tutor.')
  return `<div class="pad pad--fab stagger">
    <p class="eyebrow">All threads</p>
    <div class="card">
      ${all.map(m => {
        const t = tutorById(m.tutorId)
        if (!t) return ''
        return `<button class="row" data-a="thread" data-id="${m.tutorId}">
          <span class="avatar${isMine(m) ? ' avatar--gold' : ''}">${initials(t.name)}</span>
          <span class="rmain">
            <span class="rname">${esc(m.topic)}</span>
            <span class="rmeta">${esc(t.name)} · from ${isMine(m) ? 'you' : esc(m.senderName)}</span>
          </span>
          <span class="rside"><span class="stamp">${ago(m.ts)}</span>${!m.readByTutor ? '<span class="dot"></span>' : ''}${ic('chev', 17, 2.1)}</span>
        </button>`
      }).join('')}
    </div>
  </div>`
}

function adminSettings() {
  return `<div class="pad stagger">
    ${profileCard(state.user.name, 'Administrator · Rosebank College')}
    <div class="sect">Programme configuration</div>
    <div class="card">
      <button class="row" data-a="editRate">
        <span class="rmain"><span class="rname">Rate per session</span><span class="rmeta">Paid on each confirmed session</span></span>
        <span class="rside" style="color:var(--goldD);font-weight:700;font-size:14px">R${state.settings.ratePerSession}${ic('chev', 17, 2.1)}</span>
      </button>
      <div class="row">
        <span class="rmain"><span class="rname">Minimum mark</span><span class="rmeta">Required in every module applied for</span></span>
        <span class="rside" style="font-weight:700;font-size:14px">${state.settings.minMark}%</span>
      </div>
      <div class="row">
        <span class="rmain"><span class="rname">Messages sent</span><span class="rmeta">Across all tutors</span></span>
        <span class="rside" style="font-weight:700;font-size:14px">${state.messages.length}</span>
      </div>
    </div>

    <div class="sect">Response templates</div>
    <div class="card">
      ${state.settings.predefinedResponses.map(r => `<div class="row">
        <span class="rmain"><span class="rname">${esc(r.label)}</span><span class="rmeta">${esc(r.text.slice(0, 54))}…</span></span>
      </div>`).join('')}
    </div>

    <button class="btn btn--outline" style="margin-top:18px" data-a="signout">Sign out</button>
  </div>`
}

/* ---------- view: thread ---------------------------------- */

function vThread(tid) {
  const t = tutorById(tid)
  if (!t) return ''
  const list = thread(tid)
  const canSend = role() !== 'tutor'
  return `
  ${navBar(t.name, backBtn)}
  <div class="body"><div class="pad${canSend ? ' pad--fab' : ''}">
    <div class="chips" style="margin-bottom:16px">
      ${t.modules.map(c => `<span class="chip chip--static chip--sm"><span class="code">${c}</span>${esc(mName(c))}</span>`).join('')}
    </div>
    ${list.length ? `<div class="timeline">${list.map(tlItem).join('')}</div>`
      : empty('Nothing sent yet', 'Send the first notice to ' + t.name.split(' ')[0] + '.')}
  </div></div>
  ${canSend ? `<button class="fab fab--low" data-a="compose" data-id="${tid}">${ic('plus', 18, 2.3)} New message</button>` : ''}`
}

/* ---------- view: application detail ---------------------- */

function vAppDetail(id) {
  const a = appById(id)
  if (!a) return ''
  const flag = autoFlag(a)
  const decided = a.status === 'approved' || a.status === 'rejected'
  const D = state.decision
  const msg = D.type === 'predefined'
    ? ((state.settings.predefinedResponses.find(r => String(r.id) === String(D.tplId)) || {}).text || '')
    : D.custom
  const ready = !!String(msg).trim()

  return `
  ${navBar('Application', backBtn)}
  <div class="body"><div class="pad stagger">
    <div class="card card--pad">
      <div style="display:flex;align-items:flex-start;gap:12px">
        <span class="avatar avatar--lg">${initials(a.name)}</span>
        <span style="flex:1;min-width:0">
          <span class="rname" style="font-size:16px">${esc(a.name)}</span>
          <span class="rmeta">${esc(a.studentNumber)}</span>
        </span>
      </div>
      <div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:14px">
        ${flagBadge(flag)}${badge(statusLabel(a.status), statusClass(a.status))}
        ${a.backgroundChecked ? badge('Checked', 'badge--green') : badge('No check', 'badge--plain')}
      </div>
      <div style="margin-top:14px;border-top:1px solid var(--lineS);padding-top:10px">
        <div class="payrow"><span class="muted">Submitted</span><span>${fDate(a.submittedAt)}</span></div>
        <div class="payrow"><span class="muted">Programme</span><span style="text-align:right;max-width:60%;font-size:12px">${esc(a.programme)}</span></div>
      </div>
    </div>

    <div class="sect">Applied for</div>
    ${moduleChips(a.appliedModules)}

    <div class="sect">Academic record · ${state.settings.minMark}% required</div>
    <div class="card card--pad">
      ${a.reportModules.map(m => {
        const applied = a.appliedModules.indexOf(m.code) > -1
        const col = markColor(m.mark)
        return `<div class="mark">
          <span class="mark__name">
            <span class="mark__code" style="${applied ? 'font-weight:700' : 'color:var(--muted)'}">${m.code}</span>
            ${applied ? '<span class="applied">APPLIED</span>' : ''}
            <span class="mark__sub">${esc(mName(m.code))}</span>
          </span>
          <span class="mark__bar"><span style="width:${m.mark}%;background:${col}"></span></span>
          <span class="mark__pct" style="color:${col}">${m.mark}%</span>
          <span style="width:16px;color:${col}">${applied ? (m.mark >= state.settings.minMark ? ic('check', 15, 2.2) : ic('x', 15, 2.2)) : ''}</span>
        </div>`
      }).join('')}
    </div>

    <div class="sect">Background check</div>
    <div class="card">
      <div class="row">
        <span class="rmain"><span class="rname">Verification</span><span class="rmeta">Mark complete once the record is verified</span></span>
        <span class="rside">${a.backgroundChecked ? badge('Done', 'badge--green')
          : `<button class="btn btn--sm" data-a="bgCheck" data-id="${a.id}">Mark done</button>`}</span>
      </div>
    </div>

    ${decided ? `
      <div class="sect">Decision</div>
      <div class="card card--pad">
        ${badge(statusLabel(a.status), statusClass(a.status))}
        <p class="small muted" style="margin-top:10px">Processed ${fDate(a.processedAt)}</p>
        ${a.responseMessage ? `<p class="small" style="margin-top:10px;line-height:1.7">${esc(a.responseMessage)}</p>` : ''}
      </div>`
    : `
      <div class="sect">Response to the applicant</div>
      <div class="seg">
        ${['predefined', 'custom'].map(t => `<button class="${D.type === t ? 'on' : ''}" data-a="respType" data-t="${t}">${t === 'predefined' ? 'Template' : 'Custom'}</button>`).join('')}
      </div>
      ${D.type === 'predefined'
        ? state.settings.predefinedResponses.map(r => `<button class="tpl${String(D.tplId) === String(r.id) ? ' on' : ''}" data-a="pickTpl" data-id="${r.id}">
            <b>${esc(r.label)}</b><span>${esc(r.text.slice(0, 96))}…</span></button>`).join('')
        : `<div class="field" style="margin-top:10px"><textarea id="f-custom" placeholder="Write a personal response…">${esc(D.custom)}</textarea></div>`}
      <div class="btnrow" style="margin-top:16px">
        <button class="btn" data-a="approve" data-id="${a.id}"${ready ? '' : ' disabled'}>${ic('check', 15, 2.2)} Approve</button>
        <button class="btn btn--danger" data-a="reject" data-id="${a.id}"${ready ? '' : ' disabled'}>${ic('x', 15, 2.1)} Decline</button>
      </div>
      <p class="small muted" style="margin-top:10px;text-align:center">Approving creates the tutor account and sends them a welcome message.</p>`}
  </div></div>`
}

/* ---------- view: tutor detail (admin) -------------------- */

function vTutorDetail(id) {
  const t = tutorById(id)
  if (!t) return ''
  const rate = state.settings.ratePerSession
  const confirmed = t.sessions.filter(s => s.confirmed && !s.paid)
  const pending = t.sessions.filter(s => !s.confirmed)
  const total = confirmed.length * rate

  return `
  ${navBar(t.name, backBtn, `<button class="iconbtn" data-a="thread" data-id="${t.id}" aria-label="Messages">${ic('mail', 21)}</button>`)}
  <div class="body"><div class="pad pad--fab stagger">
    <div class="card card--pad">
      <div style="display:flex;align-items:center;gap:12px">
        <span class="avatar avatar--lg">${initials(t.name)}</span>
        <span style="flex:1;min-width:0">
          <span class="rname" style="font-size:16px">${esc(t.name)}</span>
          <span class="rmeta">${esc(t.studentNumber)} · since ${fDate(t.approvedAt)}</span>
        </span>
        ${t.paid ? badge('Paid', 'badge--green') : badge('Active', 'badge--gold')}
      </div>
      <div style="margin-top:14px">${moduleChips(t.modules)}</div>
    </div>

    <div class="metrics" style="margin-top:14px">
      ${metric(t.sessions.length, 'Sessions', 'metric--navy')}
      ${metric(pending.length, 'To confirm', 'metric--amber')}
      ${metric('R' + total.toLocaleString(), 'Owed', 'metric--gold', true)}
    </div>

    <div class="sect">Sessions</div>
    <div class="card">
      ${t.sessions.length ? t.sessions.slice().reverse().map(s => `<div class="row">
        <span class="avatar avatar--code">${s.module.slice(0, 4)}</span>
        <span class="rmain">
          <span class="rname">${fDate(s.date)}</span>
          <span class="rmeta">${esc(mName(s.module))} · ${s.students} students · by ${s.loggedBy}</span>
        </span>
        <span class="rside">${s.confirmed ? badge(s.paid ? 'Paid' : 'Confirmed', 'badge--green')
          : `<button class="btn btn--sm" data-a="confirmSession" data-tid="${t.id}" data-id="${s.id}">Confirm</button>`}</span>
      </div>`).join('') : '<div class="row"><span class="rmain"><span class="rmeta">No sessions logged yet.</span></span></div>'}
    </div>

    <div class="sect">Attendance registers</div>
    <div class="card">
      ${t.attendanceDocs.length ? t.attendanceDocs.map(d => `<div class="row">
        <span class="avatar avatar--code">${ic('doc', 18)}</span>
        <span class="rmain"><span class="rname">${esc(d.name)}</span><span class="rmeta">${esc(d.module)} · ${fDate(d.uploadedAt)}</span></span>
      </div>`).join('') : '<div class="row"><span class="rmain"><span class="rmeta">Nothing uploaded yet.</span></span></div>'}
    </div>

    <div class="sect">Payment</div>
    <div class="card card--pad card--gold">
      <div class="money">R${total.toLocaleString()}</div>
      <p class="small muted" style="margin-top:6px">${confirmed.length} confirmed unpaid session${confirmed.length === 1 ? '' : 's'} at R${rate}</p>
      ${t.paid ? `<div class="note note--green" style="margin-top:14px">${ic('check', 15, 2.2)}<span>All confirmed sessions marked paid.</span></div>`
        : `<button class="btn" style="margin-top:14px" data-a="markPaid" data-id="${t.id}"${confirmed.length ? '' : ' disabled'}>Mark as paid</button>`}
    </div>
  </div></div>
  <button class="fab fab--low" data-a="addSession" data-id="${t.id}">${ic('plus', 18, 2.3)} Add session</button>`
}

/* ---------- sheets ---------------------------------------- */

function composeSheet(tid) {
  const t = tutorById(tid)
  openSheet(`
    <p class="sheet-sub">New message</p>
    <h3 class="sheet-title">To ${esc(t.name)}</h3>
    <p class="sheet-lead">Short notices work best — a venue change, what to focus on, a document that is missing.</p>
    <div class="sheet-form">
      <div class="field"><label>Topic</label><input id="c-topic" type="text" placeholder="Week 9 session focus" /></div>
      <div class="field"><label>Message</label><textarea id="c-body" placeholder="Write it here"></textarea></div>
      <button class="btn" data-a="send" data-id="${tid}">Send message</button>
    </div>`)
  setTimeout(() => { const i = $('#c-topic'); if (i) i.focus() }, 400)
}

function pickTutorSheet() {
  openSheet(`
    <p class="sheet-sub">Message</p>
    <h3 class="sheet-title">Choose a tutor</h3>
    <div class="card" style="margin-top:16px">
      ${myTutors().map(t => `<button class="row" data-a="composeFor" data-id="${t.id}">
        <span class="avatar">${initials(t.name)}</span>
        <span class="rmain"><span class="rname">${esc(t.name)}</span><span class="rmeta">${t.modules.join(' · ')}</span></span>
        <span class="rside">${ic('chev', 17, 2.1)}</span>
      </button>`).join('')}
    </div>`)
}

function sessionSheet(mode, tid) {
  const t = tutorById(tid)
  openSheet(`
    <p class="sheet-sub">${mode === 'log' ? 'Tutor' : 'Admin'}</p>
    <h3 class="sheet-title">${mode === 'log' ? 'Log a session' : 'Add a session'}</h3>
    <p class="sheet-lead">${mode === 'log'
      ? 'It stays pending until admin checks it against your signed register.'
      : 'Sessions added here are confirmed straight away.'}</p>
    <div class="sheet-form">
      <div class="field"><label>Date</label><input id="s-date" type="date" value="${today()}" /></div>
      <div class="field"><label>Module</label><select id="s-mod">
        ${t.modules.map(c => `<option value="${c}">${esc(mName(c))} — ${c}</option>`).join('')}
      </select></div>
      <div class="field"><label>Students attending</label><input id="s-num" type="number" inputmode="numeric" min="1" placeholder="e.g. 8" /></div>
      <button class="btn" data-a="saveSession" data-mode="${mode}" data-id="${tid}">${mode === 'log' ? 'Log session' : 'Add session'}</button>
    </div>`)
}

function uploadSheetHTML(t) {
  const u = state.upload
  const zone = u.status === 'done'
    ? `<div class="drop" style="border-style:solid;border-color:var(--greenBd);background:var(--greenBg)">
        <span style="color:${C.green}">${ic('check', 30, 2)}</span>
        <div class="drop__t">Ready to upload</div>
        <div class="drop__h">${esc(u.name)}</div>
       </div>`
    : u.status === 'uploading'
    ? `<div class="drop"><span class="muted">${ic('clock', 30)}</span><div class="drop__t">Reading document…</div></div>`
    : `<div class="drop">
        <span class="muted">${ic('upload', 30)}</span>
        <div class="drop__t">Choose the signed register</div>
        <div class="drop__h">PDF or a photo of the sheet</div>
        <label class="btn btn--outline btn--sm drop__pick">Browse<input type="file" accept="application/pdf,image/*" data-upload="1" /></label>
       </div>`
  return `
    <p class="sheet-sub">Attendance</p>
    <h3 class="sheet-title">Upload register</h3>
    <p class="sheet-lead">Admin confirms your sessions against this document.</p>
    <div class="sheet-form">
      <div class="field"><label>Module</label><select id="u-mod">
        ${t.modules.map(c => `<option value="${c}">${esc(mName(c))} — ${c}</option>`).join('')}
      </select></div>
      <div style="margin-top:14px">${zone}</div>
      <button class="btn" data-a="saveDoc"${state.upload.status === 'done' ? '' : ' disabled'}>Upload register</button>
    </div>`
}

function rateSheet() {
  openSheet(`
    <p class="sheet-sub">Configuration</p>
    <h3 class="sheet-title">Rate per session</h3>
    <p class="sheet-lead">Applies to every confirmed session across the programme.</p>
    <div class="sheet-form">
      <div class="field"><label>Rate (ZAR)</label><input id="r-rate" type="number" inputmode="numeric" min="1" value="${state.settings.ratePerSession}" /></div>
      <button class="btn" data-a="saveRate">Save rate</button>
    </div>`)
}

function demoSheet() {
  const jumps = [
    { id: 'tutor',    label: 'Tutor' },
    { id: 'lecturer', label: 'Lecturer' },
    { id: 'admin',    label: 'Admin' },
  ]
  openSheet(`
    <p class="sheet-sub">Demo controls</p>
    <h3 class="sheet-title">Jump straight in</h3>
    <p class="sheet-lead">Signs you in with the demo account for that role.</p>
    <div class="sheet-form">
      <div class="chips">
        ${jumps.map(j => `<button class="chip${role() === j.id ? ' on' : ''}" data-a="jump" data-id="${j.id}">${j.label}</button>`).join('')}
      </div>
      <button class="btn btn--outline" style="margin-top:18px" data-a="resetDemo">Reset demo data</button>
      <button class="btn btn--ghost" data-a="toRoles">Back to role select</button>
    </div>`)
}

/* Patch the unread badges without re-rendering — a full refresh
   would collapse the message the tutor just opened. */
function syncCounts() {
  const me = meTutor()
  if (!me) return
  const n = unreadForTutor(me.id)
  const top = stack[stack.length - 1]
  $$('.count', top.el).forEach(el => { if (n) el.textContent = n; else el.remove() })
}

/* ---------- actions --------------------------------------- */

const A = {
  back() { goBack() },
  demo() { haptic(8); demoSheet() },

  role(t) { haptic(9); push('auth', { role: t.dataset.id, mode: 'signin' }) },
  authMode(t) {
    haptic(6)
    const entry = stack[stack.length - 1]
    entry.params = { role: t.dataset.role, mode: t.dataset.mode }
    refresh()
  },
  auth(t) {
    haptic(12)
    const r = t.dataset.role
    if (t.dataset.mode === 'register') {
      const name  = String((($('#f-name')  || {}).value) || '').trim()
      const email = String((($('#f-mail')  || {}).value) || '').trim()
      const pass  = String((($('#f-pass')  || {}).value) || '')
      const pass2 = String((($('#f-pass2') || {}).value) || '')
      const err = registerError(name, email, pass, pass2)
      if (err) { haptic(24); toast(err); return }
      /* Held aside, not signed in — the account only exists once
         they have chosen the modules that drive the whole dashboard. */
      state.pendingLecturer = {
        id: 'lect_' + Date.now(), role: 'lecturer', name: name,
        email: email.toLowerCase(), password: pass,
        modules: [], joinedAt: today(), isNew: true,
      }
      state.picking = []
      push('pickMods')
      return
    }
    try {
      const user = signIn(($('#f-mail') || {}).value, ($('#f-pass') || {}).value, r)
      enterApp(user)
    } catch (e) { haptic(24); toast(e.message) }
  },

  pick(t) {
    haptic(7)
    const c = t.dataset.code
    const i = state.picking.indexOf(c)
    if (i > -1) state.picking.splice(i, 1); else state.picking.push(c)
    refresh()
  },
  picked() {
    haptic(12)
    const mods = state.picking.slice()
    state.lecturerModules = mods

    if (state.pendingLecturer) {                   // finishing sign-up
      const acc = state.pendingLecturer
      acc.modules = mods
      state.lecturers.push(acc)
      state.pendingLecturer = null
      enterApp(Object.assign({}, acc))
      setTimeout(() => toast('Account created — welcome to TutorLink'), 420)
      return
    }

    const acc = lecturerByEmail((state.user || {}).email)   // editing an existing load
    if (acc) acc.modules = mods
    if (state.user) state.user.modules = mods
    enterApp(state.user)
  },
  editMods() {
    haptic(8)
    state.picking = state.lecturerModules.slice()
    push('pickMods')
  },

  tab(t) {
    const id = t.dataset.tab
    if (state.tab === id) return
    haptic(6)
    state.tab = id
    refresh()
  },

  thread(t) {
    haptic(8)
    push('thread', { tid: t.dataset.id })
  },
  msg(t) {
    haptic(5)
    const open = t.classList.contains('open')
    const screen = t.closest('.screen')
    $$('.tl.open', screen).forEach(o => {
      o.classList.remove('open')
      o.querySelector('.tl-body').style.maxHeight = '0px'
    })
    if (!open) {
      t.classList.add('open')
      const b = t.querySelector('.tl-body')
      b.style.maxHeight = (b.scrollHeight + 20) + 'px'
      t.classList.remove('unread')
    }
    /* reading it here is what clears the gold dot and the badge */
    const m = state.messages.find(x => x.id === t.dataset.id)
    if (m && role() === 'tutor' && !m.readByTutor) { m.readByTutor = true; syncCounts() }
  },

  compose(t) { haptic(9); composeSheet(t.dataset.id) },
  pickTutor() { haptic(9); pickTutorSheet() },
  composeFor(t) { haptic(8); composeSheet(t.dataset.id) },
  send(t) {
    const topic = String((($('#c-topic') || {}).value) || '').trim()
    const body  = String((($('#c-body')  || {}).value) || '').trim()
    if (!topic || !body) { haptic(24); toast('Add a topic and a message'); return }
    haptic(14)
    const tid = t.dataset.id
    state.messages.unshift({
      id: 'm_' + Date.now(), tutorId: tid,
      senderId: state.user.id, senderRole: state.user.role, senderName: state.user.name,
      topic: topic, body: body, ts: Date.now(), readByTutor: false,
    })
    closeSheet()
    setTimeout(() => {
      const top = stack[stack.length - 1]
      if (top.name !== 'thread' || top.params.tid !== tid) push('thread', { tid: tid })
      else refresh()
      toast('Message sent')
    }, 260)
  },

  /* tutor */
  markAtt(t) {
    haptic(14)
    const s = state.schedule.find(x => x.id === t.dataset.id)
    if (!s) return
    s.marked = true
    const me = meTutor()
    me.sessions.push({
      id: 's_' + Date.now(), date: today(), module: s.module,
      students: s.students, confirmed: false, paid: false, loggedBy: 'tutor',
    })
    refresh()
    toast('Attendance logged — pending confirmation')
  },
  logSession() { haptic(9); sessionSheet('log', meTutor().id) },
  addSession(t) { haptic(9); sessionSheet('add', t.dataset.id) },
  saveSession(t) {
    const date = (($('#s-date') || {}).value) || ''
    const mod  = (($('#s-mod')  || {}).value) || ''
    const num  = parseInt((($('#s-num') || {}).value) || '', 10)
    if (!date || !mod || !num || num < 1) { haptic(24); toast('Fill in the date, module and student count'); return }
    haptic(14)
    const tut = tutorById(t.dataset.id)
    const admin = t.dataset.mode === 'add'
    tut.sessions.push({
      id: 's_' + Date.now(), date: date, module: mod, students: num,
      confirmed: admin, paid: false, loggedBy: admin ? 'admin' : 'tutor',
    })
    closeSheet()
    setTimeout(() => { refresh(); toast(admin ? 'Session added' : 'Session logged') }, 240)
  },
  uploadReg() { haptic(9); state.upload = { status: 'idle', name: '' }; openSheet(uploadSheetHTML(meTutor())) },
  saveDoc() {
    if (state.upload.status !== 'done') return
    haptic(14)
    const me = meTutor()
    const mod = (($('#u-mod') || {}).value) || me.modules[0]
    me.attendanceDocs.push({
      id: 'd_' + Date.now(), module: mod, uploadedAt: today(),
      name: state.upload.name || `Attendance_${mod}_${today()}.pdf`,
    })
    state.upload = { status: 'idle', name: '' }
    closeSheet()
    setTimeout(() => { refresh(); toast('Register uploaded') }, 240)
  },
  csv() {
    const t = meTutor()
    const rate = state.settings.ratePerSession
    const rows = t.sessions.filter(s => s.confirmed).map(s => ({
      Date: s.date, Module: mName(s.module), Students: s.students, Rate: rate, Amount: rate, Status: 'Confirmed',
    }))
    if (!rows.length) return
    haptic(10)
    downloadCSV(rows, t.name.replace(/\s+/g, '_') + '_earnings.csv')
    toast('Statement exported')
  },

  /* admin */
  filter(t) { haptic(6); state.filter = t.dataset.f; refresh() },
  openApp(t) {
    haptic(8)
    state.decision = { type: 'predefined', tplId: '', custom: '' }
    push('appDetail', { id: t.dataset.id })
  },
  bgCheck(t) {
    haptic(12)
    const a = appById(t.dataset.id)
    if (a) { a.backgroundChecked = true; if (a.status === 'pending') a.status = 'under_review' }
    refresh()
    toast('Background check recorded')
  },
  respType(t) {
    haptic(6)
    if (state.decision.type === 'custom') state.decision.custom = (($('#f-custom') || {}).value) || state.decision.custom
    state.decision.type = t.dataset.t
    refresh()
  },
  pickTpl(t) { haptic(7); state.decision.tplId = t.dataset.id; refresh() },
  approve(t) { decide(t.dataset.id, 'approved') },
  reject(t)  { decide(t.dataset.id, 'rejected') },

  openTutor(t) { haptic(8); push('tutorDetail', { id: t.dataset.id }) },
  confirmSession(t) {
    haptic(14)
    const tut = tutorById(t.dataset.tid)
    const s = tut && tut.sessions.find(s => s.id === t.dataset.id)
    if (s) s.confirmed = true
    refresh()
    toast('Session confirmed')
  },
  markPaid(t) {
    haptic(16)
    const tut = tutorById(t.dataset.id)
    if (!tut) return
    tut.paid = true
    tut.sessions.forEach(s => { if (s.confirmed) s.paid = true })
    refresh()
    toast(tut.name.split(' ')[0] + ' marked as paid')
  },
  editRate() { haptic(8); rateSheet() },
  saveRate() {
    const v = parseFloat((($('#r-rate') || {}).value) || '')
    if (isNaN(v) || v <= 0) { haptic(24); toast('Enter a valid rate'); return }
    haptic(14)
    state.settings.ratePerSession = v
    closeSheet()
    setTimeout(() => { refresh(); toast('Rate saved') }, 240)
  },

  /* session */
  signout() {
    haptic(10)
    /* lecturers carries over too, so an account created in this session
       can sign back in — only Reset demo data clears it */
    const keep = { applications: state.applications, tutors: state.tutors, messages: state.messages,
                   schedule: state.schedule, settings: state.settings, lecturers: state.lecturers }
    state = Object.assign(initialState(), keep)
    root('roles')
  },
  toRoles() { closeSheet(); setTimeout(() => A.signout(), 200) },
  jump(t) {
    haptic(10)
    const id = t.dataset.id
    const creds = DEMO_LOGINS[id]
    closeSheet()
    setTimeout(() => {
      try {
        state.lecturerModules = []
        enterApp(signIn(creds.email, creds.password, id))
      } catch (e) { toast(e.message) }
    }, 220)
  },
  resetDemo() {
    haptic(16)
    state = initialState()
    closeSheet()
    setTimeout(() => { root('roles'); toast('Demo data reset') }, 220)
  },
}

function decide(id, status) {
  const a = appById(id)
  if (!a) return
  const D = state.decision
  const message = D.type === 'predefined'
    ? ((state.settings.predefinedResponses.find(r => String(r.id) === String(D.tplId)) || {}).text || '')
    : (($('#f-custom') || {}).value || D.custom)
  if (!String(message).trim()) { haptic(24); toast('Pick or write a response first'); return }
  haptic(16)
  a.status = status
  a.responseMessage = message
  a.processedAt = today()

  if (status === 'approved') {
    const email = a.email.indexOf('@student.') > -1 ? a.email.replace('@student.', '@tutor.') : a.email
    const tutor = {
      id: 'tutor_' + Date.now(), name: a.name, studentNumber: a.studentNumber,
      email: email, password: 'tutor123', modules: a.appliedModules.slice(),
      approvedAt: today(), paid: false, sessions: [], attendanceDocs: [],
    }
    state.tutors.push(tutor)
    /* the welcome notice lands in their inbox the moment the account exists */
    state.messages.unshift({
      id: 'm_' + Date.now(), tutorId: tutor.id,
      senderId: state.user.id, senderRole: 'admin', senderName: state.user.name,
      topic: 'Welcome to the tutoring programme', body: message,
      ts: Date.now(), readByTutor: false,
    })
  }
  goBack()
  setTimeout(() => { refresh(); toast(status === 'approved' ? a.name.split(' ')[0] + ' approved' : 'Application declined') }, 320)
}

/* ---------- events ---------------------------------------- */

document.addEventListener('click', e => {
  const t = e.target.closest('[data-a]')
  if (!t || t.disabled) return
  const fn = A[t.dataset.a]
  if (fn) fn(t, e)
})

document.addEventListener('change', e => {
  const up = e.target.closest('[data-upload]')
  if (!up) return
  const file = up.files && up.files[0]
  if (!file) return
  state.upload = { status: 'uploading', name: '' }
  setSheet(uploadSheetHTML(meTutor()))
  setTimeout(() => {
    state.upload = { status: 'done', name: file.name }
    setSheet(uploadSheetHTML(meTutor()))
    haptic(8)
  }, 900)
})

document.addEventListener('input', e => {
  if (e.target.id === 'f-custom') {
    state.decision.custom = e.target.value
    const on = !!e.target.value.trim()
    $$('[data-a="approve"],[data-a="reject"]').forEach(b => { b.disabled = !on })
  }
})

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && sheetOpen()) closeSheet()
})

/* edge swipe to go back */
;(function () {
  let x0 = null, y0 = null, active = false
  stage.addEventListener('touchstart', e => {
    const t = e.touches[0]
    if (t.clientX < 26 && stack.length > 1) { x0 = t.clientX; y0 = t.clientY; active = true }
  }, { passive: true })
  stage.addEventListener('touchmove', e => {
    if (!active) return
    const t = e.touches[0]
    if (Math.abs(t.clientY - y0) > 60) { active = false; return }
    if (t.clientX - x0 > 70) { active = false; goBack() }
  }, { passive: true })
  stage.addEventListener('touchend', () => { active = false }, { passive: true })
})()

/* ---------- go -------------------------------------------- */

history.replaceState({ d: 0 }, '')
push('roles', {}, 'root')
