---
status: v1
---

# Build plan

## Phase 0: Foundations
> **Status: done (10 Oct 2026).** Live at https://ri-dev-bloom.github.io/tutorlink/. Database, security rules, Google sign-in, admin account, deploys and keep-alive are all working. Weekly backups still need their two secrets (see [[Running costs and upkeep]]).

- Repo on the TutorLink GitHub, with automatic deploys to GitHub Pages.
- Supabase project: tables, security rules, storage buckets, the first admin.
- Google sign-in set up (a free Google Cloud project on tutorlink.ri@gmail.com).
- Gmail set up as the email sender.
- App shell: the demo's design, screen transitions, tab bars, bottom sheets, installable.
- Keep-alive and backup jobs.

## Phase 1: What we ship
Built in slices, each one tested on a phone before the next.

| Slice | What | Status |
|---|---|---|
| 1 | Admin setup: semesters and quota, modules, lecturer accounts | Done 10 Oct 2026 |
| 2 | Students: module picker, apply to tutor | Done 11 Oct 2026 |
| 3 | Admin: applications queue, approve or decline | Done 11 Oct 2026 |
| 4 | Admin: tutor management, weekly slots, confirm and pay | Done 13 Oct 2026 |
| 5 | Tutors: schedule, mark and log sessions, registers, pay | Done 13 Oct 2026 |
| 6 | Messaging and the lecturer dashboard | Done 13 Oct 2026 |
| 7 | Push notifications and the install guide | Done 13 Oct 2026 |
| 9 | [[Attendance]]: check-in (QR and online code), pay per hour, qualifications, student progress | Done 15 Oct 2026 |
| 10 | Attendance views for lecturers and admin, CSV downloads, reach from check-ins | Done 15 Oct 2026 |
| 8 | Real-phone test pass, docs, handover checklist | Next |

- **Students:** Google sign-in, student number, [[Module picker]], [[Apply to tutor]].
- **Admin:** [[Admin overview]], [[Applications]], [[Approve and decline]], [[Tutor management]], [[Settings]] (including semesters and quota), [[Manage modules]], [[Admin creates accounts]].
- **Tutors:** [[Tutor view switch]], [[Schedule]], [[Log a session]], [[Session quota]], [[Attendance]], [[Pay]].
- **Lecturers:** [[Lecturer dashboard]].
- **Everyone:** [[Messaging]], [[Unread and delivered]], [[Push notifications]], [[Install the app]].
- Test on a real iPhone and a real Android phone.

## Phase 2: Student side
[[Student module dashboard]], [[Announcements]]

## Phase 3: [[Quizzes]]

## Phase 4: Attendance
Brought forward and built as slices 9 and 10. See [[Attendance]].

Then: [[Handover]]
