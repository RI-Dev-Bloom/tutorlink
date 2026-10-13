# Continue here

*Last updated: 14 Oct 2026*

## Where we are
We're in **Phase 1**, building the real app in 8 small slices. **Slices 1–7 are done and live.** Next up is **slice 8**: testing on real phones, then the handover.

App: https://ri-dev-bloom.github.io/tutorlink/

## What we've done lately
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
- [x] Lecturer accounts made by admin (password to share, forced change on first sign-in)
- [x] Settings: pay rate, minimum mark, semesters and session limit
- [x] Modules: add, rename, hide, merge
- [x] Students: pick modules, add a missing one
- [x] Apply to tutor: upload results, enter marks, track the status
- [x] Admin: applications queue, background check, approve or decline with templates
- [x] Approved students get a **Tutor** button to switch views
- [x] Admin Overview: what needs doing at a glance
- [x] Admin tutor pages: session limit, weekly slots, cancel a week, confirm, pay
- [x] Tutors: schedule, mark sessions, log extra ones, upload registers, pay with a CSV statement
- [x] Live messages between tutors, lecturers and admin, with unread counts and "seen"
- [x] Lecturer home: tutors on their modules, their next session, latest message
- [x] Push notifications: messages, applications, decisions, confirmed and paid sessions, 7am session reminders
- [x] "Get set up" card: add to home screen, then turn on notifications
- [x] Daily keep-alive runs by itself

## What's left
- [ ] **Slice 8:** final test on real phones, then handover
- [ ] Turn on weekly backups (they still need their two secrets, about 5 minutes)
- [ ] Check the "Semester 2, 2026" dates (13 Jul–27 Nov) and the R260 rate
- [ ] Before handover: delete the QA test accounts and data, and suggest a stronger database password

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
