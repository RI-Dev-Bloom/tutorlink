/* A student's own attendance: the Tutorials group only lists modules that have tutoring (a tutor
   approved for it, or a tutorial run this semester), plus any they've been to. Lectures still list
   every module they take, from day one. */

create or replace function public.my_attendance()
returns table (module_code text, module_name text, kind text, attended int, held int, last_at timestamptz)
language sql stable security definer set search_path = '' as $$
  with me as (select (select auth.uid()) as id),
  sem as (
    select id from public.semesters
    where starts_on <= (now() at time zone 'Africa/Johannesburg')::date
    order by starts_on desc limit 1),
  rows as (
    select sm.module_code, 'lecture'::text as kind from public.student_modules sm
      where sm.student_id = (select id from me)
    union
    -- tutorials only where the module has tutoring: a tutor on it, or a tutorial run this semester
    select sm.module_code, 'tutorial'::text from public.student_modules sm
      where sm.student_id = (select id from me)
        and (exists (select 1 from public.tutor_modules tm where tm.module_code = sm.module_code)
             or exists (select 1 from public.sessions s where s.module_code = sm.module_code and s.kind = 'tutorial'
                          and s.semester_id = (select id from sem)))
    union
    select s.module_code, s.kind from public.attendance a join public.sessions s on s.id = a.session_id
    where a.student_id = (select id from me) and s.semester_id = (select id from sem)),
  went as (   -- who ran the sessions they came to, per module and kind
    select distinct s.module_code, s.kind, s.tutor_id from public.attendance a join public.sessions s on s.id = a.session_id
    where a.student_id = (select id from me) and s.semester_id = (select id from sem))
  select r.module_code, md.name, r.kind,
    (select count(*)::int from public.attendance a join public.sessions s on s.id = a.session_id
      where a.student_id = (select id from me) and s.module_code = r.module_code and s.kind = r.kind
        and s.semester_id = (select id from sem)),
    (select count(*)::int from public.sessions s
      where s.module_code = r.module_code and s.kind = r.kind and s.semester_id = (select id from sem)
        and s.status in ('logged', 'confirmed', 'paid')
        and (s.tutor_id in (select w.tutor_id from went w where w.module_code = r.module_code and w.kind = r.kind)
             or (r.kind = 'lecture' and not exists (select 1 from went w where w.module_code = r.module_code and w.kind = 'lecture')))),
    (select max(a.checked_in_at) from public.attendance a join public.sessions s on s.id = a.session_id
      where a.student_id = (select id from me) and s.module_code = r.module_code and s.kind = r.kind)
  from rows r join public.modules md on md.code = r.module_code
  order by r.module_code, r.kind desc
$$;
