# TutorLink Phase 2: What the mobile app adds

A plain explanation of everything that is new in the mobile app compared to the original web system, and why the design looks the way it does.

---

## 1. Quick recap of what we already had

The original TutorLink is a web app built in React 18, Tailwind and Supabase. It runs the peer tutoring programme through three portals, all reached from one landing page:

- **Apply to Tutor.** A student logs in, uploads their Academic Statement of Results, picks the modules they want to tutor, and submits.
- **Admin Portal.** One admin reviews those applications, checks the marks against the minimum average, approves or declines, manages tutors and configures the programme settings.
- **Tutor Portal.** An approved tutor sees their sessions, their attendance and what they are owed.

It works, but it is a browser app. Everyone has to go and open it. Nothing reaches you, and there is no way for the three groups to actually talk to each other inside the system. Every conversation still happens over email or in a corridor.

That is the gap Phase 2 fills.

---

## 2. The three big changes

### 2.1 There is now a lecturer

This is the biggest structural change. The original system had three user types: student, tutor, admin. The mobile app has three too, but they are not the same three.

**Lecturer is new.** A lecturer registers, selects the modules they teach, and their dashboard immediately fills with the tutors assigned to those modules. Nothing else. They do not see the whole programme, they do not see applications, they only see the people teaching their subject.

The reasoning is simple. The lecturer is the person who actually knows what the students are struggling with this week, and they were completely outside the system before. The tutor was getting their direction from nobody, or from a forwarded email. Now the person closest to the content can reach the tutor directly.

### 2.2 The student falls away on mobile

Students do not get a mobile app. Applying to tutor happens once, it involves uploading a PDF of your results, and it is genuinely better on a laptop. Building a mobile application flow would be a lot of work for something a person does a single time in their degree.

So the split is:

| | Web app | Mobile app |
|---|---|---|
| Student applying | Yes | No |
| Tutor | Yes | Yes |
| Lecturer | No | Yes |
| Admin | Yes | Yes |

Admin exists in both. They still need to review applications, and now they also need to be reachable on their phone.

### 2.3 Messaging between tutor, lecturer and admin

This is the feature the whole mobile app is built around. Three groups who all work on the same programme, who previously had no way to talk to each other inside the system.

**How the lecturer sends a message.** The lecturer opens their dashboard, sees their tutors, taps a name, and the conversation with that tutor opens. They tap New message, give it a topic and a body, and send.

**How the tutor receives it.** There is a mail icon in the top left of the tutor's screen with an unread count on it. Tapping it opens the message list. Every message shows who sent it, whether that person is a Lecturer or an Admin, the topic, and how long ago it arrived. Tapping a message expands it to show the full text and the exact date and time.

**How admin fits in.** Admin can message any tutor through the same threads. From the tutor's side an admin message looks the same as a lecturer message, except the role tag says Admin instead of Lecturer. That distinction matters, because a message from admin about your contract carries different weight to a message from your lecturer about Thursday's session.

---

## 3. Why the messages look like a timeline

Normal chat bubbles were the obvious choice and they are the wrong one here.

Chat bubbles are built for short back and forth conversation. That is not what this is. These messages are short briefings that arrive maybe twice a week: a venue change, what to focus on in the next session, a payment confirmation, a document that is missing. They are closer to notices than to conversation.

So instead of bubbles, each thread is a vertical timeline. A thin line runs down the left, with a dot for every message. You see the topic and the timestamp. If it matters to you, tap it and it expands to the full text.

The dots carry meaning rather than just being decoration:

- **Hollow with a grey ring.** A message you have already read.
- **Solid blue.** A message you sent.
- **Gold and slightly larger.** Unread. It is the only place gold appears in the message list, so your eye goes straight to it.

The dot also grows a little when you open an entry, so you always know where you are in the thread.

This means a lecturer can scan two months of a tutor relationship in one screen without reading a single word of the actual messages. That is not something a chat interface can do.

---

## 4. The design language

The brief was clean, minimal, blue and white with a subtle gold accent, no emojis, and it should feel like a proper iOS app. Here is what that turned into.

### Colours

| Name | Hex | Where it is used |
|---|---|---|
| Ink | `#0B1B33` | All primary text |
| Blue | `#1A4FD6` | Actions, active states, anything tappable |
| Blue tint | `#EEF3FF` | Icon backgrounds, avatars, admin role tags |
| Gold | `#B8912F` | Unread markers, lecturer tags, the money figure, the Lecturer card |
| Surface | `#F5F7FB` | Input fields, pressed states |
| Line | `#E4E9F2` | Hairline borders |

Gold is deliberately rationed. It appears in about five places in the entire app. The moment you use it for six things it stops meaning anything, and it starts to look like a bank app from 2014. Right now, gold means "this needs your attention" or "this is a lecturer", and nothing else.

### Typography

The app uses the system font stack, which means it renders in SF Pro on an iPhone and Roboto on Android. No web fonts, nothing to download, and it will always match whatever the operating system is doing.

Headings use tight negative letter spacing, around minus 3 percent, which is the thing that makes iOS headings look like iOS headings rather than a website. Timestamps, module codes and small labels use a monospace face so numbers line up in columns and codes like PROG6112 read as codes rather than as words.

