# Continue here

*Last updated: 15 Oct 2026*

## Where we are
We're in **Phase 1**, building the real app in 8 small slices. **Slices 1–7 are done and live.** Next up is **slice 8**: testing on real phones, then the handover.

App: https://ri-dev-bloom.github.io/tutorlink/

## What we've done lately
- [x] **Slice 9, attendance (15 Oct):** check-in with a changing QR (in class) or 4-digit code (Teams), laptop screen link, manual adds, pay per hour, minimum attendance to confirm, qualifications, student progress line. Paper registers are out
- [x] **Overview and pay (14 Oct):** new admin Overview (semester band, to do, payout, week-by-week chart, high-risk coverage). Pay is now per semester: no "mark as paid", a pay sheet for finance at the end
- [x] **Tweaks (14 Oct):** lecturers get in by email with Google (no password), settings look like a phone's Settings, "Device" instead of "This phone", files on messages (removed after 3–5 days), high-risk modules only for applications, auto-decline below the minimum
- [x] **Slice 7:** push notifications and the install guide (13 Oct)
- [x] **Slice 6:** messages and the lecturer's "My tutors" screen (13 Oct)
- [x] **Slice 5:** the tutor's own screens (13 Oct)
- [x] **Slice 4:** admin tutor management (13 Oct)
- [x] Lecturers can sign in with Google. The password is only a backup for emails that aren't Google ones.
- [x] Admin can search lecturers and remove one who leaves
- [x] **Slice 2:** students pick their modules and apply to tutor
- [x] **Slice 3:** admin reviews applications, then approves or declines them

## What's working now
- [x] Google sign-in for students, plus a student number on first sign-in
- [x] Lecturers: admin lets their email in, they sign in with Google (a password only for non-Google emails)
- [x] Settings: pay rate, minimum mark, semesters and session limit
- [x] Modules: add, rename, hide, merge
- [x] Students: pick modules, add a missing one
- [x] Apply to tutor: only high-risk modules, type your % for each, upload results, track the status
- [x] Admin: applications queue, results check, approve or decline with templates, optional auto-decline
- [x] Approved students get a **Tutor** button to switch views
- [x] Admin Overview: semester progress, reach, to do, payout, weekly chart, module coverage
- [x] Admin tutor pages: session limit, weekly slots, cancel a week, confirm, earnings this semester
- [x] Tutors: schedule, check-in (QR / online code), attendance lists, semester pay per hour with a CSV statement
- [x] Semester pay sheet for finance (CSV), paid out once after each semester
- [x] Live messages between tutors, lecturers and admin, with unread counts, "seen", and files that expire
- [x] Lecturer home: tutors on their modules, their next session, latest message
- [x] Push notifications: messages, applications, decisions, confirmed and paid sessions, 7am session reminders
- [x] "Get set up" card: add to home screen, then turn on notifications
- [x] Daily keep-alive runs by itself

## What's left
- [x] High-risk modules marked (HCIN6222, MATH1111, PROG1111)
- [ ] **You:** check the R260 rate. It's now **per hour**, so a 1½-hour session pays R390
- [ ] **You:** check the "Semester 2, 2026" dates (13 Jul–27 Nov)
- [x] **Slice 10:** attendance views for lecturers, admin and tutors, CSV downloads, real "students reached"
- [x] Weekly backups: working since 10 Oct (fresh one taken 14 Oct)
- [x] Slice 8 so far: every tab checked on the live site for every role, Supabase security/speed review done, [[Phone test]] script and [[Handover]] runbook written
- [ ] **You and the team:** run the [[Phone test]] on a real iPhone and Android
- [ ] Remove test data and accounts (when the team has finished testing)
- [ ] Handover: change the database password and the tutorlink.ri@gmail.com password

## Later phases
- [ ] Phase 2: student module page and announcements from tutors
- [ ] Phase 3: quizzes (self-paced and live)
- [x] Phase 4: attendance (brought forward and done: slices 9 and 10)

## How far along (15 Oct)
Phase 1 plus attendance is about 95% done: only the final test pass and handover (slice 8) are left. All phases together are about 70%.

## To pick up again
Say "start slice 8" for the final test pass and handover, or name a feature to add first. Each slice goes live, you test it on your phone, then we move on.

Related: [[TutorLink]], [[Build plan]], [[Handover]]
