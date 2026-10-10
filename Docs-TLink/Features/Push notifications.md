---
status: v1
---

# Push notifications

**In short:** your phone buzzes even when the app is closed.

## What sends a notification
- A new message.
- Your application was approved or declined.
- A session you logged was confirmed or paid.
- Later: tutor announcements and quiz invites.

Tapping the notification opens the right screen.

## Why it's here
This is the whole point of being an app rather than a website.

## How it works (free)
Standard web push. When something happens in the database, a small server function (a Supabase Edge Function) sends the notification. No Firebase and no app store.

## Limits
- **iPhone:** only works once the app is on the home screen ([[Install the app]]), on iOS 16.4 or newer.
- People must tap "Allow" when asked.

Related: [[Tech stack]]
