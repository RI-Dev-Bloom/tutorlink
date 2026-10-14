# Continue here

*Last updated: 14 Oct 2026 (evening)*

## Where we are
We're in **Phase 1**, building the real app in 8 small slices. **Slices 1–7 are done and live.** Next up is **slice 8**: testing on real phones, then the handover.

App: https://ri-dev-bloom.github.io/tutorlink/

## What we've done lately
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
- [x] Tutors: schedule, mark sessions, log extra ones, upload registers, semester pay with a CSV statement
- [x] Semester pay sheet for finance (CSV), paid out once after each semester
- [x] Live messages between tutors, lecturers and admin, with unread counts, "seen", and files that expire
- [x] Lecturer home: tutors on their modules, their next session, latest message
- [x] Push notifications: messages, applications, decisions, confirmed and paid sessions, 7am session reminders
- [x] "Get set up" card: add to home screen, then turn on notifications
- [x] Daily keep-alive runs by itself

## What's left
- [ ] **You:** mark which modules are high-risk (Settings → High-risk modules). None are yet, so students can't apply until you do
- [ ] **Slice 8:** final test on real phones, then handover
- [ ] Turn on weekly backups (they still need their two secrets, about 5 minutes)
- [ ] Check the "Semester 2, 2026" dates (13 Jul–27 Nov) and the R260 rate
- [ ] Before handover: delete the QA test accounts and data (including the three team test accounts admin@gmail.com, tutor@gmail.com and student@gmail.com), and suggest a stronger database password

## Later phases
- [ ] Student module dashboard and announcements
- [ ] Quizzes (live or self-paced)
- [ ] Attendance system

## How far along (14 Oct)
Phase 1 is about 90% done. All phases together are about 55–60%, roughly 3–4 more sessions.

## To pick up again
You want to **add more features first**, before we clear the test data. So start by telling Claude what you want to add, and we'll fit it into the plan. The test data stays until handover.

After that: "let's start slice 8". Each slice goes live, you test it on your phone, then we move on.

Related: [[TutorLink]], [[Build plan]], [[Handover]]
