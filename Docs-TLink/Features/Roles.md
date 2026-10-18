---
status: v1
---

# Roles

**In short:** four kinds of people use TutorLink, and each sees only what they need.

| Role | Signs in with | Main job |
|---|---|---|
| Student | Rosebank student email and password (makes their own account) | Pick modules, apply to tutor (later: dashboard, quizzes) |
| Tutor | Same account as their student one (the Tutor door) | Run sessions, log them, get paid |
| Lecturer | @rbi.ac.za email and password, created by admin | Talk to the tutors on their modules |
| Admin | @rbi.ac.za email and password, set up in the database | Approve tutors, confirm sessions, pay, manage everything |

## Why it's split like this
A tutor wants to know where to be and whether they've been paid. A lecturer wants to reach whoever teaches their module. Admin wants to clear a queue. Putting it all on one screen would make everyone dig.

## Rules
- A tutor is a student with an extra role. They don't get a second account. See [[Tutor view switch]].
- Admin can do everything. Everyone else only sees their own stuff. This is enforced by the database, not just hidden in the screens. See [[Database]].

Related: [[Student sign-in]], [[Admin creates accounts]]
