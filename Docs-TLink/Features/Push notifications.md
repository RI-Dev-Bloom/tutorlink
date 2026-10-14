---
status: v1
---

# Push notifications

**In short:** your phone buzzes even when the app is closed.

## What sends a notification
- **A new message** → the person it was sent to.
- **A new application** → every admin.
- **Your application was approved or declined** → the student.
- **Sessions confirmed** → the tutor. If admin confirms five at once, that's one notification ("Admin confirmed 5 sessions"), not five.
- **Session reminder** at 7:00 on the morning of a tutoring session → the tutor ("Tutoring session today · 14:00 · PROG1111 · Lab 2").
- Later: tutor announcements and quiz invites.

Tapping the notification opens the right screen (e.g. a message opens Messages, a confirmation opens Pay).

## Turning them on
- A **Get set up** card on the home screen: on a phone, step 1 is adding the app to the home screen, step 2 is **Turn on**. It can be closed with ✕.
- **Profile → Device → Notifications** (Settings → Device for admin) has a switch to turn them on or off any time. If they were blocked, it says how to allow them again.
- Notifications belong to the phone and the person: signing out stops that phone getting that person's notifications.

## One phone, one person
Notifications belong to the phone, and go to whoever is signed in on it now. If someone else signs in on the same phone (or app), the phone moves to them, so it never keeps getting the previous account's notifications. Signing out stops them altogether.

## Why it's here
This is the whole point of being an app rather than a website.

## How it works (free)
Standard web push. When something happens, the database calls a small server function (the **send-push** Edge Function), which delivers the notification. No Firebase and no app store. The keys live in Supabase Vault, and only the database knows the secret that lets it ask send-push to buzz phones. Phones that uninstalled the app are forgotten automatically.

## Limits
- **iPhone:** only works once the app is on the home screen ([[Install the app]]), on iOS 16.4 or newer.
- People must tap "Allow" when asked.

Related: [[Tech stack]]
