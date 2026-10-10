-- TutorLink — helper functions, triggers and RPCs
-- Business rules live here so they hold no matter which screen (or script) calls them.

/* ---------- who is asking --------------------------------- */

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin')
$$;

create function public.is_tutor() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and is_tutor)
$$;

-- Does the current user (a lecturer) teach this module?
create function public.teaches(p_module text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.lecturer_modules
                 where lecturer_id = (select auth.uid()) and module_code = p_module)
$$;

create function public.shares_module(p_lecturer uuid, p_tutor uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.lecturer_modules lm
    join public.tutor_modules tm on tm.module_code = lm.module_code
    where lm.lecturer_id = p_lecturer and tm.tutor_id = p_tutor)
$$;

-- The "who can message whom" table from Docs-TLink/Features/Messaging.md
create function public.can_message(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select a <> b and coalesce((
    select case
      when pa.role = 'admin'    then pb.role in ('admin', 'lecturer') or pb.is_tutor
      when pb.role = 'admin'    then pa.role = 'lecturer' or pa.is_tutor
      when pa.role = 'lecturer' and pb.is_tutor then public.shares_module(a, b)
      when pb.role = 'lecturer' and pa.is_tutor then public.shares_module(b, a)
      else false
    end
    from public.profiles pa, public.profiles pb
    where pa.id = a and pb.id = b), false)
$$;

/* ---------- profiles -------------------------------------- */

-- Every new login gets a profile. Role comes from app_metadata, which only
-- the server (admin-create-user function) can set; everyone else is a student.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, role, full_name, email)
  values (
    new.id,
    coalesce((new.raw_app_meta_data ->> 'role')::public.user_role, 'student'),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.email, ''));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users may edit their name and set their student number once. Everything else is admin-only.
create function public.guard_profile_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is not null and not public.is_admin() then
    if new.id is distinct from old.id
       or new.role is distinct from old.role
       or new.is_tutor is distinct from old.is_tutor
       or new.email is distinct from old.email
       or new.created_at is distinct from old.created_at then
      raise exception 'Only admin can change that' using errcode = '42501';
    end if;
    if old.student_number is not null and new.student_number is distinct from old.student_number then
      raise exception 'Ask admin to change your student number' using errcode = '42501';
    end if;
  end if;
  new.student_number := upper(btrim(new.student_number));
  new.full_name := btrim(new.full_name);
  return new;
end $$;

create trigger profiles_guard
  before update on public.profiles
  for each row execute function public.guard_profile_update();

/* ---------- modules --------------------------------------- */

create function public.normalise_module() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.code := upper(btrim(new.code));
  new.name := btrim(new.name);
  if tg_op = 'INSERT' and not public.is_admin() then
    new.created_by := (select auth.uid());
    new.hidden := false;
  end if;
  return new;
end $$;

create trigger modules_normalise
  before insert or update on public.modules
  for each row execute function public.normalise_module();

-- Students add a missing module; if the code already exists the existing one is used.
create function public.add_module(p_code text, p_name text) returns text
language plpgsql set search_path = '' as $$
declare v_code text := upper(btrim(p_code));
begin
  insert into public.modules (code, name) values (v_code, p_name)
  on conflict (code) do nothing;
  return v_code;
end $$;

