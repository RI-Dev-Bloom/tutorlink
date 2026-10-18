---
status: v1
---

# Tech stack

| Part | What we use | Why |
|---|---|---|
| App | React + Vite + TypeScript | The best-known stack, so whoever looks after it next can pick it up. |
| Look | The demo's `styles.css`, carried over | The design is already done and approved. |
| Installable / offline | PWA (`vite-plugin-pwa`) | Installs from the browser with no app store, so it costs R0. |
| Hosting | GitHub Pages | Free. Every push to `main` deploys automatically through GitHub Actions. |
| Database, logins, files | Supabase (free tier) | Postgres, email-and-password sign-in, file storage and server functions in one place. |
| Notifications | Web Push, sent from a Supabase Edge Function | Free and standard, with no Firebase needed. |
| Emails | Gmail (tutorlink.ri@gmail.com) as the sender | Free, about 500 a day. Used for confirming new student accounts and password-reset links. |

## Notes
- The app uses `#/` links (hash routing) because GitHub Pages can't handle app-style URLs otherwise.
- We use Supabase's new **publishable key** (`sb_publishable_...`) in the app. It's meant to be public, and security comes from the database rules ([[Database]]). The old "anon" and "service_role" keys are being retired by the end of 2026, so we don't use them.
- The **secret key** (`sb_secret_...`) **never** goes in the app. It only lives inside the Edge Functions.
- In Supabase's **Connect** dialog, we use **Framework → React (Vite)**. We don't use Next.js, because GitHub Pages can't run a server.
