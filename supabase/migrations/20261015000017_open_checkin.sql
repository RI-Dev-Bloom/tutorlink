-- TutorLink — the tutor's open check-in, if any (so the Schedule tab can show "Check-in open").

create function public.tutor_open_checkin() returns uuid
language sql stable security definer set search_path = '' as $$
  select c.session_id from public.checkins c join public.sessions s on s.id = c.session_id
  where s.tutor_id = (select auth.uid()) and c.closes_at > now()
  order by c.opens_at desc limit 1
$$;

revoke execute on function public.tutor_open_checkin() from public, anon;
grant execute on function public.tutor_open_checkin() to authenticated;
