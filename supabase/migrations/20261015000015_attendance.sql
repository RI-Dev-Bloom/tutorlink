-- TutorLink — attendance (slice 9)
-- Tutors start a check-in; students scan a QR code that changes every 15 seconds (in class)
-- or type a 4-digit code (online, e.g. Teams). Details come from the student's own account,
-- so nobody can type someone else in. Attendance replaces the paper register:
-- admin can only confirm a session with at least `min_attendance` students checked in.
-- Pay is now per hour: a session pays rate × its length.

/* ---------- settings ---------------------------------------- */

comment on column public.settings.rate_per_session is 'Rate per HOUR of tutoring (the column name is from v1)';
alter table public.settings
  add column min_attendance smallint not null default 3 check (min_attendance between 0 and 5);

/* ---------- pay per hour ------------------------------------ */

-- A session's length in hours (1 when it has no times), and what it pays once confirmed.
alter table public.sessions
  add column hours numeric(5, 2) generated always as
    (coalesce(round((extract(epoch from (ends_at - starts_at)) / 3600.0)::numeric, 2), 1)) stored,
  add column amount numeric(10, 2) generated always as
    (rate * coalesce(round((extract(epoch from (ends_at - starts_at)) / 3600.0)::numeric, 2), 1)) stored;

/* ---------- qualifications ---------------------------------- */

