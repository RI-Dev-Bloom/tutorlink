/* A student's own attendance: every module they take now shows a lectures line from day one, not
   only after their first lecture check-in, so a missed lecture shows as 0/3 straight away.
   Tutorials and lectures stay counted apart.
   "Held" for lectures: every lecture run for the module this semester. Once they've been to one,
   only lectures by the lecturer(s) they go to count, so a module with two class groups (two
   lecturers) never marks them absent from the other group's lectures. Tutorials as before: only
   sessions by the tutor(s) they go to. */

create or replace function public.my_attendance()
returns table (module_code text, module_name text, kind text, attended int, held int, last_at timestamptz)
language sql stable security definer set search_path = '' as $$
  with me as (select (select auth.uid()) as id),
  sem as (
    select id from public.semesters
    where starts_on <= (now() at time zone 'Africa/Johannesburg')::date
    order by starts_on desc limit 1),
  rows as (
    select sm.module_code, k.kind from public.student_modules sm
      cross join (values ('tutorial'::text), ('lecture'::text)) k(kind)
      where sm.student_id = (select id from me)
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
