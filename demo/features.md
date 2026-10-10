# TutorLink mobile — every feature, and why it's there

This is the demo in `index.html` running as a phone app. Same programme, same Rosebank look as the web version — navy, gold, cream, the serif headings — just rebuilt so it feels like something you'd actually open on a phone rather than a website squeezed onto a small screen.

Each feature below gets two lines: **what it is**, and **why it needs to be there**.

---

## 1. The shape of the app

### Three portals: Tutor, Lecturer, Admin
**What it is —** You open the app and pick who you are. Three cards, each leading to a completely different app.
**Why it's there —** These three people want completely different things. A tutor wants to know when their next session is and whether they've been paid. A lecturer wants to reach the person teaching their module. An admin wants to approve people and sign off money. One shared dashboard would serve none of them properly.

### The lecturer is new
**What it is —** A role that didn't exist in the web system at all. A lecturer signs in, picks the modules they teach, and sees only the tutors on those modules.
**Why it's there —** The lecturer is the one person who knows what the students are struggling with this week, and until now they were completely outside the system. The tutor was taking direction from nobody, or from a forwarded email. This puts the person closest to the content one tap away from the tutor.

### Students don't get a mobile app
**What it is —** There's no "apply to tutor" flow here. The role screen says so plainly and points students back to the web portal.
**Why it's there —** Applying happens once in your whole degree and it means uploading a PDF of your results. That's a laptop job. Building a whole mobile application flow for something a person does a single time is work spent in the wrong place.

### Signing in
**What it is —** Email and password per role. The demo accounts come pre-filled so you can just tap Sign in.
**Why it's there —** It's the demo — nobody should have to type a password to see a screen. The pre-filled field also quietly tells you which account you're looking at.

### Lecturer registration and the module picker
**What it is —** Lecturers can create an account, then tap through a list of module chips to say what they teach.
**Why it's there —** Lecturers are new to the system, so nobody has created accounts for them yet. And those module choices are the whole engine of the app — they decide which tutors appear on the dashboard and, more importantly, which tutors this lecturer is allowed to message at all.

### Tutor and admin accounts aren't self-service
**What it is —** Those two sign-in screens have no "create an account" link, just a note explaining where the account comes from.
**Why it's there —** A tutor account is created the moment an application is approved, and admin accounts are issued by the programme office. Letting anyone register as an admin would be an obvious hole.

### Demo controls
**What it is —** The small slider icon in the header opens a panel that drops you straight into any role, or resets all the demo data.
**Why it's there —** When you're showing this to someone you don't want to sign out and back in three times. Reset also puts the data back after you've approved and declined half the applicants.

---

## 2. Messaging — the reason the app exists

### Threads between lecturer, admin and tutor
**What it is —** Every tutor has one thread. Lecturers and admin post notices into it; the tutor reads them.
**Why it's there —** Three groups all working on the same programme with no way to talk to each other inside the system. Everything was happening over email or in a corridor, which means nothing was recorded and half of it never arrived.

### It looks like a timeline, not a chat
**What it is —** A thin line down the left with a dot for every message. You see the topic, who sent it, and how long ago. Tap it and the full text unfolds underneath.
**Why it's there —** These aren't conversations, they're short briefings that land maybe twice a week: a venue change, what to focus on, a payment confirmation. Chat bubbles are built for back-and-forth. A timeline lets a lecturer scan two months of a tutor relationship in one screen without reading a word.

### The dots mean something
**What it is —** Hollow ring = read. Solid navy = you sent it. Gold and slightly bigger = unread.
**Why it's there —** Gold appears in about five places in the whole app, so when a gold dot shows up your eye goes straight to it. The moment you use an accent colour for six different things it stops meaning anything.

### Role tags on every message
**What it is —** Each message is tagged Lecturer, Admin or You.
**Why it's there —** A note from admin about your contract carries a different weight to a note from your lecturer about Thursday's session. You need to know which one you're looking at before you read a word.

### Unread badge on the mail icon
**What it is —** A gold count sits on the mail icon in the tutor's header and on the Messages tab, and it ticks down as they open each message.
**Why it's there —** It's the whole point of being an app instead of a website — something reaches you. And because the count only drops when a message is actually opened, it stays honest.

### Delivered receipts
**What it is —** On the sender's side, a message reads "delivered" until the tutor has opened it, and the tutor's row in the list keeps a small dot.
**Why it's there —** If you've told a tutor the venue moved, you want to know whether they've seen it before you assume they'll be in the right room.

### Composing a message
**What it is —** A sheet slides up from the bottom with a topic and a body. Send, and it appears at the top of the thread.
**Why it's there —** Forcing a topic keeps the timeline scannable. A thread full of untitled messages is just a chat again, and then none of the scanning works.

