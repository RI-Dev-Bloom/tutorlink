---
status: v1
---

# Admin creates accounts

**In short:** nobody signs up as staff. Admin makes lecturer accounts, and the first admin is set up in the database.

## What it does
- Admin taps **Add lecturer** and fills in title, name, surname, email and the modules they teach. Only admin can change those modules later.
- The app makes up a random password and shows a summary card with a **Copy** button. Admin pastes it into WhatsApp or an email, so no email system is needed.
- The lecturer opens the app, taps **Lecturer**, signs in, and picks their own password on first sign-in, so the shared one stops working.
- If a lecturer forgets their password, admin makes a new one the same way.
- The lecturer list has a search box. Type any mix of title, name, surname, email or module code, e.g. "dr smith" or "PROG6221".
- When a lecturer leaves, admin opens them and taps **Remove lecturer**. Their login and their message threads go. Tutors, sessions and pay aren't touched, because lecturers don't own any of those. They can be added again later with the same email.
- The first admin account is created when the database is set up. That admin can add more admins.
- Tutors aren't created here. They come from approved applications ([[Approve and decline]]).

## Why it's here
Letting anyone register as a lecturer or admin would let anyone read student records.

## How it works
Creating a login needs a "master key" that must never be in the app itself. So the app asks a small server function (a Supabase Edge Function) to do it, and that function checks that the person asking really is an admin.

Related: [[Roles]], [[Tech stack]]