-- Admin: fold a duplicate module into the right one.
create function public.merge_modules(p_from text, p_to text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admin only' using errcode = '42501'; end if;
  if p_from = p_to then raise exception 'Pick two different modules'; end if;
  if not exists (select 1 from public.modules where code = p_to) then raise exception 'Unknown module %', p_to; end if;

  insert into public.student_modules (student_id, module_code)
    select student_id, p_to from public.student_modules where module_code = p_from on conflict do nothing;
  insert into public.lecturer_modules (lecturer_id, module_code)
    select lecturer_id, p_to from public.lecturer_modules where module_code = p_from on conflict do nothing;
  insert into public.tutor_modules (tutor_id, module_code, approved_at)
    select tutor_id, p_to, approved_at from public.tutor_modules where module_code = p_from on conflict do nothing;
  insert into public.application_marks (application_id, module_code, mark, applying)
    select application_id, p_to, mark, applying from public.application_marks where module_code = p_from on conflict do nothing;
  delete from public.application_marks where module_code = p_from;

  update public.schedule_slots set module_code = p_to where module_code = p_from;
  update public.sessions       set module_code = p_to where module_code = p_from;
  update public.registers      set module_code = p_to where module_code = p_from;

  delete from public.modules where code = p_from;  -- remaining join rows cascade
end $$;

/* ---------- messaging ------------------------------------- */

create function public.conversation_with(p_other uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := (select auth.uid());
  v_id uuid;
begin
  if not public.can_message(v_me, p_other) then
    raise exception 'You can''t message this person' using errcode = '42501';
  end if;
  insert into public.conversations (user_a, user_b)
    values (least(v_me, p_other), greatest(v_me, p_other))
    on conflict (user_a, user_b) do nothing;
  select id into v_id from public.conversations
    where user_a = least(v_me, p_other) and user_b = greatest(v_me, p_other);
  return v_id;
end $$;

create function public.send_message(p_to uuid, p_topic text, p_body text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_msg uuid;
begin
  insert into public.messages (conversation_id, sender_id, topic, body)
    values (public.conversation_with(p_to), (select auth.uid()), btrim(p_topic), btrim(p_body))
    returning id into v_msg;
  return v_msg;
end $$;

create function public.mark_conversation_read(p_conversation uuid) returns void
language sql security definer set search_path = '' as $$
  update public.messages m set read_at = now()
  from public.conversations c
  where c.id = p_conversation and m.conversation_id = c.id
    and (select auth.uid()) in (c.user_a, c.user_b)
    and m.sender_id <> (select auth.uid())
    and m.read_at is null
$$;

create function public.touch_conversation() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end $$;

create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation();

/* ---------- applications ---------------------------------- */

-- A student submits; only admin moves it along.
create function public.guard_application_insert() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not public.is_admin() then
    if new.student_id is distinct from (select auth.uid()) then
      raise exception 'You can only apply for yourself' using errcode = '42501';
    end if;
    if not exists (select 1 from public.profiles where id = new.student_id and student_number is not null) then
      raise exception 'Add your student number first';
    end if;
    new.status := 'pending';
    new.background_checked := false;
    new.response_message := null;
    new.processed_by := null;
    new.processed_at := null;
  end if;
  return new;
end $$;

create trigger applications_guard_insert
  before insert on public.applications
  for each row execute function public.guard_application_insert();

create function public.decide_application(p_application uuid, p_approve boolean, p_message text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_app public.applications;
begin
  if not public.is_admin() then raise exception 'Admin only' using errcode = '42501'; end if;
  if btrim(coalesce(p_message, '')) = '' then raise exception 'Choose or write a response first'; end if;

  select * into v_app from public.applications where id = p_application for update;
  if not found then raise exception 'Application not found'; end if;
  if v_app.status not in ('pending', 'under_review') then raise exception 'This application has already been decided'; end if;

  update public.applications
     set status = case when p_approve then 'approved'::public.application_status else 'rejected' end,
         response_message = btrim(p_message),
         processed_by = (select auth.uid()),
         processed_at = now()
   where id = p_application;

  if p_approve then
    if not exists (select 1 from public.application_marks where application_id = p_application and applying) then
      raise exception 'This application has no modules to tutor';
    end if;
    update public.profiles set is_tutor = true where id = v_app.student_id;
    insert into public.tutor_modules (tutor_id, module_code)
      select v_app.student_id, module_code from public.application_marks
      where application_id = p_application and applying
      on conflict do nothing;
    -- The welcome lands in their inbox in the same moment.
    perform public.send_message(v_app.student_id, 'Welcome to the tutoring programme', p_message);
  end if;
end $$;

/* ---------- sessions and the quota ------------------------ */

create function public.tutor_quota(p_tutor uuid, p_semester uuid) returns smallint
language sql stable security definer set search_path = '' as $$
  select case when (select auth.uid()) = p_tutor or public.is_admin() then coalesce(
    (select session_quota from public.tutor_quota_overrides where tutor_id = p_tutor and semester_id = p_semester),
    (select session_quota from public.semesters where id = p_semester)) end
$$;

create function public.sessions_used(p_tutor uuid, p_semester uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.sessions
  where tutor_id = p_tutor and semester_id = p_semester and status <> 'cancelled'
    and ((select auth.uid()) = p_tutor or public.is_admin())
$$;

-- Every session belongs to the semester its date falls in.
create function public.session_semester() returns trigger
language plpgsql set search_path = '' as $$
begin
  select id into new.semester_id from public.semesters
   where new.session_date between starts_on and ends_on;
  if new.semester_id is null then
    raise exception 'No semester covers %. Add one in Settings first.', new.session_date;
  end if;
  return new;
end $$;

-- Trigger names are prefixed a/b/c because Postgres fires BEFORE triggers alphabetically.
create trigger sessions_a_semester
  before insert or update of session_date on public.sessions
  for each row execute function public.session_semester();

-- Hard limit. Locks the tutor's profile row so two taps at once can't both slip in.
create function public.enforce_quota() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_used int; v_quota int;
begin
  if new.status = 'cancelled' then return new; end if;
  if tg_op = 'UPDATE'
     and old.status <> 'cancelled'
     and old.tutor_id = new.tutor_id
     and old.semester_id = new.semester_id then
    return new;  -- already counted
  end if;

  perform 1 from public.profiles where id = new.tutor_id for update;
  select count(*) into v_used from public.sessions
   where tutor_id = new.tutor_id and semester_id = new.semester_id
     and status <> 'cancelled' and id <> new.id;
  v_quota := public.tutor_quota(new.tutor_id, new.semester_id);

  if v_used >= v_quota then
    raise exception 'Session quota reached (% of %)', v_used, v_quota using errcode = 'TL429';
  end if;
  return new;
end $$;

create trigger sessions_b_quota
  before insert or update of status, tutor_id, semester_id, session_date on public.sessions
  for each row execute function public.enforce_quota();

-- Status moves forward only, and the money fields stamp themselves.
create function public.session_status_flow() returns trigger
language plpgsql security definer set search_path = '' as $$
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

create trigger sessions_c_status_flow
  before insert or update on public.sessions
  for each row execute function public.session_status_flow();

-- Tutor taps Mark on a session that has happened.
create function public.tutor_mark_session(p_session uuid, p_students int) returns void
language plpgsql security definer set search_path = '' as $$
declare v_s public.sessions;
begin
  select * into v_s from public.sessions where id = p_session for update;
  if not found or v_s.tutor_id <> (select auth.uid()) then
    raise exception 'Session not found' using errcode = '42501';
  end if;
  if v_s.status <> 'scheduled' then raise exception 'This session has already been logged'; end if;
  if v_s.session_date > current_date then raise exception 'You can''t log a session before it happens'; end if;

  update public.sessions set status = 'logged', students_attended = p_students where id = p_session;
end $$;

-- Tutor logs a session that wasn't on the timetable.
create function public.tutor_log_session(
  p_date date, p_module text, p_students int,
  p_starts time default null, p_ends time default null, p_venue text default ''
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not exists (select 1 from public.tutor_modules
                 where tutor_id = (select auth.uid()) and module_code = p_module) then
    raise exception 'You''re not approved to tutor %', p_module using errcode = '42501';
  end if;
  if p_date > current_date then raise exception 'You can''t log a session before it happens'; end if;

  insert into public.sessions (tutor_id, module_code, session_date, starts_at, ends_at, venue, students_attended, status)
  values ((select auth.uid()), p_module, p_date, p_starts, p_ends, coalesce(p_venue, ''), p_students, 'logged')
  returning id into v_id;
  return v_id;
end $$;

-- Admin sets a weekly slot; one session per week up to `until`, stopping at the quota.
-- With p_dry_run the whole thing is rolled back and only the counts come back,
-- so the app can warn before anything is created.
create function public.admin_create_slot(
  p_tutor uuid, p_module text, p_weekday smallint,
  p_starts time, p_ends time, p_venue text,
  p_starts_on date, p_until date, p_dry_run boolean default false
) returns table (weeks int, created int, over_quota int, outside_semester int)
language plpgsql security definer set search_path = '' as $$
declare
  v_slot uuid;
  v_day  date;
begin
  if not public.is_admin() then raise exception 'Admin only' using errcode = '42501'; end if;
  if not exists (select 1 from public.tutor_modules where tutor_id = p_tutor and module_code = p_module) then
    raise exception 'This tutor isn''t approved for %', p_module;
  end if;

  weeks := 0; created := 0; over_quota := 0; outside_semester := 0;

  begin
    insert into public.schedule_slots (tutor_id, module_code, weekday, starts_at, ends_at, venue, starts_on, until, created_by)
    values (p_tutor, p_module, p_weekday, p_starts, p_ends, coalesce(p_venue, ''), p_starts_on, p_until, (select auth.uid()))
    returning id into v_slot;

    for v_day in
      select d::date from generate_series(p_starts_on, p_until, interval '1 day') d
      where extract(isodow from d) = p_weekday
    loop
      weeks := weeks + 1;
      if not exists (select 1 from public.semesters where v_day between starts_on and ends_on) then
        outside_semester := outside_semester + 1;
        continue;
      end if;
      begin
        insert into public.sessions (tutor_id, module_code, slot_id, session_date, starts_at, ends_at, venue)
        values (p_tutor, p_module, v_slot, v_day, p_starts, p_ends, coalesce(p_venue, ''));
        created := created + 1;
      exception when sqlstate 'TL429' then
        over_quota := over_quota + 1;
      end;
    end loop;

    if p_dry_run then
      raise exception 'dry run' using errcode = 'TL000';
    end if;
  exception when sqlstate 'TL000' then
    null;  -- rolled back on purpose; the counts survive
  end;

  return next;
end $$;

/* ---------- permissions on functions ---------------------- */

revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.is_admin(), public.is_tutor(), public.teaches(text),
  public.shares_module(uuid, uuid), public.can_message(uuid, uuid),
  public.add_module(text, text), public.merge_modules(text, text),
  public.conversation_with(uuid), public.send_message(uuid, text, text),
  public.mark_conversation_read(uuid), public.decide_application(uuid, boolean, text),
  public.tutor_quota(uuid, uuid), public.sessions_used(uuid, uuid),
  public.tutor_mark_session(uuid, int), public.tutor_log_session(date, text, int, time, time, text),
  public.admin_create_slot(uuid, text, smallint, time, time, text, date, date, boolean)
to authenticated;
