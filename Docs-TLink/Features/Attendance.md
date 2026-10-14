---
status: v1
---

# Attendance

**In short:** the tutor (at a tutorial) or the lecturer (at a lecture) starts a check-in, students check in on their phones, and that's the record. It replaces the paper register.

## Starting a check-in (tutor)
**Start check-in** on the Schedule tab. Choose:
- **Module**, if they tutor more than one.
- **Session title**: Introduction, Revision, Refresher, Practical, Test prep, Q&A, or their own (Other…). Required.
- **What it's about**: the topic, e.g. "Loops and arrays". Required.
- **In class** (QR code) or **Online (Teams)** (a 4-digit code).
- **Venue**, filled in from the timetable.
- **Session length**: 1, 1½, 2, 2½, 3 or 4 hours. This sets the end time, and the pay (pay is per hour).
- **Check-in open for**: 5, 10, 15 or 20 minutes (10 to start). After that, nobody can check in (the tutor can still add someone by hand).

The date and start time are captured automatically.

**Rescheduled sessions:** tutors often run the week's session on another day. The check-in uses the session planned for that module this week (Monday to Sunday) and moves it to today, so it doesn't use up an extra session. If nothing was planned that week, it adds one, which counts towards the [[Session quota]].

## Lectures (lecturers)
- Lecturers check students in at their own lectures: **Attendance tab → Start a lecture check-in**, for any module they teach. No slot from admin is needed.
- Same form (title, topic, in class or online, venue, length, how long check-in stays open) and the same QR, codes, laptop link, manual adds and PDF register.
- Lectures are **not** paid, confirmed or counted against any limit, and they never appear in admin's To do or the pay sheet.
- Their recent lectures are listed under the button, with how many checked in.

## In class
- The tutor's phone shows a big **QR code that changes every 15 seconds**, with a **6-letter code** underneath for anyone whose camera won't scan.
- **Show on a laptop** shares a link (e.g. to the tutor's own WhatsApp). Opened on a laptop or projector, it shows the same changing QR full-screen, with no sign-in. The link stops working when the check-in closes.
- A photo of the QR sent to friends at home stops working within about a minute.

## Online (Teams)
- Online sessions only: the tutor gets a **4-digit code that changes every 30 seconds** (each code works for about a minute).
- The tutor **shares their screen in Teams** with the code showing (**Show on a laptop** opens it full-screen). Students type it in TutorLink. These check-ins are labelled **Online**.
- Why it changes: a code forwarded to a friend who isn't in the session is dead by the time they type it. A short check-in window (e.g. 5 minutes) narrows it further.

## Checking in (student)
- **Check in to a session** on the student home screen. Point the camera at the QR, or type the code.
- Scanning the QR with the phone's normal camera also works: it opens TutorLink and checks them in (after signing in, if needed).
- Their **name and surname, student number, qualification** (e.g. DISD) and the **time** come from their account. Nobody types a name, so nobody can check in a friend.
- First check-in without a qualification? They pick it on the spot (it's also asked when they first sign up).
- Any student can check in. The module is added to their list automatically.
- Once per session; scanning twice just says "Already checked in".

## The tutor's list
- Names appear live as students check in, with the time and how they checked in: **QR**, **Code**, **Online** or **Manual**.
- **+ Add by hand** for someone with no phone or data: student number, plus name if they're not on TutorLink. Shown as **Manual** so admin can see it.
- A wrong entry can be taken off until admin confirms the session.
- **Close check-in** when done. Otherwise it closes by itself when the window (5–20 minutes) runs out.
- Starting a check-in again for the same module on the same day reopens that session; the names already there stay.
- Past sessions open the same list. A session that was never checked in can still have students added by hand.
- **Download register (PDF)** once the check-in has closed: a one-page register in the app's navy and gold, with the module, date, time, venue, length, tutor, where (in class or online), status, and every student (student number, name, qualification, time, how they checked in; manual ones marked). Lecturers and admin can download it from the session too.

## Admin
- A session can only be **confirmed** if at least the **minimum attendance** checked in (set to **1**; admin can choose 0 to 5 in [[Settings]]). Below it, the session shows "Under 1" instead of a Confirm button.
- Tapping a session shows who checked in.

## The student's progress (private)
On their home screen, one line per module from 0% to 100%: sessions they came to out of the sessions run **by the tutor(s) they go to** this semester (a module can have several tutors with separate groups, and other groups' sessions don't count against them). Marks at 50% and 75%; it turns gold from 75%. It refreshes when they come back to the app. Lectures get their own line (marked LECTURES), out of the lectures run by the lecturer(s) they go to. Only the student sees it. Lecturer and admin lists use the same rule.

## Who sees what
| | Their own | Their sessions | Their modules | Everything |
|---|---|---|---|---|
| Student | Yes | | | |
| Tutor | | Yes | | |
| Lecturer | | | Yes | |
| Admin | | | | Yes |

## Titles everywhere
The title and topic show on the live screen, the laptop/projector screen, the student's "You're checked in", the PDF register, session lists, and the CSV (which also says Tutorial or Lecture, and who ran it).

## Attendance views
The same screens for everyone, showing only what they're allowed to see:
- **Lecturers:** an **Attendance** tab with their modules.
- **Admin:** from the Overview (tap the reach figures or **Attendance by module**), every module. Each high-risk module on the Overview opens its attendance too.
- **Tutors:** **Your students** on the Sessions tab, for their own sessions.

Lecturers and admin switch between **Tutorials** and **Lectures**, so the two are never mixed. For a semester (earlier ones can be picked at the top): sessions held, **students reached** (different students, so someone at five sessions counts once), and the average per session. Then per module:
- **Students:** each student's name, student number and qualification, with a line and "7 of 9" (their rate across the module's sessions).
- **Never checked in:** lecturers and admin also see students who take the module but haven't checked in once ("0 of 9"). They're in the CSV too, marked "Never".
- **Sessions:** each session with the tutor, venue, length and how many checked in. Tap one for the list (read-only for lecturers).
- **Downloads (CSV, opens in Excel):** the student list with rates, and every check-in (date, time, module, tutor, venue, student number, name, qualification, how they checked in). The index also downloads every check-in for the semester.

The Overview's "Students reached" and "Per session" now come from real check-ins.

Related: [[Pay]], [[Tutor management]], [[Session quota]], [[Schedule]]