### Lecturers can only reach their own tutors
**What it is —** The tutor list, the thread list and the compose sheet are all filtered by the modules that lecturer teaches.
**Why it's there —** A lecturer has no business messaging a tutor from a module they don't teach. It's also the rule the database has to enforce later — get it wrong there and any lecturer can message any tutor in the college.

### Admin can reach anyone
**What it is —** Admin sees every thread and can start a new message with any tutor.
**Why it's there —** Admin messages are programme-wide — contracts, payment runs, missing documents — and aren't tied to a module.

---

## 3. What the tutor gets

### Schedule with upcoming sessions
**What it is —** The home screen lists what's coming: day, time, venue, how many students, which module.
**Why it's there —** This is the thing a tutor opens their phone for. The web system only ever recorded sessions after the fact, so nobody ever knew where they were supposed to be.

### Mark attendance on a live session
**What it is —** A session happening today gets a Mark button. One tap logs it.
**Why it's there —** Logging happens standing in a lab with a phone in your hand, not that evening at a laptop. The sooner it's logged, the sooner it's confirmed and the sooner it's paid.

### Log a session manually
**What it is —** A sheet with date, module and student count.
**Why it's there —** Sessions get swapped, added, moved. There has to be a way to record one that wasn't on the timetable.

### Everything logged stays "pending"
**What it is —** A session a tutor logs shows an amber Pending badge until an admin confirms it.
**Why it's there —** Tutors are paid per confirmed session. If logging one paid you, the honest thing and the profitable thing would stop being the same thing.

### Upload an attendance register
**What it is —** A sheet where you pick the module and attach a PDF or a photo of the signed sheet.
**Why it's there —** It's the evidence admin confirms against. And a phone already has a camera pointing at the signed page — that's the whole argument for doing it on mobile.

### Pay screen
**What it is —** One big gold figure for what's approved, then the rate, what's still pending, and the projected total, with a line for every confirmed session.
**Why it's there —** "How much have I earned" is the second question every tutor has. Showing the pending amount separately stops the arguments before they start.

### Export a statement
**What it is —** A CSV of every confirmed session.
**Why it's there —** Students need something to show when a payment doesn't arrive, or for their own records.

### Profile
**What it is —** Their modules, email, approval date and how many registers are on file.
**Why it's there —** It answers "am I actually approved for this module" without anyone having to email admin.

---

## 4. What the lecturer gets

### Dashboard of their tutors
**What it is —** Their module chips at the top, a count of tutors, modules and sessions run, then the list of tutors with the last message and a dot if it's unread.
**Why it's there —** A lecturer wants one answer: who is teaching my subject, and are they on top of it. Nothing about applications, nothing about the wider programme.

### Tap a name, get the thread
**What it is —** Tapping a tutor pushes straight into the conversation with them.
**Why it's there —** There's exactly one thing a lecturer does with a tutor, so it shouldn't take two taps and a menu.

### All threads in one list
**What it is —** A second tab with every message across their tutors, newest first.
**Why it's there —** Sometimes you remember the message and not the person. This is the "what have I said lately" view.

### Editable module list
**What it is —** The profile shows the modules they teach, with a count of tutors on each, and an Edit link back to the picker.
**Why it's there —** Teaching loads change every semester, and that list controls everything they can see. It can't be locked at registration.

---

## 5. What the admin gets

### Overview
**What it is —** Open applications, active tutors, and the total money outstanding, plus a warning strip when tutors have logged sessions waiting on confirmation.
**Why it's there —** Admin's job is a queue. The screen should open on what's stuck, not on a chart.

### Applications list with filters
**What it is —** Every application, filterable by pending, under review, approved, rejected, each showing an eligible / ineligible flag.
**Why it's there —** The flag does the arithmetic so a human doesn't have to check eight marks against a threshold by eye.

### Application detail with the marks
**What it is —** The full academic record with a bar per module, coloured by mark, the applied-for modules tagged, and a tick or a cross against each one.
**Why it's there —** This is the actual decision. Everything needed to make it fairly has to be on one screen, or the decision gets made on the name at the top instead.

### Background check
**What it is —** A single "Mark done" button that moves the application to Under Review.
**Why it's there —** It's a real step in the process that happens outside the system, so it needs recording inside it — and it changes the status so nobody double-handles the same file.

### Response templates or a custom message
**What it is —** Four ready-made responses, or a free-text box, and you can't approve or decline until one is chosen.
**Why it's there —** Rejections are the messages people re-read and forward. Templates keep them consistent and reasonably kind. Forcing a message means nobody gets a silent decline.

### Approving creates the tutor and messages them
**What it is —** Approve, and the tutor account is created with the modules they applied for, and a welcome message lands in their inbox immediately.
**Why it's there —** Approval used to be an update to a row that a student found out about days later. Now the decision and the notification are the same action.

### Tutor management
**What it is —** Per tutor: their sessions, a Confirm button on each pending one, their registers, what they're owed, and Mark as paid.
**Why it's there —** Confirming sessions and paying people is the largest recurring job in the programme, and it needs to work while walking between offices.

