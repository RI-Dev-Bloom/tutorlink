---
status: v1
---

# Session quota

**In short:** a tutor can only have a set number of sessions per semester. Admin sets the number, and the tutor sees how many they've used.

## What it does
- Admin sets one number for the semester in [[Settings]]: **24 sessions** to start.
- Admin can change it for **all tutors** (a warning pops up first, because it affects everyone) or for **one tutor** only, from that tutor's page.
- The tutor sees "**18 of 24 sessions used**" on their [[Schedule]] and [[Pay]] screens.
- Once the limit is hit, no new sessions can be scheduled, logged or added, by the tutor **or** by admin.

## Why it's here
It stops the programme from paying for more sessions than the budget allows.

## Rules
- It's a hard limit, checked by the database, so it can't be dodged by a quick double-tap or an old screen.
- Every session counts except cancelled ones.
- A semester has a start date, an end date and a quota. A new semester means a fresh count.
- A one-tutor change overrides the semester number for that tutor only.
- Lowering a quota below what a tutor has already used doesn't delete anything. It just stops them adding more.

Related: [[Settings]], [[Log a session]]