create table public.qualifications (
  code       text primary key check (code ~ '^[A-Z][A-Z0-9]{1,9}$'),
  name       text not null check (length(btrim(name)) between 2 and 120),
  hidden     boolean not null default false,
  created_by uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.qualifications enable row level security;

create policy "everyone signed in reads qualifications" on public.qualifications
  for select to authenticated using (true);
create policy "admin manages qualifications" on public.qualifications
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.qualifications (code, name) values ('DISD', 'Diploma in IT: Software Development');

alter table public.profiles add column qualification_code text references public.qualifications (code) on update cascade;

-- Students add a missing qualification; if the code already exists the existing one is used.
create function public.add_qualification(p_code text, p_name text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_code text := upper(btrim(p_code));
begin
  if (select auth.uid()) is null then raise exception 'Please sign in again'; end if;
  if v_code !~ '^[A-Z][A-Z0-9]{1,9}$' then raise exception 'Qualification codes are letters (and digits), e.g. DISD'; end if;
  insert into public.qualifications (code, name) values (v_code, btrim(p_name)) on conflict (code) do nothing;
  return v_code;
end $$;

/* ---------- check-ins and attendance ------------------------ */

-- One check-in per session. Only the functions below read it: the secret makes the QR codes.
create table public.checkins (
  session_id  uuid primary key references public.sessions (id),
  mode        text not null check (mode in ('class', 'online')),
  secret      uuid not null default gen_random_uuid(),
  online_code text check (online_code ~ '^[0-9]{4}$'),
  display_id  uuid not null default gen_random_uuid() unique,
  opens_at    timestamptz not null default now(),
  closes_at   timestamptz not null
);
alter table public.checkins enable row level security;   -- no policies: functions only

-- Who was there. Name, student number and qualification are copied in at check-in,
-- so the record stays right even if a profile changes or a manually-added student has no account.
create table public.attendance (
  id                 uuid primary key default gen_random_uuid(),
  session_id         uuid not null references public.sessions (id),
  student_id         uuid references public.profiles (id),
  student_number     text not null check (student_number ~ '^ST[0-9]{8}$'),
  full_name          text not null check (length(btrim(full_name)) between 2 and 120),
  qualification_code text,
  method             text not null check (method in ('qr', 'code', 'online', 'manual')),
  added_by           uuid references public.profiles (id),
  checked_in_at      timestamptz not null default now(),
  unique (session_id, student_number)
);
create index on public.attendance (student_id);
alter table public.attendance enable row level security;

-- The student, the session's tutor, lecturers of the module, and admin. Changes go through functions.
create policy "student, tutor, lecturer and admin see attendance" on public.attendance
  for select to authenticated
  using (student_id = (select auth.uid()) or public.is_admin()
         or exists (select 1 from public.sessions s where s.id = session_id
                    and (s.tutor_id = (select auth.uid()) or public.teaches(s.module_code))));

-- Keeps the session's "students" figure equal to the number checked in.
create function public.attendance_count() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.sessions set students_attended = (select count(*) from public.attendance where session_id = new.session_id)
   where id = new.session_id;
  return null;
end $$;

create trigger attendance_count after insert on public.attendance
  for each row execute function public.attendance_count();

/* ---------- the rotating codes ------------------------------ */

-- Codes change every 15 seconds. A QR is accepted for 90 seconds, a typed code for 60.
create function public.checkin_window() returns bigint
language sql stable set search_path = '' as $$ select floor(extract(epoch from now()) / 15)::bigint $$;

create function public.checkin_sig(p_secret uuid, p_session uuid, p_w bigint) returns text
language sql immutable set search_path = '' as $$
  select left(encode(sha256(convert_to(p_secret::text || ':' || p_session::text || ':' || p_w::text, 'UTF8')), 'hex'), 12)
$$;

-- 6 characters, no 0/O or 1/I/L, easy to read off a projector.
create function public.checkin_code6(p_secret uuid, p_session uuid, p_w bigint) returns text
language sql immutable set search_path = '' as $$
  select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', (get_byte(h, i) % 31) + 1, 1), '' order by i)
  from (select sha256(convert_to('code:' || p_secret::text || ':' || p_session::text || ':' || p_w::text, 'UTF8')) as h) x,
       generate_series(0, 5) as i
$$;

/* ---------- tutor starts, watches and closes ---------------- */

-- Uses the session planned for this module this week (moved to today), or reopens today's,
-- or adds a new one. Returns the session id.
create function public.tutor_start_checkin(p_module text, p_venue text, p_hours numeric, p_mode text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid   uuid := (select auth.uid());
  v_today date := (now() at time zone 'Africa/Johannesburg')::date;
  v_from  time := date_trunc('minute', (now() at time zone 'Africa/Johannesburg')::time);
  v_to    time;
  v_week  date := date_trunc('week', (now() at time zone 'Africa/Johannesburg'))::date;
  v_id    uuid;
  v_code  text;
begin
  if not exists (select 1 from public.tutor_modules where tutor_id = v_uid and module_code = p_module) then
    raise exception 'You''re not approved to tutor %', p_module using errcode = '42501';
  end if;
  if p_mode not in ('class', 'online') then raise exception 'Choose in class or online'; end if;
  if p_hours is null or p_hours < 0.5 or p_hours > 8 then raise exception 'A session is between 30 minutes and 8 hours'; end if;
  if exists (select 1 from public.checkins c join public.sessions s on s.id = c.session_id
             where s.tutor_id = v_uid and c.closes_at > now()) then
    raise exception 'You already have a check-in open. Close it first.';
  end if;
  v_to := v_from + make_interval(mins => round(p_hours * 60)::int);

  -- Today's session for this module that already had a check-in: reopen it.
  select s.id into v_id from public.sessions s join public.checkins c on c.session_id = s.id
   where s.tutor_id = v_uid and s.module_code = p_module and s.session_date = v_today and s.status = 'logged'
   limit 1;
  if v_id is null then
    -- The one planned for this week, wherever it fell: tutors often move it to another day.
    select id into v_id from public.sessions
     where tutor_id = v_uid and module_code = p_module and status = 'scheduled'
       and session_date between v_week and v_week + 6
     order by (session_date = v_today) desc, abs(session_date - v_today), session_date
     limit 1 for update;
  end if;

  if v_id is not null then
    update public.sessions
       set session_date = v_today, starts_at = v_from, ends_at = v_to,
           venue = coalesce(nullif(btrim(p_venue), ''), venue), status = 'logged'
     where id = v_id;
  else
    insert into public.sessions (tutor_id, module_code, session_date, starts_at, ends_at, venue, status)
    values (v_uid, p_module, v_today, v_from, v_to, btrim(coalesce(p_venue, '')), 'logged')
    returning id into v_id;
  end if;

  if p_mode = 'online' then
    loop
      v_code := lpad(floor(random() * 10000)::int::text, 4, '0');
      exit when not exists (select 1 from public.checkins where online_code = v_code and closes_at > now());
    end loop;
  end if;

  insert into public.checkins (session_id, mode, online_code, closes_at)
  values (v_id, p_mode, v_code, now() + make_interval(mins => round(p_hours * 60)::int + 15))
  on conflict (session_id) do update
    set mode = excluded.mode, online_code = excluded.online_code, opens_at = now(), closes_at = excluded.closes_at,
        secret = gen_random_uuid(), display_id = gen_random_uuid();
  return v_id;
end $$;

-- What the check-in screen shows right now.
create function public.checkin_now(p_session uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_c public.checkins; v_w bigint := public.checkin_window();
begin
  select * into v_c from public.checkins where session_id = p_session;
  if not found then return jsonb_build_object('open', false); end if;
  return jsonb_build_object(
    'open', v_c.closes_at > now(),
    'mode', v_c.mode,
    'token', p_session::text || '.' || v_w || '.' || public.checkin_sig(v_c.secret, p_session, v_w),
    'code', public.checkin_code6(v_c.secret, p_session, v_w),
    'online_code', v_c.online_code,
    'display_id', v_c.display_id,
    'closes_at', v_c.closes_at,
    'count', (select count(*) from public.attendance where session_id = p_session),
    'refresh_ms', ((v_w + 1) * 15000 - floor(extract(epoch from now()) * 1000))::int);
end $$;

create function public.tutor_checkin_live(p_session uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.sessions where id = p_session and (tutor_id = (select auth.uid()) or public.is_admin())) then
    raise exception 'Session not found' using errcode = '42501';
  end if;
  return public.checkin_now(p_session);
end $$;

-- The screen on a laptop or projector, opened from a link: no sign-in, only while it's open.
create function public.checkin_display(p_display uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_s uuid; v_r jsonb;
begin
  select session_id into v_s from public.checkins where display_id = p_display and closes_at > now();
  if v_s is null then return jsonb_build_object('open', false); end if;
  v_r := public.checkin_now(v_s) - 'display_id';
  return v_r || (select jsonb_build_object('module_code', s.module_code, 'module_name', m.name, 'venue', s.venue,
                   'tutor', split_part(p.full_name, ' ', 1))
                 from public.sessions s join public.modules m on m.code = s.module_code
                 join public.profiles p on p.id = s.tutor_id where s.id = v_s);
end $$;

create function public.tutor_close_checkin(p_session uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.sessions where id = p_session and (tutor_id = (select auth.uid()) or public.is_admin())) then
    raise exception 'Session not found' using errcode = '42501';
  end if;
  update public.checkins set closes_at = least(closes_at, now()) where session_id = p_session;
end $$;

/* ---------- students check in ------------------------------- */

create function public.record_attendance(p_session uuid, p_method text) returns jsonb
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
  -- Anyone can come; the module is added to their list so it shows on their progress.
  insert into public.student_modules (student_id, module_code) values (v_p.id, v_s.module_code) on conflict do nothing;

  return (select jsonb_build_object('session_id', s.id, 'module_code', s.module_code, 'module_name', m.name,
            'venue', s.venue, 'tutor', p.full_name, 'already', v_n = 0,
            'checked_in_at', (select checked_in_at from public.attendance where session_id = s.id and student_number = v_p.student_number))
          from public.sessions s join public.modules m on m.code = s.module_code join public.profiles p on p.id = s.tutor_id
          where s.id = p_session);
end $$;

-- Scanned QR: "<session>.<window>.<signature>", usually inside the app link.
create function public.check_in(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_parts text[] := string_to_array(regexp_replace(coalesce(p_token, ''), '^.*[?&]checkin=', ''), '.');
  v_s uuid; v_w bigint; v_c public.checkins; v_now bigint := public.checkin_window();
begin
  begin
    v_s := v_parts[1]::uuid; v_w := v_parts[2]::bigint;
  exception when others then raise exception 'That isn''t a TutorLink check-in code';
  end;
  select * into v_c from public.checkins where session_id = v_s;
  if not found or v_parts[3] is distinct from public.checkin_sig(v_c.secret, v_s, v_w) then
    raise exception 'That isn''t a TutorLink check-in code';
  end if;
  if v_c.closes_at <= now() then raise exception 'Check-in for this session has closed'; end if;
  if v_w < v_now - 6 or v_w > v_now + 1 then raise exception 'That QR code has expired. Scan the one on the screen now.'; end if;
  return public.record_attendance(v_s, 'qr');
end $$;

-- Typed: the 4-digit online code, or the 6-character code under the QR.
create function public.check_in_code(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')); v_s uuid; v_now bigint := public.checkin_window();
begin
  if v_code ~ '^[0-9]{4}$' then
    select session_id into v_s from public.checkins where online_code = v_code and mode = 'online' and closes_at > now();
    if v_s is not null then return public.record_attendance(v_s, 'online'); end if;
  elsif length(v_code) = 6 then
    select c.session_id into v_s from public.checkins c, generate_series(v_now - 4, v_now) w
     where c.mode = 'class' and c.closes_at > now() and public.checkin_code6(c.secret, c.session_id, w) = v_code
     limit 1;
    if v_s is not null then return public.record_attendance(v_s, 'code'); end if;
  end if;
  raise exception 'That code isn''t right or has expired. Check the screen and try again.';
end $$;

/* ---------- tutor adds someone by hand ---------------------- */

create function public.tutor_add_attendance(p_session uuid, p_student_number text, p_full_name text, p_qualification text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_s   public.sessions;
  v_num text := upper(btrim(coalesce(p_student_number, '')));
  v_p   public.profiles;
begin
  select * into v_s from public.sessions where id = p_session for update;
  if not found or (v_s.tutor_id <> (select auth.uid()) and not public.is_admin()) then
    raise exception 'Session not found' using errcode = '42501';
  end if;
  if v_s.status not in ('scheduled', 'logged') then raise exception 'This session is already confirmed'; end if;
  if v_s.session_date > (now() at time zone 'Africa/Johannesburg')::date then raise exception 'You can''t take attendance before the session'; end if;
  if v_num !~ '^ST[0-9]{8}$' then raise exception 'Student numbers look like ST12345678'; end if;

  select * into v_p from public.profiles where student_number = v_num;
  if v_p.id = v_s.tutor_id then raise exception 'You can''t add yourself'; end if;
  if v_p.id is null and length(btrim(coalesce(p_full_name, ''))) < 2 then raise exception 'Add their name and surname'; end if;

  insert into public.attendance (session_id, student_id, student_number, full_name, qualification_code, method, added_by)
  values (p_session, v_p.id, v_num, coalesce(v_p.full_name, btrim(p_full_name)),
          coalesce(v_p.qualification_code, nullif(upper(btrim(p_qualification)), '')), 'manual', (select auth.uid()))
  on conflict (session_id, student_number) do nothing;
  if not found then raise exception '% is already on the list', v_num; end if;
  if v_p.id is not null then
    insert into public.student_modules (student_id, module_code) values (v_p.id, v_s.module_code) on conflict do nothing;
  end if;
  if v_s.status = 'scheduled' then update public.sessions set status = 'logged' where id = p_session; end if;
end $$;

/* ---------- confirming needs enough students ---------------- */

-- As before, plus: a session can only be confirmed with at least the minimum checked in.
-- (Admin adding a one-off session that's confirmed straight away is still allowed.)
create or replace function public.session_status_flow() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_min smallint; v_n int;
begin
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

/* ---------- the student's own progress ---------------------- */

-- Per module this semester: sessions held so far, and how many the student was at.
create function public.my_attendance()
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
    (select count(*)::int from public.sessions s
      where s.module_code = m.module_code and s.semester_id = (select id from sem)
        and s.status in ('logged', 'confirmed', 'paid')),
    (select max(a.checked_in_at) from public.attendance a join public.sessions s on s.id = a.session_id
      where a.student_id = (select id from me) and s.module_code = m.module_code)
  from mods m join public.modules md on md.code = m.module_code
  order by m.module_code
$$;

/* ---------- who may call what ------------------------------- */

revoke execute on function public.checkin_window() from public, anon, authenticated;
revoke execute on function public.checkin_sig(uuid, uuid, bigint) from public, anon, authenticated;
revoke execute on function public.checkin_code6(uuid, uuid, bigint) from public, anon, authenticated;
revoke execute on function public.checkin_now(uuid) from public, anon, authenticated;
revoke execute on function public.record_attendance(uuid, text) from public, anon, authenticated;
revoke execute on function public.tutor_start_checkin(text, text, numeric, text) from public, anon;
revoke execute on function public.tutor_checkin_live(uuid) from public, anon;
revoke execute on function public.tutor_close_checkin(uuid) from public, anon;
revoke execute on function public.tutor_add_attendance(uuid, text, text, text) from public, anon;
revoke execute on function public.check_in(text) from public, anon;
revoke execute on function public.check_in_code(text) from public, anon;
revoke execute on function public.my_attendance() from public, anon;
revoke execute on function public.add_qualification(text, text) from public, anon;
grant execute on function public.tutor_start_checkin(text, text, numeric, text) to authenticated;
grant execute on function public.tutor_checkin_live(uuid) to authenticated;
grant execute on function public.tutor_close_checkin(uuid) to authenticated;
grant execute on function public.tutor_add_attendance(uuid, text, text, text) to authenticated;
grant execute on function public.check_in(text) to authenticated;
grant execute on function public.check_in_code(text) to authenticated;
grant execute on function public.my_attendance() to authenticated;
grant execute on function public.add_qualification(text, text) to authenticated;
-- The projector screen works without signing in, but only shows a check-in that's open.
grant execute on function public.checkin_display(uuid) to anon, authenticated;
