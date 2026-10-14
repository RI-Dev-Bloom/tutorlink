-- TutorLink — lecture check-ins, and a title and topic on every session
--
-- Lecturers run check-ins in their own lectures, for any module they teach, without a
-- slot from admin. A lecture is a session of kind 'lecture' run by the lecturer (sessions.tutor_id
-- holds whoever runs it). Lectures are never paid, confirmed or counted against a limit.
-- Every check-in now says what the session was: a title (Revision, Introduction…) and a topic.

alter table public.sessions
  add column kind  text not null default 'tutorial' check (kind in ('tutorial', 'lecture')),
  add column title text check (length(btrim(title)) between 2 and 60),
  add column topic text check (length(btrim(topic)) between 2 and 120);
create index sessions_kind_idx on public.sessions (kind);

-- Lectures don't count towards any limit.
create or replace function public.enforce_quota() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_used int; v_quota int;
begin
  if new.status = 'cancelled' or new.kind = 'lecture' then return new; end if;
  if tg_op = 'UPDATE'
     and old.status <> 'cancelled'
     and old.tutor_id = new.tutor_id
     and old.semester_id = new.semester_id then
    return new;  -- already counted
  end if;

  perform 1 from public.profiles where id = new.tutor_id for update;
  select count(*) into v_used from public.sessions
   where tutor_id = new.tutor_id and semester_id = new.semester_id
     and status <> 'cancelled' and kind = 'tutorial' and id <> new.id;
  v_quota := public.tutor_quota(new.tutor_id, new.semester_id);

  if v_used >= v_quota then
    raise exception 'Session quota reached (% of %)', v_used, v_quota using errcode = 'TL429';
  end if;
  return new;
end $$;

-- As before, plus: lectures are never confirmed or paid.
create or replace function public.session_status_flow() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_min smallint; v_n int;
begin
  if new.kind = 'lecture' and new.status in ('confirmed', 'paid') then
    raise exception 'Lectures aren''t confirmed or paid, only tutoring sessions are';
  end if;
  if tg_op = 'INSERT' and new.status = 'paid' then
    raise exception 'Add the session first, then mark it paid';
  end if;
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if old.status = 'paid' then
      raise exception 'A paid session can''t be changed';
    end if;
    if new.status = 'paid' and old.status <> 'confirmed' then
      raise exception 'Confirm the session before marking it paid';
    end if;
    if new.status = 'confirmed' then
      select min_attendance into v_min from public.settings;
      select count(*) into v_n from public.attendance where session_id = new.id;
      if v_n < v_min then
        raise exception 'This session needs at least % students checked in to count (it has %)', v_min, v_n;
      end if;
    end if;
  end if;

  if new.status = 'logged' and (tg_op = 'INSERT' or old.status <> 'logged') then
    new.logged_at := now();
  end if;
  if new.status = 'confirmed' and (tg_op = 'INSERT' or old.status <> 'confirmed') then
    new.rate := (select rate_per_session from public.settings);
    new.confirmed_by := (select auth.uid());
    new.confirmed_at := now();
  end if;
  if tg_op = 'UPDATE' and new.status = 'paid' and old.status <> 'paid' then
    new.paid_at := now();
  end if;
  return new;
end $$;

/* ---------- one way to start a check-in, for tutors and lecturers ---------- */

