-- TutorLink — check-in tweaks
-- 1. The tutor chooses how long check-in stays open: 5 to 20 minutes (it used to be the whole session).
-- 2. The online code changes every 30 seconds (accepted for up to a minute), so a code forwarded to a
--    friend who isn't in the Teams session is already dead. The tutor shows it by sharing their screen.

-- 4 digits from the session's secret and the 30-second window.
create function public.checkin_pin(p_secret uuid, p_session uuid, p_w bigint) returns text
language sql immutable set search_path = '' as $$
  select lpad(((get_byte(h, 0) * 256 + get_byte(h, 1)) % 10000)::text, 4, '0')
  from (select sha256(convert_to('pin:' || p_secret::text || ':' || p_session::text || ':' || p_w::text, 'UTF8')) as h) x
$$;
revoke execute on function public.checkin_pin(uuid, uuid, bigint) from public, anon, authenticated;

drop function public.tutor_start_checkin(text, text, numeric, text);

create function public.tutor_start_checkin(p_module text, p_venue text, p_hours numeric, p_mode text, p_minutes int default 10)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid   uuid := (select auth.uid());
  v_today date := (now() at time zone 'Africa/Johannesburg')::date;
  v_from  time := date_trunc('minute', (now() at time zone 'Africa/Johannesburg')::time);
  v_to    time;
  v_week  date := date_trunc('week', (now() at time zone 'Africa/Johannesburg'))::date;
  v_id    uuid;
begin
  if not exists (select 1 from public.tutor_modules where tutor_id = v_uid and module_code = p_module) then
    raise exception 'You''re not approved to tutor %', p_module using errcode = '42501';
  end if;
  if p_mode not in ('class', 'online') then raise exception 'Choose in class or online'; end if;
  if p_hours is null or p_hours < 0.5 or p_hours > 8 then raise exception 'A session is between 30 minutes and 8 hours'; end if;
  if p_minutes is null or p_minutes < 5 or p_minutes > 20 then raise exception 'Check-in stays open for 5 to 20 minutes'; end if;
  if exists (select 1 from public.checkins c join public.sessions s on s.id = c.session_id
             where s.tutor_id = v_uid and c.closes_at > now()) then
    raise exception 'You already have a check-in open. Close it first.';
  end if;
  v_to := v_from + make_interval(mins => round(p_hours * 60)::int);

  -- Today's session for this module that already had a check-in: open it again (times stay as they were).
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
  end if;

  insert into public.checkins (session_id, mode, online_code, closes_at)
  values (v_id, p_mode, null, now() + make_interval(mins => p_minutes))
  on conflict (session_id) do update
    set mode = excluded.mode, online_code = null, opens_at = now(), closes_at = excluded.closes_at,
        secret = gen_random_uuid(), display_id = gen_random_uuid();
  return v_id;
end $$;

revoke execute on function public.tutor_start_checkin(text, text, numeric, text, int) from public, anon;
grant execute on function public.tutor_start_checkin(text, text, numeric, text, int) to authenticated;

-- The screen now: in class the QR and 6 letters (every 15 s); online the 4 digits (every 30 s).
create or replace function public.checkin_now(p_session uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_c  public.checkins;
  v_w  bigint := public.checkin_window();
  v_w2 bigint := floor(extract(epoch from now()) / 30)::bigint;
begin
  select * into v_c from public.checkins where session_id = p_session;
  if not found then return jsonb_build_object('open', false); end if;
  return jsonb_build_object(
    'open', v_c.closes_at > now(),
    'mode', v_c.mode,
    'token', case when v_c.mode = 'class' then p_session::text || '.' || v_w || '.' || public.checkin_sig(v_c.secret, p_session, v_w) end,
    'code', case when v_c.mode = 'class' then public.checkin_code6(v_c.secret, p_session, v_w) end,
    'online_code', case when v_c.mode = 'online' then public.checkin_pin(v_c.secret, p_session, v_w2) end,
    'display_id', v_c.display_id,
    'closes_at', v_c.closes_at,
    'count', (select count(*) from public.attendance where session_id = p_session));
end $$;

-- Typed: the changing 4-digit online code, or the 6 letters under the QR in class.
create or replace function public.check_in_code(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_s uuid; v_n int;
  v_now bigint := public.checkin_window();
  v_now2 bigint := floor(extract(epoch from now()) / 30)::bigint;
begin
  if v_code ~ '^[0-9]{4}$' then
    select count(distinct c.session_id), min(c.session_id::text)::uuid into v_n, v_s
      from public.checkins c, generate_series(v_now2 - 1, v_now2) w
     where c.mode = 'online' and c.closes_at > now() and public.checkin_pin(c.secret, c.session_id, w) = v_code;
    if v_n > 1 then raise exception 'Two sessions have that code right now. Wait for the next code and try again.'; end if;
    if v_s is not null then return public.record_attendance(v_s, 'online'); end if;
  elsif length(v_code) = 6 then
    select c.session_id into v_s from public.checkins c, generate_series(v_now - 4, v_now) w
     where c.mode = 'class' and c.closes_at > now() and public.checkin_code6(c.secret, c.session_id, w) = v_code
     limit 1;
    if v_s is not null then return public.record_attendance(v_s, 'code'); end if;
  end if;
  raise exception 'That code isn''t right or has expired. Check the screen and try again.';
end $$;

-- A scanned QR only works for an in-class check-in.
create or replace function public.check_in(p_token text) returns jsonb
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
  if not found or v_c.mode <> 'class' or v_parts[3] is distinct from public.checkin_sig(v_c.secret, v_s, v_w) then
    raise exception 'That isn''t a TutorLink check-in code';
  end if;
  if v_c.closes_at <= now() then raise exception 'Check-in for this session has closed'; end if;
  if v_w < v_now - 6 or v_w > v_now + 1 then raise exception 'That QR code has expired. Scan the one on the screen now.'; end if;
  return public.record_attendance(v_s, 'qr');
end $$;
