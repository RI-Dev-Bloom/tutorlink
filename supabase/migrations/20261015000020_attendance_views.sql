-- TutorLink — attendance views (slice 10)
-- Counts for a semester, per module and per student. They run as the person asking
-- (security invoker), so the usual rules decide what's counted: a lecturer only their
-- modules, a tutor only their own sessions, admin everything.
-- A session "was held" once it's checked in (logged) or confirmed.

create function public.attendance_totals(p_semester uuid)
returns table (sessions int, checkins int, students int)
language sql stable security invoker set search_path = '' as $$
  select count(distinct s.id)::int, count(a.id)::int, count(distinct a.student_number)::int
  from public.sessions s left join public.attendance a on a.session_id = s.id
  where s.semester_id = p_semester and s.status in ('logged', 'confirmed', 'paid')
$$;

create function public.attendance_summary(p_semester uuid)
returns table (module_code text, module_name text, sessions int, checkins int, students int)
language sql stable security invoker set search_path = '' as $$
  select s.module_code, m.name, count(distinct s.id)::int, count(a.id)::int, count(distinct a.student_number)::int
  from public.sessions s
  join public.modules m on m.code = s.module_code
  left join public.attendance a on a.session_id = s.id
  where s.semester_id = p_semester and s.status in ('logged', 'confirmed', 'paid')
  group by s.module_code, m.name
  order by s.module_code
$$;

-- Every student who came to a module this semester, with how many of its sessions they were at.
create function public.attendance_roster(p_semester uuid, p_module text)
returns table (student_number text, full_name text, qualification_code text, attended int, held int, last_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  with held as (
    select count(*)::int as n from public.sessions
    where semester_id = p_semester and module_code = p_module and status in ('logged', 'confirmed', 'paid'))
  select a.student_number, max(a.full_name), max(a.qualification_code),
         count(distinct a.session_id)::int, (select n from held), max(a.checked_in_at)
  from public.attendance a join public.sessions s on s.id = a.session_id
  where s.semester_id = p_semester and s.module_code = p_module and s.status in ('logged', 'confirmed', 'paid')
  group by a.student_number
  order by 4 desc, 2
$$;

revoke execute on function public.attendance_totals(uuid) from public, anon;
revoke execute on function public.attendance_summary(uuid) from public, anon;
revoke execute on function public.attendance_roster(uuid, text) from public, anon;
grant execute on function public.attendance_totals(uuid) to authenticated;
grant execute on function public.attendance_summary(uuid) to authenticated;
grant execute on function public.attendance_roster(uuid, text) to authenticated;
