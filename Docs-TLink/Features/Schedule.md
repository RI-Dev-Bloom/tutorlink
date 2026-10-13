---
status: v1
---

# Schedule

**In short:** the tutor's home screen shows their upcoming sessions.

## What it does
- "**9 of 24 sessions used**" with a bar at the top. See [[Session quota]].
- **To mark:** sessions that have happened, each with a **Mark** button. See [[Log a session]].
- **Coming up:** the next sessions with day, time, venue and module. Weeks admin cancelled show crossed out.
- **Waiting for admin:** a reminder of marked sessions not yet confirmed, with a nudge to upload the register.
- (Coming in slice 6: a banner for unread messages.)

## Why it's here
The old system only recorded sessions after they happened, so nobody knew in advance where tutors were supposed to be.

## Who sets the timetable
**Admin does.** For each tutor, admin adds a weekly slot: the **day**, the **start and end time**, the **venue**, the module, and **until when** it runs (an end date). The app fills in a session for every week up to that date.

While admin fills in the slot, the app does a trial run (nothing is saved) and shows how many sessions it will add, how many won't fit the limit, and how many fall outside the semester.

## Rules
- If the slot would create more sessions than the tutor has left in their [[Session quota]], admin gets a warning, and only the sessions that fit are created.
- Admin can cancel a single week (e.g. a public holiday) without deleting the whole slot. Cancelled sessions don't count towards the quota.

Related: [[Log a session]], [[Session quota]]