### Add a session for a tutor
**What it is —** Same sheet as the tutor's, but sessions added by admin are confirmed straight away.
**Why it's there —** Admin already has the register in front of them, so a second approval step is theatre.

### Message any tutor from a floating button
**What it is —** A New message button on the messages tab that lets you pick a tutor, and a mail icon on each tutor's page.
**Why it's there —** Most admin messages start from a person — a contract, a missing document — so they should start from that person's screen.

### Settings
**What it is —** The rate per session (editable in a sheet), the minimum mark, message counts, and the response templates.
**Why it's there —** The rate changes between years and it drives every money figure in the app. Editing it in a sheet rather than a settings page means it takes four seconds.

---

## 6. The things that make it feel like an app

### Screens slide, they don't reload
**What it is —** Pushing into a detail slides it in from the right while the screen behind slides a quarter of the way left and dims. Going back reverses it.
**Why it's there —** It tells you, without words, that you've gone one level deeper and there's something to come back to. It's what iOS does, and it's the single biggest difference between a web page on a phone and an app.

### Swipe from the edge to go back
**What it is —** Drag from the left edge and the screen goes back. The button is still there for anyone who wants it.
**Why it's there —** It's the gesture every phone user already has in their thumb. Nobody uses the button once they know it works.

### Android back button works
**What it is —** The hardware/gesture back on Android pops one screen, exactly like the on-screen button.
**Why it's there —** On Android, back is a system-level promise. An app that ignores it feels broken.

### Bottom tab bars
**What it is —** A blurred bar at the bottom: five tabs for tutor and admin, three for lecturer.
**Why it's there —** Top navigation is out of thumb reach on a modern phone. The blur means content slides under it instead of vanishing behind a solid block.

### Bottom sheets instead of dialogs
**What it is —** Composing, logging, uploading and editing the rate all slide up from the bottom over a dimmed background. Drag down to dismiss.
**Why it's there —** They arrive near your thumb, they don't lose the screen underneath, and dragging one away is faster and less nervous-making than hunting for a close button.

### Everything you tap presses back
**What it is —** Buttons, rows, chips and tabs scale down slightly when pressed and spring back.
**Why it's there —** It's the difference between something feeling like a button and feeling like a link. On a touchscreen it's the only confirmation you get that your finger landed.

### Haptics
**What it is —** Small vibrations weighted by what happened — 6ms for a tab, 14 for sending, 16 for an approval, 24 for an error.
**Why it's there —** You feel a mistake before you read it. Worth knowing: this works properly on Android, and does nothing on iOS Safari because Apple has never supported vibration on the web. The code fails silently. It's also the strongest argument for going native — React Native gets the real Taptic Engine.

### Toasts
**What it is —** A short navy bar that appears above the tab bar to confirm what just happened, then leaves.
**Why it's there —** Actions like confirming a session change one badge in a long list. Without a toast you're never quite sure it took.

### Lists assemble instead of flashing in
**What it is —** Items fade up in sequence, about 50ms apart, when a screen loads.
**Why it's there —** It's subtle enough that nobody notices it, and the screen feels like it's being built rather than dumped.

### Safe areas
**What it is —** The header and the tab bar pad themselves around the notch and the home indicator.
**Why it's there —** Otherwise the first row of every screen hides under the camera cutout on half the phones in the room.

### Real phone behaviour in the small details
**What it is —** Form inputs are 16px, tap targets are at least 44px, the numeric keyboard opens for numbers and the email keyboard for email, and text can't be accidentally selected by a long press.
**Why it's there —** Anything under 16px makes iOS zoom in when you tap a field, and then the layout is wrong for the rest of the session. These are the details that give away a web page pretending to be an app.

### Respects Reduce Motion
**What it is —** If the phone has Reduce Motion switched on, every animation drops to almost nothing. Everything still works.
**Why it's there —** Motion makes some people ill. It's an accessibility setting, not a preference, and it costs three lines to honour it.

### Phone frame on a desktop screen
**What it is —** Open it on a laptop and it renders as a phone on a navy backdrop. On an actual phone it fills the screen.
**Why it's there —** So the demo can be shown in a lecture, on a projector, without anyone having to imagine the edges.

---

## 7. Deliberately not built yet

- **Replies.** The tutor reads but can't respond in the thread. Worth deciding whether they should at all — some notices are meant to be one-directional.
- **Broadcast.** One message to every tutor on a module at once. Admin will ask for this immediately.
- **Attachments.** A lecturer sharing a worksheet or a marking guide inside a message.
- **Real push notifications.** Right now the badge only updates while the app is open. The live version needs Firebase Cloud Messaging fired from a Supabase function, and a tapped notification should open the right thread.
- **Lecturer sign-off on tutors.** There's a good argument that a lecturer should approve a tutor for their module before admin makes it final.
