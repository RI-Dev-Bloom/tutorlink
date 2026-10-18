---
status: v2
---

# Admin creates accounts

**In short:** nobody signs up as staff. Admin adds a lecturer by their Rosebank email and sends them a temporary password.

## What it does
- Admin taps **Add lecturer**, fills in title, name, surname, their `@rbi.ac.za` email and the modules they teach, and taps **Let them in**.
- The app makes a temporary password from words, e.g. `BraveMango47`, `SunnyLemon12`: easy to read out or type from WhatsApp. It shows a ready message with **Copy** and **Share to WhatsApp**: open the app, tap **Lecturer**, the email and the password.
- The first time they sign in, they choose their own password, and the temporary one stops working.
- Until then, the lecturer shows **Not signed in yet**.
- **Forgot their password?** They can use **Forgot password?** on the sign-in screen. Or admin opens the lecturer and taps **Give them a new password**.
- **Anyone else locked out** (a student or tutor whose reset email didn't come): **Settings → Reset a password**, type their Rosebank email, and send them the new temporary password.
- The lecturer list has a search box: any mix of title, name, surname, email or module code.
- When a lecturer leaves, admin opens them and taps **Remove lecturer**. Their login and message threads go; tutors, sessions and pay aren't touched.
- Tutors aren't created here. They're students whose applications were approved ([[Approve and decline]]).

## About the word passwords
- Adjective + fruit + two digits, from about 140 adjectives and 60 fruits: roughly 750,000 possible passwords, picked truly at random.
- That's enough because they're temporary and Supabase limits sign-in attempts.

## How it works
Creating a login needs a "master key" that must never be in the app. So the app asks a small server function (a Supabase Edge Function) to do it, and that function checks the person asking really is an admin. It also puts the email on the staff list, because the database refuses any new account that isn't a Rosebank student email or on that list.

Related: [[Roles]], [[Student sign-in]], [[Tech stack]]
