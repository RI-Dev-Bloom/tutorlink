---
status: v1
---

# Apply to tutor

**In short:** a student uploads their results, enters their marks and picks the modules they want to tutor.

## What it does
1. Upload the **Academic Statement of Results** (PDF or photo).
2. Enter the mark for each module on it.
3. Pick which of those modules they want to tutor.
4. Submit. They can see the status: Pending, Under review, Approved or Declined.

## Why it's here
It's the only way tutors come into the system. It used to be a separate web app. Now it lives in the same app as everything else.

## Rules
- One open application per student at a time.
- The eligibility flag is worked out automatically: every module they apply for must be at or above the minimum mark (75% by default, set in [[Settings]]).
- The student types in the marks, and admin checks them against the uploaded PDF. We're not reading PDFs automatically, which keeps it simple and free.
- Only the student and admin can see the uploaded file.

Related: [[Applications]], [[Approve and decline]]
