---
status: v1
---

# Handover

What Rosebank gets, so it runs without the developer.

- **One login owns everything:** tutorlink.ri@gmail.com controls GitHub, Supabase, Google Cloud and the email sender. Give that to Rosebank and the developer is out.
- **A one-page runbook:**
  - add another admin
  - start a new semester and set the quota
  - change the rate
  - restore from a backup
  - what to do if the app says it can't connect (the database paused: open Supabase and press Restore)
- **This vault**, which explains every feature in plain English.

## Before handing over — checklist
- Delete the test accounts used during development (`tutorlink.ri+qa-…@gmail.com`) and the test data (`QA Semester 2099`, modules `QATS9999` and `QATS9997`, and the QA student "Sam QA-Student", now a QA tutor for PROG1111, with their applications, uploaded results files, weekly slot, sessions, uploaded register and test messages). Check the dates of "Semester 2, 2026", which was added during testing.
- Suggest Rosebank change the **database password** (Supabase → Database → Settings) and update the `SUPABASE_DB_URL` secret on GitHub, so the backup keeps working.
- Check the latest backup in `tutorlink-backups` opened fine.
