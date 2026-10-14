---
status: v1
---

# Running costs and upkeep

**It costs R0 a month.** Here's what keeps it that way, and the two traps we've planned around.

## Free limits (plenty for one campus)
- Supabase: 50,000 monthly users, 500 MB database, 1 GB files, 500,000 server function calls.
- GitHub Pages: free for public repos.
- Gmail sending: about 500 emails a day.

## Trap 1: Supabase pauses after 7 days of no use
In the holidays nobody uses it, so it would go to sleep.
**Fix:** a free GitHub Actions job pings it every day.
**Trap within the trap:** GitHub switches off scheduled jobs after 60 days with no changes to the repo. **Fix:** the same job saves a tiny "last ping" file to the repo, which counts as a change.

## Trap 2: the free tier has no backups
**Fix:** a weekly GitHub Actions job (Sundays) copies the whole database into a **separate, private** repo, `RI-Dev-Bloom/tutorlink-backups`. It never goes in the public one, because it contains student records. Working since 10 Oct 2026; checked again on 14 Oct.

## What could ever cost money
Only outgrowing the free limits, which is very unlikely for one campus. Storage stays small: message files are removed after 3–5 days, and attendance is a few small rows per session.
