# Continue here

*Last updated: 15 Oct 2026*

## Where we are
We're in **Phase 1**, building the real app in 8 small slices. **Slices 1–7 are done and live.** Next up is **slice 8**: testing on real phones, then the handover.

App: https://ri-dev-bloom.github.io/tutorlink/

## Emails are paused (19 Oct)
For testing, the app sends **no emails**. Students make an account (Rosebank email + password) and go straight in: a small server function (student-signup) makes the account already confirmed. **Forgot password?** tells people to ask admin, who uses Settings → Reset a password.
- [ ] Later, to turn Outlook emails back on: set up the Gmail sender (SMTP) in Supabase, switch sign-up back to email confirmation, and use a **6-digit code** instead of a link. Rosebank's Outlook scans links before people open them, which uses up one-time links ("link expired").

## Done: Rosebank sign-in (18 Oct)
Sign-in now matches Rosebank: everyone uses their Rosebank email and a password (no Microsoft check, no Google).
- **Staff** (lecturers and admin): `name@rbi.ac.za`, e.g. katshabalala@rbi.ac.za
- **Students** (and tutors, who are students): `st########@rcconnect.edu.za`, e.g. st10398445@rcconnect.edu.za. The student number comes from the email, so they no longer type it.
- **Google sign-in is gone.** No other emails are accepted; the database refuses them.
- **Passwords:** students choose their own when they make their account. Staff get a temporary word password from admin (e.g. BraveMango47) and choose their own on first sign-in. **Forgot password?** emails a reset link; admin can also make a new temporary one (Settings → Reset a password).
- **The first screen** has four buttons: **Student**, **Tutor**, **Lecturer**, **Admin**.
- **Lecturers (and admin) can't sign up themselves.** Admin lets their email in first, as now; anyone else gets a polite "ask the programme office".
- **Demo accounts** moved to Rosebank-style emails (see [[Demo script]]), same password, all data kept.
- [ ] **You:** in Supabase, check the Gmail sender (SMTP) is set up so confirm and reset emails arrive, then switch off the Google provider. See the steps in the chat of 18 Oct.
- [x] Real accounts: Dylan and Chuma moved to their Rosebank student emails (all data kept); the two test accounts (Refiloe, Mosa) removed. Dr Gorrah's lecturer account still uses Gmail until we have his @rbi.ac.za email.

## What we've done lately
- [x] **Rosebank's official list (15 Oct):** 32 qualifications and about 600 modules, by faculty. Students pick their qualification and year and that year's modules are added. Only admin adds modules. Lecturers see who never checked in, admin sees demand on high-risk modules and reach by faculty, and module lists have search and faculty filters
- [x] **Lecture check-ins (15 Oct):** lecturers run their own, and every check-in has a title and topic
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
- [x] Students: pick qualification and year (modules added for them), tick electives
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
- [x] High-risk modules marked (PROG5121, IQTT5111, HCIN6222)
- [ ] **You:** check the R260 rate. It's now **per hour**, so a 1½-hour session pays R390
- [ ] **You:** check the "Semester 2, 2026" dates (13 Jul–27 Nov)
- [x] **Slice 10:** attendance views for lecturers, admin and tutors, CSV downloads, real "students reached"
- [x] Weekly backups: working since 10 Oct (fresh one taken 14 Oct)
- [x] Slice 8 so far: every tab checked on the live site for every role, Supabase security/speed review done, [[Phone test]] script and [[Handover]] runbook written
- [ ] **You and the team:** run the [[Phone test]] on a real iPhone and Android
- [x] Old test data removed; **demo data** set up for the stakeholder demo (16 Oct): see [[Demo script]]
- [x] Demo accounts and all activity removed (25 Oct). Real students, Dr Gorrah and the main admin kept, with their modules
- [x] Modules per semester, blurred check-in code, live counter ring, camera asked once (25 Oct)
- [ ] Apply the database part of modules per semester (migration 26): needs your OK for Claude to run it
- [ ] Old files in storage from the demo (16 result uploads, 1 register): delete in Supabase → Storage if wanted
- [ ] Handover: change the database password and the tutorlink.ri@gmail.com password

## Later phases
- [ ] Phase 2: student module page and announcements from tutors
- [ ] Phase 3: quizzes (self-paced and live)
- [ ] Better PC look and feel: wider layouts on a laptop or desktop screen, not just the phone view stretched
- [x] Phase 4: attendance (brought forward and done: slices 9 and 10)

## How far along (15 Oct)
Phase 1 plus attendance is about 95% done: only the final test pass and handover (slice 8) are left. All phases together are about 70%.

## To pick up again
Say "start slice 8" for the final test pass and handover, or name a feature to add first. Each slice goes live, you test it on your phone, then we move on.

Related: [[TutorLink]], [[Build plan]], [[Handover]]
