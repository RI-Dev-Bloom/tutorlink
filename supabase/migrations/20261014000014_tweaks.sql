-- TutorLink — tweaks after slice 7 (14 Oct 2026)
-- 1. Students can only apply to tutor modules admin marks as high-risk, and give their % for each.
-- 2. Below the minimum mark is allowed in; admin can switch on an auto-filter that declines
--    those applications a day after they're sent.
-- 3. Messages can carry a file. Files are removed after 3 days (admin can make it 4 or 5).

alter table public.modules add column high_risk boolean not null default false;

alter table public.settings
  add column auto_decline boolean not null default false,
  add column file_days smallint not null default 3 check (file_days between 3 and 5);

/* ---------- applying ---------------------------------------- */

-- Every mark on an application is for a module the student wants to tutor, and that module
-- has to be open for tutoring (high-risk, not hidden). Marks below the minimum are let in now.
create or replace function public.guard_application_mark() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not public.is_admin()
     and not exists (select 1 from public.modules where code = new.module_code and high_risk and not hidden) then
    raise exception '%', format('%s isn''t open for tutor applications', new.module_code);
  end if;
  new.applying := true;
  return new;
end $$;

-- p_marks: [{ "module_code": "PROG1111", "mark": 82 }, ...]
create or replace function public.submit_application(p_results_path text, p_marks jsonb) returns uuid
language plpgsql set search_path = '' as $$
declare
  v_uid  uuid := (select auth.uid());
  v_id   uuid;
  v_code text;
begin
  if coalesce(split_part(p_results_path, '/', 1), '') <> v_uid::text then
    raise exception 'Upload your statement of results first';
  end if;
  if jsonb_typeof(p_marks) is distinct from 'array' or jsonb_array_length(p_marks) = 0 then
    raise exception 'Choose at least one module to tutor';
  end if;
  select upper(btrim(m ->> 'module_code')) into v_code from jsonb_array_elements(p_marks) m
    where coalesce(m ->> 'mark', '') !~ '^[0-9]{1,3}$' or (m ->> 'mark')::int > 100 limit 1;
  if found then raise exception '%', format('Enter your mark for %s', v_code); end if;
  select tm.module_code into v_code from public.tutor_modules tm
    join jsonb_array_elements(p_marks) m on tm.module_code = upper(btrim(m ->> 'module_code'))
    where tm.tutor_id = v_uid limit 1;
  if found then raise exception '%', format('You already tutor %s', v_code); end if;

  insert into public.applications (student_id, results_path)
    values (v_uid, p_results_path) returning id into v_id;
  insert into public.application_marks (application_id, module_code, mark, applying)
    select v_id, upper(btrim(m ->> 'module_code')), (m ->> 'mark')::smallint, true
    from jsonb_array_elements(p_marks) m;
  return v_id;
end $$;

/* ---------- deciding ---------------------------------------- */

