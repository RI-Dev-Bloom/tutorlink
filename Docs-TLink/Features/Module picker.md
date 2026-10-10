---
status: v1
---

# Module picker

**In short:** students tap the modules they're doing. If one is missing, they add it, and the list grows for everyone.

## What it does
- Shows every known module as a tappable chip, with search.
- "My module isn't here" opens a small form: module code and name.
- The new module is saved straight away, so the next student sees it.

## Why it's here
Admin doesn't have to load every module before launch. The list fills itself in as students join.

## Rules
- The module code must look like a real one: 4 letters and 4 digits (e.g. `PROG6221`). This stops most typos.
- If the code already exists, the existing module is used instead of creating a duplicate.
- Admin can fix names and merge duplicates. See [[Manage modules]].
- We start with the 11 IT modules from the demo already loaded.

Related: [[Student sign-in]], [[Student module dashboard]]
