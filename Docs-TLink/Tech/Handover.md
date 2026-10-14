---
status: v1
---

# Handover

**In short:** everything Rosebank needs to run TutorLink without the developer. It costs R0 a month and mostly runs itself.

## Who owns what
One Google account owns everything: **tutorlink.ri@gmail.com**. Hand over its password (and its phone for 2-step verification) and Rosebank owns the whole thing.

| What | Where | Logged in with |
|---|---|---|
| The app | https://ri-dev-bloom.github.io/tutorlink/ | — |
| The code, and the daily/weekly jobs | GitHub, organisation **RI-Dev-Bloom** (repo `tutorlink`) | tutorlink.ri@gmail.com |
| Weekly backups | GitHub, **private** repo `RI-Dev-Bloom/tutorlink-backups` | same |
| Database, logins, files | Supabase project **pdxupuheclywmtkrbykt** | same |
| Google sign-in | Google Cloud project for TutorLink | same |
| These notes | the `Docs-TLink` folder in the repo (open it in Obsidian) | — |

## What runs by itself
- **Every day:** a keep-alive so the free database never goes to sleep.
- **Every hour:** applications are auto-declined (if switched on); message files older than the setting are removed.
- **Every day at 7am:** tutors get a reminder on session days.
- **Every Sunday:** a full copy of the database goes to the private backup repo.

## Runbook

**A new semester.** Settings → Semesters → **Add a semester**: name, start and end dates, sessions per tutor. Then give tutors their weekly slots (Tutors → a tutor → Add weekly slot).

**Change the pay rate.** Settings → **Rate per hour**. Sessions already confirmed keep the rate they were confirmed at.

**End of semester pay.** Overview → Pay this semester → **Pay sheet** → Download pay sheet (CSV) and send it to finance. Confirm any sessions still waiting first.

**Open modules for tutor applications.** Settings → **High-risk modules**: switch on the modules that need tutors.

**A lecturer joins.** Settings → Lecturers → **Add lecturer** → copy the message and send it. They sign in with Google. If their email isn't a Google account: open them → **Give them a password**.

**A lecturer leaves.** Settings → Lecturers → open them → **Remove lecturer**.

**Add another admin.** There's no button for this on purpose. In Supabase → SQL Editor, run (with their email):
```sql
update public.profiles set role = 'admin' where email = 'their.email@example.com';
```
They must have signed in to TutorLink once first.

**How many students must check in for a session to count.** Settings → **Minimum attendance** (0–5).

**"The app can't connect".** The database may have been paused (only if the keep-alive stopped for a week). Supabase → the project → **Restore project**. Then check GitHub → Actions → **Keep alive** is still running.

**Restore from a backup.** Ask someone technical to run, with the database connection string from Supabase → Connect:
```
pg_restore --clean --if-exists --no-owner -d "<connection string>" tutorlink.dump
```
The backup holds all records (people, sessions, attendance, messages). Uploaded files (results documents, message files) are not in it. Results documents stay in Supabase storage; message files expire anyway.

## Security, in short
- The database decides who sees what (lecturers only their modules, tutors only their sessions, students only themselves). It's tested automatically on every change.
- Secret keys live only in Supabase and in GitHub secrets, never in the app.
- The backup repo holds student records: **keep it private**.
- Supabase's "leaked password protection" is a paid feature. It only matters for the few staff email-and-password logins; everyone else uses Google.

## Before handing over (checklist)
- [x] Old test accounts and test data removed (15 Oct 2026).
- [ ] Remove the **demo** accounts `admin1–3@`, `lecturer1–4@`, `student1–7@gmail.com` (see [[Demo script]]) and everything they made: sessions, check-ins, messages, applications, uploaded results files and the HCIT qualification if Rosebank doesn't use it.
- [ ] Check the real settings: semester dates, **rate per hour**, minimum mark, minimum attendance, high-risk modules.
- [ ] Change the **database password** (Supabase → Database → Settings), then update the `SUPABASE_DB_URL` secret on GitHub so backups keep working. Run the Backup job once by hand (GitHub → Actions → Backup → Run workflow) to check.
- [ ] Change the tutorlink.ri@gmail.com password and hand it over.
- [ ] Run the [[Phone test]] on a real iPhone and Android.

Related: [[Running costs and upkeep]], [[Phone test]], [[Build plan]]
