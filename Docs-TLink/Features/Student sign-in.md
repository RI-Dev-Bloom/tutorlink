---
status: v1
---

# Student sign-in

**In short:** students use "Sign in with Google", then enter their student number once.

## What it does
1. Student taps **Sign in with Google** and picks their Gmail account.
2. First time only: they enter their full name, their **student number** (format `ST` + 8 digits, e.g. `ST12345678`), and pick their modules ([[Module picker]]).
3. After that, they go straight in.

## Why it's here
- We never store or reset student passwords. Google handles that.
- The student number is the main way to identify a student. Admin searches by it, and the [[Attendance]] system will use it later.

## Rules
- Each student number can only be used once.
- The format is checked: `ST` followed by exactly 8 digits.
- A student can't change their student number themselves. Admin can fix it if it's wrong.

Related: [[Roles]], [[Apply to tutor]]