### Structure

Every screen follows the same three part shape: a translucent header with a blurred background, a scrolling body, and a tab bar at the bottom. The header and tab bar both use backdrop blur, so content slides underneath them instead of disappearing behind a solid block.

Content sits in rounded cards with hairline dividers between rows. There are no drop shadows anywhere except on the floating action button and the phone frame itself, because heavy shadows are the fastest way to make a clean app look cheap.

### No emojis

There are none anywhere. Every icon in the app is a hand written SVG at a consistent 1.7 pixel stroke weight, drawn on the same grid. Emojis render differently on every platform, they carry no consistent meaning, and they immediately make an academic system feel like a toy.

---

## 5. The motion

This is what separates a web page that runs on a phone from something that feels like an app.

**Screen transitions.** Pushing to a new screen slides it in from the right while the screen behind it slides 24 percent to the left and dims slightly. That is exactly what iOS does, and it tells you visually that you have gone one level deeper. The easing curve is `cubic-bezier(.32, .72, 0, 1)`, which is the closest CSS approximation of the Apple navigation curve.

**Swipe to go back.** Start a drag from the left edge of the screen and it goes back, the same as any native app. The button is there too, but nobody uses it once they know the gesture works.

**Tap feedback.** Everything tappable scales down slightly when you press it, using a spring curve that overshoots a little on release. It is a small thing but it is the difference between a button feeling like a button and feeling like a link.

**The sheet.** New message slides up from the bottom over a dimmed and blurred background, and you can drag it down to dismiss it. Drag past about 90 pixels and it closes.

**Lists.** Items fade up in sequence when a screen loads rather than all appearing at once. It is subtle, roughly 50 milliseconds between items, but it makes the screen feel like it is assembling rather than just flashing into existence.

**Reduced motion.** If the phone has reduce motion switched on, every animation drops to almost zero duration. The app still works exactly the same, it just stops moving.

### About the haptics

Every meaningful action fires a vibration through `navigator.vibrate`, with the duration varying by weight. A tab switch is 6 milliseconds, sending a message is 14, an approval is 16, and an error is a longer 24 millisecond buzz.

**This works properly on Android.** Chrome on Android supports the Vibration API, so the demo has real haptics there today.

**It does not work on iOS Safari.** Apple has never supported the Vibration API on the web, and the switch element workaround that used to trigger haptics was closed in iOS 26.5. There is currently no way to fire haptics from a web page on an iPhone. The code is written so that it silently does nothing rather than breaking.

This is one of the strongest arguments for going native. In React Native you get `expo-haptics`, which gives you the actual Taptic Engine on iOS with proper impact styles and notification feedback. That single feature makes a noticeable difference to how expensive the app feels.

---

## 6. What this means for the backend

The web app's database mostly carries over. Here is what needs to be added.

**A lecturers table.** Lecturers were not a user type before, so they need their own records with a role on the account.

**A lecturer to module join table.** This is what powers the whole dashboard. When a lecturer picks their modules at registration, those rows are what decides which tutors they can see and message. It is a many to many relationship, because one lecturer can teach several modules and one module can have more than one lecturer.

**A messages table.** Sender, recipient, sender role, topic, body, and a timestamp. Threads are just messages grouped by the tutor they involve, so there is no separate conversation table needed at this scale.

**A read receipts approach.** Simplest version is a read boolean and a read timestamp on each message. That is what drives the unread badge and the gold dots.

**Row Level Security policies.** This is the part that needs the most care. A lecturer must only be able to read and write messages for tutors on modules they actually teach. If the RLS policy is loose, any lecturer can message any tutor in the college. The policy has to join through the lecturer to module table on every query.

**Push notifications.** The whole point of a mobile app is that messages reach people. Firebase Cloud Messaging sends the push, triggered by a Supabase Edge Function that fires when a message row is inserted.

---

## 7. What is still missing

The demo covers the flows but a few things are deliberately not built yet:

- **Replies.** Right now a tutor reads a message but cannot respond in the thread. Worth deciding whether that should exist at all, since some notices are meant to be one directional.
- **Broadcast messages.** Sending one message to every tutor on a module at once, instead of tapping each name. Admin will want this immediately.
- **Attachments.** A lecturer sharing a worksheet or a marking guide inside a message.
- **Real notification handling.** Deep linking a push notification straight into the right thread.
- **Lecturer approval of tutors.** At the moment only admin approves applications. There is an argument that the lecturer should sign off on tutors for their own module before admin makes it final.

---

## 8. Next step

Port the demo to React Native with Expo. Everything in the HTML file maps across cleanly:

| Demo | React Native |
|---|---|
| Screen push transitions | React Navigation native stack |
| Edge swipe back | Built into React Navigation |
| Spring tap feedback | Reanimated with `withSpring` |
| Bottom sheet with drag | `@gorhom/bottom-sheet` |
| `navigator.vibrate` | `expo-haptics`, real Taptic Engine on iOS |
| System font stack | Automatic, San Francisco and Roboto |
| SVG icons | `react-native-svg`, same paths, no changes |
| Blurred headers | `expo-blur` |

The design tokens, the layout, the timeline structure and the copy all carry over as they are. The demo is the specification.
