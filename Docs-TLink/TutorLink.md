# TutorLink

> **Picking up where we left off?** Start with [[Continue here]].

TutorLink runs the Rosebank International (Bloemfontein) peer tutoring programme. Strong students apply to tutor modules they've passed, admin approves them, they run sessions, and they get paid per confirmed session. Lecturers and admin talk to tutors inside the app instead of over email.

It's a web app you install on your phone (a PWA). It runs on free services only: GitHub Pages and Supabase. See [[Running costs and upkeep]].

**How to read this:** every feature gets three lines max — what it does and why it's there — then a link to the full note. Things not built yet live under [[#Future features]].

---

## Who uses it

### Four roles
**What —** Student, Tutor, Lecturer and Admin. Each gets their own screens.
**Why —** They want different things. One shared dashboard serves nobody. → [[Roles]]

---

## Getting in

### Students sign in with Google
**What —** Students tap "Sign in with Google" using their normal Gmail. First time in, they enter their student number (ST12345678).
**Why —** No passwords for us to manage, and the student number makes them easy for admin to look up. → [[Student sign-in]]

### Staff accounts are created by admin
**What —** Admin is set up in the database. Admin creates lecturer accounts. Nobody can sign up as staff.
**Why —** Letting anyone register as a lecturer or admin would be an obvious security hole. → [[Admin creates accounts]]

### Install the app
**What —** A short guide that shows people how to add TutorLink to their home screen.
**Why —** On iPhone, notifications only work once the app is on the home screen. → [[Install the app]]

---

## Students

### Pick your modules
**What —** Students choose the modules they're doing. If one is missing, they add it, and it's there for the next student.
**Why —** The list builds itself as people join, so admin doesn't have to type in every module up front. → [[Module picker]]

### Apply to become a tutor
**What —** Upload your statement of results, enter your marks, choose the modules you want to tutor, submit.
**Why —** This is how tutors are found. Without it, the rest of the system has nobody to work with. → [[Apply to tutor]]

---

## Tutors

### Switch between Student and Tutor
**What —** An approved tutor keeps their student account and gets a Tutor view they can switch to.
**Why —** A tutor is still a student in their other modules. One login, two hats. → [[Tutor view switch]]

### Schedule
**What —** The tutor's home screen: upcoming sessions. Admin sets each tutor's weekly day, hours, venue and end date.
**Why —** "Where am I meant to be?" is the first thing a tutor opens the app for. → [[Schedule]]

### Log a session
**What —** Start a check-in when the session runs. It stays Waiting until admin confirms it.
**Why —** Logging on the spot is quicker and more accurate, and only admin can confirm, so tutors can't pay themselves. → [[Log a session]]

### Session quota
**What —** Admin sets a limit (24 to start) for everyone or for one tutor. The tutor sees "used X of Y". At the limit, no more sessions can be added.
**Why —** It stops the programme from paying for more sessions than the budget allows. → [[Session quota]]

### Attendance (check-in)
**What —** The tutor shows a QR code that changes every 15 seconds (or a 4-digit code for Teams). Students check in on their phones; name, student number, qualification and time come from their account.
**Why —** It proves the session happened and replaces the paper register. Admin needs enough check-ins to confirm a session. → [[Attendance]]

### Pay
**What —** What's approved, what's pending, the rate, and a CSV statement to download.
**Why —** "Have I been paid?" is the second question every tutor has. → [[Pay]]

---

## Lecturers

### My tutors
**What —** A list of the tutors on the lecturer's modules, with their latest message.
**Why —** A lecturer only needs one thing: who is teaching my subject, and how do I reach them. → [[Lecturer dashboard]]

---

## Admin

### Overview
**What —** Opens on what's stuck: open applications, sessions waiting for confirmation, money owed.
**Why —** Admin's job is a queue, so the first screen should show what needs doing. → [[Admin overview]]

### Applications
**What —** Every application, with the marks, an automatic eligible/not-eligible flag, a background check step and an approve/decline button.
**Why —** Everything needed to make a fair decision sits on one screen. → [[Applications]]

### Approving creates the tutor
**What —** Approving turns the student into a tutor for those modules and sends them a welcome message.
**Why —** The decision and the notification happen in the same moment, so nobody has to find out days later. → [[Approve and decline]]

### Tutor management
**What —** For each tutor: sessions, Confirm buttons, registers, what they're owed, and Mark as paid.
**Why —** Confirming and paying is the biggest recurring job, and it needs to work from a phone. → [[Tutor management]]

### Settings
**What —** Rate per session, minimum mark, session quota per semester, response templates.
**Why —** These change from year to year and drive every number in the app. → [[Settings]]

### Manage modules
**What —** Admin can add, rename, fix and merge modules.
**Why —** Students can add modules, so someone has to clean up the typos. → [[Manage modules]]

---

## Messaging

### Threads between tutors, lecturers and admin
**What —** Two-way message threads, each message with a topic. Admin can message anyone. A lecturer and a tutor can only message each other if they share a module.
**Why —** It replaces email and corridor chats with something that's recorded and actually reaches people. → [[Messaging]]

### Unread dots and badges
**What —** A gold dot means unread, and there's a count on the mail icon. The sender sees "delivered" until it's opened.
**Why —** You know what's new, and the sender knows whether you've seen it. → [[Unread and delivered]]

### Push notifications
**What —** Your phone buzzes for new messages, application decisions and confirmed sessions.
**Why —** This is the whole reason to be an app rather than a website. → [[Push notifications]]

---

## Feels like an app

### Native-style motion and gestures
**What —** Screens slide in, swipe from the edge to go back, panels slide up from the bottom, buttons press when tapped.
**Why —** It's what makes it feel like an app rather than a website squeezed onto a phone. → [[App feel]]

---

## Behind the scenes

- [[Tech stack]] — what it's built with and why
- [[Database]] — the tables and who can see what
- [[Running costs and upkeep]] — why it costs R0 and what keeps it alive
- [[Build plan]] — the order we're building it in
- [[Handover]] — what Rosebank gets at the end
- [[App flow]] — diagrams of every flow

---

## Future features

### Student module dashboard
**What —** For each module: the tutor, the next session, resources and activities.
**Why —** It gives students a reason to open the app every week, not just once. → [[Student module dashboard]]

### Tutor announcements
**What —** Tutors post announcements that their module's students see on the dashboard and get notified about.
**Why —** "Session moved to Lab 4" reaches everyone at once. → [[Announcements]]

### Quizzes
**What —** Tutors write quizzes. Students play them live and timed in a session, or in their own time.
**Why —** It makes revision active and fun, and it shows the tutor what the class doesn't get. → [[Quizzes]]

### Other ideas parked for later
**What —** Broadcast to a whole module, lecturer sign-off on new tutors.
**Why —** These are useful, but not needed to ship. → [[Parked ideas]]
