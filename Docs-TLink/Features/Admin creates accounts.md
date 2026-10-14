---
status: v1
---

# Admin creates accounts

**In short:** nobody signs up as staff. Admin lets a lecturer's email in, and the lecturer signs in with Google. No password needed.

## What it does
- Admin taps **Add lecturer**, fills in title, name, surname, email and the modules they teach, and taps **Let them in**. Only admin can change those modules later.
- The app shows a short message with a **Copy** button: open the app, tap **Sign in with Google**, pick that email. Admin pastes it into WhatsApp or an email.
- Only that email gets lecturer access. Anyone else who signs in with Google is just a student.
- Until they sign in for the first time, the lecturer shows **Not signed in yet**.
- If the lecturer had already signed in with that email before admin added them (so they got a student account), adding them turns that account into their lecturer account.
- **Email isn't a Google account?** Some school emails aren't. Admin opens the lecturer and taps **Give them a password**. The app makes one up to send them; they sign in with **Email and password** and choose their own straight away. The same button works if they forget it.
- The lecturer list has a search box. Type any mix of title, name, surname, email or module code, e.g. "dr smith" or "PROG6221".
- When a lecturer leaves, admin opens them and taps **Remove lecturer**. Their login and their message threads go. Tutors, sessions and pay aren't touched. They can be added again later with the same email.
- The first admin account is created when the database is set up.
- Tutors aren't created here. They come from approved applications ([[Approve and decline]]).

## Why it's here
Letting anyone register as a lecturer or admin would let anyone read student records. Google sign-in means no passwords to send around or forget.

## How it works
Creating a login needs a "master key" that must never be in the app itself. So the app asks a small server function (a Supabase Edge Function) to do it, and that function checks that the person asking really is an admin. The account gets a long random password nobody knows, so Google is the only way in until admin gives them a password.

Related: [[Roles]], [[Tech stack]]