create function public.start_checkin(
  p_module text, p_title text, p_topic text, p_venue text, p_hours numeric, p_mode text, p_minutes int default 10
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid   uuid := (select auth.uid());
  v_kind  text;
  v_today date := (now() at time zone 'Africa/Johannesburg')::date;
  v_from  time := date_trunc('minute', (now() at time zone 'Africa/Johannesburg')::time);
  v_to    time;
  v_week  date := date_trunc('week', (now() at time zone 'Africa/Johannesburg'))::date;
  v_id    uuid;
begin
  if exists (select 1 from public.tutor_modules where tutor_id = v_uid and module_code = p_module) then v_kind := 'tutorial';
  elsif exists (select 1 from public.lecturer_modules where lecturer_id = v_uid and module_code = p_module) then v_kind := 'lecture';
  else raise exception 'You don''t teach or tutor %', p_module using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_title, ''))) < 2 then raise exception 'Give the session a title, e.g. Revision'; end if;
  if length(btrim(coalesce(p_topic, ''))) < 2 then raise exception 'Say what the session is about'; end if;
  if p_mode not in ('class', 'online') then raise exception 'Choose in class or online'; end if;
  if p_hours is null or p_hours < 0.5 or p_hours > 8 then raise exception 'A session is between 30 minutes and 8 hours'; end if;
  if p_minutes is null or p_minutes < 5 or p_minutes > 20 then raise exception 'Check-in stays open for 5 to 20 minutes'; end if;
  if exists (select 1 from public.checkins c join public.sessions s on s.id = c.session_id
             where s.tutor_id = v_uid and c.closes_at > now()) then
    raise exception 'You already have a check-in open. Close it first.';
  end if;
  v_to := v_from + make_interval(mins => round(p_hours * 60)::int);

  -- Today's session for this module that already had a check-in: open it again.
  select s.id into v_id from public.sessions s join public.checkins c on c.session_id = s.id
   where s.tutor_id = v_uid and s.module_code = p_module and s.kind = v_kind
     and s.session_date = v_today and s.status = 'logged'
   limit 1;
  if v_id is not null then
    update public.sessions set title = btrim(p_title), topic = btrim(p_topic) where id = v_id;
  else
    if v_kind = 'tutorial' then
      -- The tutorial planned for this week, wherever it fell: tutors often move it to another day.
      select id into v_id from public.sessions
       where tutor_id = v_uid and module_code = p_module and kind = 'tutorial' and status = 'scheduled'
         and session_date between v_week and v_week + 6
       order by (session_date = v_today) desc, abs(session_date - v_today), session_date
       limit 1 for update;
    end if;
    if v_id is not null then
      update public.sessions
         set session_date = v_today, starts_at = v_from, ends_at = v_to, status = 'logged',
             venue = coalesce(nullif(btrim(p_venue), ''), venue), title = btrim(p_title), topic = btrim(p_topic)
       where id = v_id;
    else
      insert into public.sessions (tutor_id, module_code, session_date, starts_at, ends_at, venue, status, kind, title, topic)
      values (v_uid, p_module, v_today, v_from, v_to, btrim(coalesce(p_venue, '')), 'logged', v_kind, btrim(p_title), btrim(p_topic))
      returning id into v_id;
    end if;
  end if;

  insert into public.checkins (session_id, mode, online_code, closes_at)
  values (v_id, p_mode, null, now() + make_interval(mins => p_minutes))
  on conflict (session_id) do update
    set mode = excluded.mode, online_code = null, opens_at = now(), closes_at = excluded.closes_at,
        secret = gen_random_uuid(), display_id = gen_random_uuid();
  return v_id;
end $$;

revoke execute on function public.start_checkin(text, text, text, text, numeric, text, int) from public, anon;
grant execute on function public.start_checkin(text, text, text, text, numeric, text, int) to authenticated;

-- The older entry point, kept for anything still calling it.
create or replace function public.tutor_start_checkin(p_module text, p_venue text, p_hours numeric, p_mode text, p_minutes int default 10)
returns uuid
language sql security definer set search_path = '' as $$
  select public.start_checkin(p_module, 'Tutorial', 'General', p_venue, p_hours, p_mode, p_minutes)
$$;

/* ---------- show the title and topic where a check-in is seen ---------- */

