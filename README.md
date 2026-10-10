# TutorLink

The Rosebank International (Bloemfontein) peer tutoring programme, as an installable web app (PWA).

- **What it does and why:** open `Docs-TLink/` in [Obsidian](https://obsidian.md) and start at `TutorLink.md`.
- **Runs on:** GitHub Pages (the app) + Supabase free tier (database, sign-in, files). Running cost: R0.
- **`demo/`** is the original clickable prototype the design was taken from. It isn't part of the app.

## Working on it

```sh
npm install
cp .env.example .env      # fill in the Supabase URL and publishable key
npm run dev               # http://localhost:5173
npm run test:db           # checks every database rule against a throwaway Postgres
npm run build
```

## Layout

| Path | What |
|---|---|
| `src/` | The app (React + Vite + TypeScript). `src/styles.css` is the design. |
| `src/sw.ts` | Service worker: offline cache and push notifications. |
| `supabase/migrations/` | The database, in order. Business rules (quota, approvals, who can message whom) live here. |
| `supabase/tests/` | `npm run test:db` |
| `.github/workflows/` | `deploy` (every push), `keepalive` (daily), `backup` (weekly). |
| `Docs-TLink/` | Plain-English docs (Obsidian vault). |

## Repository settings the workflows need

| Kind | Name | Value |
|---|---|---|
| Variable | `SUPABASE_URL` | `https://<ref>.supabase.co` |
| Variable | `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` (public by design) |
| Variable | `BACKUP_REPO` | the **private** backup repo, e.g. `owner/tutorlink-backups` |
| Secret | `SUPABASE_DB_URL` | Session pooler connection string |
| Secret | `BACKUP_DEPLOY_KEY` | Private SSH key; its public half is a write deploy key on the backup repo only |

Pages: Settings → Pages → Source: **GitHub Actions**.

## Rules that must never be broken

- The Supabase **secret key** never goes in `src/`, `.env` or any `VITE_` variable. It lives only in Edge Functions.
- Database backups never go in this (public) repo.
