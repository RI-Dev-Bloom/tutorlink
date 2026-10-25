/* Modules per semester. Rosebank's module codes end in the semester: ...1 (or 3) is the first
   semester, ...2 (or 4) the second, and ...0 / ...9 run the whole year (e.g. PROG5121 Programming 1A
   in semester 1, PROG6112 Programming 1B in semester 2, XISD5319 Work Integrated Learning all year).
   Picking a qualification and year now adds only this semester's modules (plus whole-year ones). */

-- 1 or 2 for a semester module, null for a whole-year one.
create function public.module_term(p_code text) returns smallint
language sql immutable set search_path = '' as $$
  select case right(p_code, 1) when '1' then 1 when '3' then 1 when '2' then 2 when '4' then 2 else null end::smallint
$$;

-- The semester we're in (or the next one between semesters), from its start date: Jan–Jun is 1, Jul–Dec is 2.
create function public.current_term() returns smallint
language sql stable security definer set search_path = '' as $$
  select case when extract(month from coalesce(
    (select starts_on from public.semesters where current_date between starts_on and ends_on order by starts_on desc limit 1),
    (select starts_on from public.semesters where starts_on > current_date order by starts_on limit 1),
    current_date)) <= 6 then 1 else 2 end::smallint
$$;

create or replace function public.set_my_study(p_qualification text, p_year int) returns int
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_n int; v_term smallint := public.current_term();
begin
  if not exists (select 1 from public.profiles where id = v_uid and role = 'student') then
    raise exception 'Only students choose a qualification';
  end if;
  if not exists (select 1 from public.qualifications where code = p_qualification and not hidden) then
    raise exception 'Choose a qualification from the list';
  end if;
  if p_year is null or p_year < 1 or p_year > 4 then raise exception 'Choose your year of study'; end if;
  update public.profiles set qualification_code = p_qualification, study_year = p_year where id = v_uid;
  insert into public.student_modules (student_id, module_code)
    select v_uid, module_code from public.qualification_modules
    where qualification_code = p_qualification and year = p_year and not elective
      and coalesce(public.module_term(module_code), v_term) = v_term
  on conflict do nothing;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

revoke execute on function public.current_term() from public, anon;
grant execute on function public.module_term(text) to authenticated;
grant execute on function public.current_term() to authenticated;

-- Students who signed up before this got their whole year: take off the other semester's modules
-- that came from their own qualification and year (anything they added themselves stays).
delete from public.student_modules sm
using public.profiles p, public.qualification_modules qm
where p.id = sm.student_id and p.role = 'student'
  and qm.qualification_code = p.qualification_code and qm.year = p.study_year and qm.module_code = sm.module_code
  and public.module_term(sm.module_code) is not null
  and public.module_term(sm.module_code) <> public.current_term();