create or replace function public.checkin_display(p_display uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_s uuid; v_r jsonb;
begin
  select session_id into v_s from public.checkins where display_id = p_display and closes_at > now();
  if v_s is null then return jsonb_build_object('open', false); end if;
  v_r := public.checkin_now(v_s) - 'display_id';
  return v_r || (select jsonb_build_object('module_code', s.module_code, 'module_name', m.name, 'venue', s.venue,
                   'tutor', split_part(p.full_name, ' ', 1), 'title', s.title, 'topic', s.topic, 'kind', s.kind)
                 from public.sessions s join public.modules m on m.code = s.module_code
                 join public.profiles p on p.id = s.tutor_id where s.id = v_s);
end $$;

create or replace function public.record_attendance(p_session uuid, p_method text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_p public.profiles; v_s public.sessions; v_n int;
begin
  select * into v_p from public.profiles where id = (select auth.uid());
  if not found or v_p.role <> 'student' then raise exception 'Only students check in to sessions'; end if;
  if v_p.student_number is null then raise exception 'Add your student number first'; end if;
  select * into v_s from public.sessions where id = p_session;
  if v_s.tutor_id = v_p.id then raise exception 'You can''t check in to your own session'; end if;
  if v_p.qualification_code is null then raise exception 'Choose your qualification first' using errcode = 'TLQ01'; end if;

  insert into public.attendance (session_id, student_id, student_number, full_name, qualification_code, method)
  values (p_session, v_p.id, v_p.student_number, v_p.full_name, v_p.qualification_code, p_method)
  on conflict (session_id, student_number) do nothing;
  get diagnostics v_n = row_count;
  insert into public.student_modules (student_id, module_code) values (v_p.id, v_s.module_code) on conflict do nothing;

  return (select jsonb_build_object('session_id', s.id, 'module_code', s.module_code, 'module_name', m.name,
            'venue', s.venue, 'tutor', btrim(coalesce(nullif(p.title, '') || ' ', '') || p.full_name), 'already', v_n = 0,
            'title', s.title, 'topic', s.topic, 'kind', s.kind,
            'checked_in_at', (select checked_in_at from public.attendance where session_id = s.id and student_number = v_p.student_number))
          from public.sessions s join public.modules m on m.code = s.module_code join public.profiles p on p.id = s.tutor_id
          where s.id = p_session);
end $$;

/* ---------- attendance views: tutorials and lectures counted separately ---------- */

drop function public.attendance_totals(uuid);
drop function public.attendance_summary(uuid);
drop function public.attendance_roster(uuid, text);
drop function public.my_attendance();

create function public.attendance_totals(p_semester uuid, p_kind text default 'tutorial')
returns table (sessions int, checkins int, students int)
language sql stable security invoker set search_path = '' as $$
  select count(distinct s.id)::int, count(a.id)::int, count(distinct a.student_number)::int
  from public.sessions s left join public.attendance a on a.session_id = s.id
  where s.semester_id = p_semester and s.kind = p_kind and s.status in ('logged', 'confirmed', 'paid')
$$;

create function public.attendance_summary(p_semester uuid, p_kind text default 'tutorial')
returns table (module_code text, module_name text, sessions int, checkins int, students int)
language sql stable security invoker set search_path = '' as $$
  select s.module_code, m.name, count(distinct s.id)::int, count(a.id)::int, count(distinct a.student_number)::int
  from public.sessions s
  join public.modules m on m.code = s.module_code
  left join public.attendance a on a.session_id = s.id
  where s.semester_id = p_semester and s.kind = p_kind and s.status in ('logged', 'confirmed', 'paid')
  group by s.module_code, m.name
  order by s.module_code
$$;

create function public.attendance_roster(p_semester uuid, p_module text, p_kind text default 'tutorial')
returns table (student_number text, full_name text, qualification_code text, attended int, held int, last_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select a.student_number, max(a.full_name), max(a.qualification_code),
    count(distinct a.session_id)::int,
    -- Out of the sessions run by the tutor(s) or lecturer(s) this student goes to.
    (select count(*)::int from public.sessions s3
      where s3.semester_id = p_semester and s3.module_code = p_module and s3.kind = p_kind
        and s3.status in ('logged', 'confirmed', 'paid')
        and s3.tutor_id in (select s4.tutor_id from public.attendance a4 join public.sessions s4 on s4.id = a4.session_id
                            where a4.student_number = a.student_number and s4.semester_id = p_semester
                              and s4.module_code = p_module and s4.kind = p_kind)),
    max(a.checked_in_at)
  from public.attendance a join public.sessions s on s.id = a.session_id
  where s.semester_id = p_semester and s.module_code = p_module and s.kind = p_kind
    and s.status in ('logged', 'confirmed', 'paid')
  group by a.student_number
  order by 4 desc, 2
$$;

-- A student's own attendance, per module and per kind (tutorials, lectures).
create function public.my_attendance()
returns table (module_code text, module_name text, kind text, attended int, held int, last_at timestamptz)
language sql stable security definer set search_path = '' as $$
  with me as (select (select auth.uid()) as id),
  sem as (
    select id from public.semesters
    where starts_on <= (now() at time zone 'Africa/Johannesburg')::date
    order by starts_on desc limit 1),
  rows as (
    select module_code, 'tutorial'::text as kind from public.student_modules where student_id = (select id from me)
    union
    select s.module_code, s.kind from public.attendance a join public.sessions s on s.id = a.session_id
    where a.student_id = (select id from me) and s.semester_id = (select id from sem))
  select r.module_code, md.name, r.kind,
    (select count(*)::int from public.attendance a join public.sessions s on s.id = a.session_id
      where a.student_id = (select id from me) and s.module_code = r.module_code and s.kind = r.kind
        and s.semester_id = (select id from sem)),
    (select count(*)::int from public.sessions s
      where s.module_code = r.module_code and s.kind = r.kind and s.semester_id = (select id from sem)
        and s.status in ('logged', 'confirmed', 'paid')
        and s.tutor_id in (select s2.tutor_id from public.attendance a2 join public.sessions s2 on s2.id = a2.session_id
                           where a2.student_id = (select id from me) and s2.module_code = r.module_code
                             and s2.kind = r.kind and s2.semester_id = (select id from sem))),
    (select max(a.checked_in_at) from public.attendance a join public.sessions s on s.id = a.session_id
      where a.student_id = (select id from me) and s.module_code = r.module_code and s.kind = r.kind)
  from rows r join public.modules md on md.code = r.module_code
  order by r.module_code, r.kind desc
$$;

revoke execute on function public.attendance_totals(uuid, text) from public, anon;
revoke execute on function public.attendance_summary(uuid, text) from public, anon;
revoke execute on function public.attendance_roster(uuid, text, text) from public, anon;
revoke execute on function public.my_attendance() from public, anon;
grant execute on function public.attendance_totals(uuid, text) to authenticated;
grant execute on function public.attendance_summary(uuid, text) to authenticated;
grant execute on function public.attendance_roster(uuid, text, text) to authenticated;
grant execute on function public.my_attendance() to authenticated;
