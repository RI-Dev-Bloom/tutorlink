-- TutorLink — two fixes found in testing (15 Oct 2026)
--
-- 1. Notifications follow whoever is signed in on a phone. A phone can only be subscribed once
--    (one endpoint). When someone else signs in on it, the rules used to stop them taking the
--    phone over, so it kept getting the previous account's notifications (e.g. admin's).
--    claim_push moves the phone to the person signed in now.
--
-- 2. A student's attendance rate counts the sessions of the tutor(s) they actually go to.
--    A module can have several tutors with separate groups; counting every group's sessions
--    made everyone's rate look low and barely move.

create function public.claim_push(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'Please sign in again'; end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values ((select auth.uid()), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 200))
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, user_agent = excluded.user_agent;
end $$;

revoke execute on function public.claim_push(text, text, text, text) from public, anon;
grant execute on function public.claim_push(text, text, text, text) to authenticated;

create or replace function public.my_attendance()
returns table (module_code text, module_name text, attended int, held int, last_at timestamptz)
language sql stable security definer set search_path = '' as $$
  with me as (select (select auth.uid()) as id),
  sem as (
    select id from public.semesters
    where starts_on <= (now() at time zone 'Africa/Johannesburg')::date
    order by starts_on desc limit 1),
  mods as (
    select module_code from public.student_modules where student_id = (select id from me)
    union
    select s.module_code from public.attendance a join public.sessions s on s.id = a.session_id
    where a.student_id = (select id from me) and s.semester_id = (select id from sem))
  select m.module_code, md.name,
    (select count(*)::int from public.attendance a join public.sessions s on s.id = a.session_id
      where a.student_id = (select id from me) and s.module_code = m.module_code and s.semester_id = (select id from sem)),
    -- Sessions held by the tutor(s) this student goes to for this module.
    (select count(*)::int from public.sessions s
      where s.module_code = m.module_code and s.semester_id = (select id from sem)
        and s.status in ('logged', 'confirmed', 'paid')
        and s.tutor_id in (select s2.tutor_id from public.attendance a2 join public.sessions s2 on s2.id = a2.session_id
                           where a2.student_id = (select id from me) and s2.module_code = m.module_code
                             and s2.semester_id = (select id from sem))),
    (select max(a.checked_in_at) from public.attendance a join public.sessions s on s.id = a.session_id
      where a.student_id = (select id from me) and s.module_code = m.module_code)
  from mods m join public.modules md on md.code = m.module_code
  order by m.module_code
$$;

create or replace function public.attendance_roster(p_semester uuid, p_module text)
returns table (student_number text, full_name text, qualification_code text, attended int, held int, last_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select a.student_number, max(a.full_name), max(a.qualification_code),
    count(distinct a.session_id)::int,
    -- Out of the sessions held by the tutor(s) this student goes to.
    (select count(*)::int from public.sessions s3
      where s3.semester_id = p_semester and s3.module_code = p_module and s3.status in ('logged', 'confirmed', 'paid')
        and s3.tutor_id in (select s4.tutor_id from public.attendance a4 join public.sessions s4 on s4.id = a4.session_id
                            where a4.student_number = a.student_number and s4.semester_id = p_semester and s4.module_code = p_module)),
    max(a.checked_in_at)
  from public.attendance a join public.sessions s on s.id = a.session_id
  where s.semester_id = p_semester and s.module_code = p_module and s.status in ('logged', 'confirmed', 'paid')
  group by a.student_number
  order by 4 desc, 2
$$;
