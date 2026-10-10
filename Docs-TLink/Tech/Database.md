---
status: v1
---

# Database

Plain-English version. The real thing lives in `supabase/migrations/`.

## Tables
| Table | Holds |
|---|---|
| `profiles` | Everyone: name, email, role (student / lecturer / admin), whether they're a tutor, student number |
| `modules` | Code, name, who added it, hidden or not |
| `student_modules` | Which modules each student does |
| `lecturer_modules` | Which modules each lecturer teaches |
| `tutor_modules` | Which modules each tutor is approved for |
| `applications` | Status, background check, response message, results file, who processed it and when |
| `application_marks` | One row per module mark typed in, and whether they're applying to tutor it |
| `semesters` | Name, start date, end date, session quota (default for all tutors) |
| `tutor_quota_overrides` | A different quota for one tutor in one semester |
| `schedule_slots` | Admin-set weekly slot: tutor, module, weekday, start and end time, venue, until date |
| `sessions` | Tutor, module, the slot it came from (if any), time, venue, students, status (scheduled / logged / confirmed / paid / cancelled), rate when confirmed |
| `registers` | Uploaded attendance sheets |
| `conversations` | One per pair of people |
| `messages` | Conversation, sender, topic, body, when sent, when read |
| `push_subscriptions` | Each phone that has allowed notifications |
| `settings` | Rate, minimum mark |
| `response_templates` | The approve/decline wording |

## Who can see what (Row Level Security)
- **Admin:** everything.
- **Students:** their own profile, modules and application.
- **Tutors:** their own sessions, registers and pay, and threads with admin and with lecturers who share a module.
- **Lecturers:** tutors on their modules and threads with them, plus admin.
- **Files:** results PDFs (the student who uploaded it and admin), registers (the tutor who uploaded it and admin).

## Rules the database enforces itself
- Student number format `ST` + 8 digits, unique.
- Module code format: 4 letters + 4 digits, unique.
- The [[Session quota]] limit, checked inside the database so it can't be dodged.
- Only admin can confirm or pay a session.
- "Who can message whom" from [[Messaging]].