-- Approving makes the student a tutor for the modules where their mark meets the minimum.
create or replace function public.decide_application(p_application uuid, p_approve boolean, p_message text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_app public.applications;
  v_min smallint := (select min_mark from public.settings);
begin
  if not public.is_admin() then raise exception 'Admin only' using errcode = '42501'; end if;
  if btrim(coalesce(p_message, '')) = '' then raise exception 'Choose or write a response first'; end if;

  select * into v_app from public.applications where id = p_application for update;
  if not found then raise exception 'Application not found'; end if;
  if v_app.status not in ('pending', 'under_review') then raise exception 'This application has already been decided'; end if;
  if p_approve and not exists (select 1 from public.application_marks
                               where application_id = p_application and applying and mark >= v_min) then
    raise exception '%', format('None of their marks meet the %s%% minimum', v_min);
  end if;

  perform set_config('tl.deciding', 'on', true);
  update public.applications
     set status = case when p_approve then 'approved'::public.application_status else 'rejected' end,
         response_message = btrim(p_message),
         processed_by = (select auth.uid()),
         processed_at = now()
   where id = p_application;
  perform set_config('tl.deciding', '', true);

  if p_approve then
    update public.profiles set is_tutor = true where id = v_app.student_id;
    insert into public.tutor_modules (tutor_id, module_code)
      select v_app.student_id, module_code from public.application_marks
      where application_id = p_application and applying and mark >= v_min
      on conflict do nothing;
    perform public.send_message(v_app.student_id, 'Welcome to the tutoring programme', p_message);
  end if;
end $$;

-- The auto-filter: once an application is a day old, if none of its marks meet the minimum,
-- decline it with a standard note. Runs every hour; does nothing while admin has it switched off.
create function public.auto_decline_applications() returns integer
language plpgsql security definer set search_path = '' as $$
declare v_min smallint; v_on boolean; v_n integer;
begin
  select min_mark, auto_decline into v_min, v_on from public.settings;
  if not coalesce(v_on, false) then return 0; end if;
  perform set_config('tl.deciding', 'on', true);
  update public.applications a
     set status = 'rejected',
         processed_at = now(),
         response_message = format('Thank you for applying to tutor. To tutor a module you need at least %s%% in it, '
           'and the marks you entered don''t meet that requirement, so we can''t take your application further this time. '
           'You''re welcome to apply again for a module where you got %s%% or more.', v_min, v_min)
   where a.status in ('pending', 'under_review')
     and a.submitted_at < now() - interval '1 day'
     and not exists (select 1 from public.application_marks m
                     where m.application_id = a.id and m.applying and m.mark >= v_min);
  get diagnostics v_n = row_count;
  perform set_config('tl.deciding', '', true);
  return v_n;
end $$;

revoke execute on function public.auto_decline_applications() from public, anon, authenticated;

/* ---------- files on messages ------------------------------- */

alter table public.messages
  add column file_path       text,
  add column file_name       text check (length(file_name) <= 200),
  add column file_size       integer,
  add column file_type       text,
  add column file_removed_at timestamptz;

-- A message can be just a file, so the text may be empty when a file is attached.
alter table public.messages drop constraint messages_body_check;
alter table public.messages add constraint messages_body_check
  check (length(btrim(body)) <= 4000 and (length(btrim(body)) >= 1 or file_name is not null));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('attachments', 'attachments', false, 10485760, array[
    'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain', 'text/csv',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']);

-- Files go in the sender's own folder. Only people who can message (staff and tutors) upload.
create policy "messagers upload into their own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text
              and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and (p.role <> 'student' or p.is_tutor)));

-- The sender, and whoever can see the message it's on (the messages rules decide that).
create policy "sender and recipient read attachments" on storage.objects
  for select to authenticated
  using (bucket_id = 'attachments' and ((storage.foldername(name))[1] = (select auth.uid())::text
         or exists (select 1 from public.messages m where m.file_path = objects.name)));

drop function public.send_message(uuid, text, text);

-- p_file: { "path": "<uid>/<file>", "name": "Week 8.pdf", "size": 12345, "type": "application/pdf" } or null
create function public.send_message(p_to uuid, p_topic text, p_body text, p_file jsonb default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_msg  uuid;
  v_path text := nullif(p_file ->> 'path', '');
begin
  if v_path is not null and (split_part(v_path, '/', 1) <> (select auth.uid())::text
     or not exists (select 1 from storage.objects where bucket_id = 'attachments' and name = v_path)) then
    raise exception 'Attach the file again';
  end if;
  insert into public.messages (conversation_id, sender_id, topic, body, file_path, file_name, file_size, file_type)
    values (public.conversation_with(p_to), (select auth.uid()), btrim(p_topic), btrim(coalesce(p_body, '')),
            v_path,
            case when v_path is not null then left(coalesce(nullif(btrim(p_file ->> 'name'), ''), 'File'), 200) end,
            case when v_path is not null then (p_file ->> 'size')::integer end,
            case when v_path is not null then p_file ->> 'type' end)
    returning id into v_msg;
  return v_msg;
end $$;

revoke execute on function public.send_message(uuid, text, text, jsonb) from public, anon;
grant execute on function public.send_message(uuid, text, text, jsonb) to authenticated;

-- A file on its own still makes a useful notification.
create or replace function public.push_on_message() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_to uuid; v_from text; v_tutor boolean;
begin
  select case when c.user_a = new.sender_id then c.user_b else c.user_a end into v_to
    from public.conversations c where c.id = new.conversation_id;
  select btrim(coalesce(nullif(title, '') || ' ', '') || full_name) into v_from from public.profiles where id = new.sender_id;
  select is_tutor into v_tutor from public.profiles where id = v_to;
  perform public.notify(array[v_to], v_from, new.topic || case when new.file_name is not null then ' · 📎 ' || new.file_name else '' end,
    case when v_tutor then '?view=tutor&tab=inbox' else '?tab=inbox' end, 'msg-' || new.conversation_id);
  return null;
end $$;

-- Files uploaded but never sent (the message was abandoned). The tidy-files function removes them.
create function public.orphan_attachments(p_before timestamptz) returns setof text
language plpgsql stable security definer set search_path = '' as $$
begin
  return query
    select o.name from storage.objects o
    where o.bucket_id = 'attachments' and o.created_at < p_before
      and not exists (select 1 from public.messages m where m.file_path = o.name);
end $$;

revoke execute on function public.orphan_attachments(timestamptz) from public, anon, authenticated;
grant execute on function public.orphan_attachments(timestamptz) to service_role;

-- Ask the tidy-files Edge Function to remove expired files. Files can only be removed through the
-- Storage API, not SQL. It sits next to send-push, so its address comes from the same Vault entry.
create function public.tidy_message_files() returns void
language plpgsql security definer set search_path = '' as $$
declare v_url text; v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'push_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_secret';
  if v_url is null or v_secret is null then return; end if;
  perform net.http_post(
    url := regexp_replace(v_url, 'send-push$', 'tidy-files'),
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret));
end $$;

revoke execute on function public.tidy_message_files() from public, anon, authenticated;

do $$ begin
  create extension if not exists pg_cron;
  perform cron.schedule('auto-decline', '15 * * * *', 'select public.auto_decline_applications()');
  perform cron.schedule('tidy-files', '45 * * * *', 'select public.tidy_message_files()');
exception when others then raise notice 'pg_cron not available: %', sqlerrm;
end $$;
