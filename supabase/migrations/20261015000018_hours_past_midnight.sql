-- TutorLink — a session that runs past midnight (e.g. 23:30–00:30) is 1 hour, not -23.
-- Generated columns can't be edited in place, so they're dropped and added again (the values are recomputed).

alter table public.sessions drop column amount, drop column hours;

alter table public.sessions
  add column hours numeric(5, 2) generated always as
    (coalesce(round(((extract(epoch from (ends_at - starts_at)) + 86400) % 86400 / 3600.0)::numeric, 2), 1)) stored,
  add column amount numeric(10, 2) generated always as
    (rate * coalesce(round(((extract(epoch from (ends_at - starts_at)) + 86400) % 86400 / 3600.0)::numeric, 2), 1)) stored;
