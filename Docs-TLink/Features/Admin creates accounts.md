---
status: v1
---

# Admin creates accounts

**In short:** nobody signs up as staff. Admin makes lecturer accounts, and the first admin is set up in the database.

## What it does
- Admin fills in a lecturer's name, email and the modules they teach. Only admin can change those modules later. The lecturer gets an email to set their password.
- The first admin account is created when the database is set up. That admin can add more admins.
- Tutors aren't created here. They come from approved applications ([[Approve and decline]]).

## Why it's here
Letting anyone register as a lecturer or admin would let anyone read student records.

## How it works
Creating a login needs a "master key" that must never be in the app itself. So the app asks a small server function (a Supabase Edge Function) to do it, and that function checks that the person asking really is an admin.

Related: [[Roles]], [[Tech stack]]
