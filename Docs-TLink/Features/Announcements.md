---
status: v1
---

# Announcements

**In short:** admin posts news to every student: an image, a title and a line of text. It sits on their Home feed for a while, then stays in their Messages tab.

## Posting (admin)
1. **Messages → Announcements → New announcement.**
2. Add any of these, all optional (but not all empty):
   - **Image**: a poster or a photo of the timetable (JPG, PNG or WebP, up to 10 MB; big phone photos are shrunk first).
   - **Title**, with quick picks: New timetable is out, Venue change, Exam reminder, Tutoring this week.
   - **Text**.
3. **Show on the feed for**: 1 day, 3 days, **1 week** (the default) or 2 weeks.
4. **Event date** (optional). If the event is sooner, it stops showing at the end of that day.
5. **Post to students.** Every student with notifications on gets one straight away.

Admin can **End now** (it leaves the feed but stays in Messages) or **Remove** it completely.

## What students see
- **Home**: live announcements at the top, image first. The **×** closes one on that phone.
- **Messages** (a new tab for students): every announcement, "Showing now" and "Earlier", each with its end date.
- Tutors see them in their student view, and through **Announcements** at the top of their Messages tab.
- Lecturers don't get them.

## Images expire
When an announcement ends, its image is removed (by the hourly tidy-files job), so storage never fills up. The title and text stay in Messages with "Image removed when it ended".

## Rules
- Only admin can post, end or remove one. The database checks this.
- Only admin can upload announcement images. Anyone signed in can view them.

Related: [[Messaging]], [[Push notifications]]
