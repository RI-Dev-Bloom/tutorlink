-- TutorLink — existing tutors (for testing, 26 Oct 2026)
-- Students who already tutor at Rosebank can say so instead of applying: they pick the modules
-- they tutor (any module, not only advertised ones), no marks or results document. Admin confirms
-- with the usual Approve, and they become tutors for every module they picked.

alter table public.applications
  add column existing boolean not null default false,
  alter column results_path drop not null,
  add constraint applications_results_needed check (existing or results_path is not null);

alter table public.application_marks alter column mark drop not null;

-- Marks on a claim are for any visible module and carry no mark; a normal application stays as before.
create or replace function public.guard_application_mark() returns trigger
language plpgsql set search_path = '' as $$
declare v_existing boolean := (select existing from public.applications where id = new.application_id);
begin
  if coalesce(v_existing, false) then
    if not exists (select 1 from public.modules where code = new.module_code and not hidden) then
      raise exception '%', format('%s isn''t a module in TutorLink', new.module_code);
    end if;
    new.mark := null;
  elsif not public.is_admin()
     and not exists (select 1 from public.modules where code = new.module_code and high_risk and not hidden) then
    raise exception '%', format('%s isn''t open for tutor applications', new.module_code);
  elsif new.mark is null then
    raise exception '%', format('Enter your mark for %s', new.module_code);
  end if;
  new.applying := true;
  return new;
end $$;

create function public.claim_existing_tutor(p_modules text[]) returns uuid
language plpgsql set search_path = '' as $$
declare
  v_uid  uuid := (select auth.uid());
  v_id   uuid;
  v_code text;
begin
  if coalesce(array_length(p_modules, 1), 0) = 0 then raise exception 'Choose the modules you tutor'; end if;
  select tm.module_code into v_code from public.tutor_modules tm
    where tm.tutor_id = v_uid and tm.module_code = any (select upper(btrim(c)) from unnest(p_modules) c) limit 1;
  if found then raise exception '%', format('You already tutor %s', v_code); end if;

  insert into public.applications (student_id, existing) values (v_uid, true) returning id into v_id;
  insert into public.application_marks (application_id, module_code, applying)
    select distinct v_id, upper(btrim(c)), true from unnest(p_modules) c;
  return v_id;
end $$;

-- Approving a claim adds every module they picked; no minimum mark applies.
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
  if p_approve and not v_app.existing and not exists (select 1 from public.application_marks
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
      where application_id = p_application and applying and (v_app.existing or mark >= v_min)
      on conflict do nothing;
    perform public.send_message(v_app.student_id, 'Welcome to the tutoring programme', p_message);
  end if;
end $$;

-- The auto-filter leaves claims alone: they have no marks.
create or replace function public.auto_decline_applications() returns integer
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
     and not a.existing
     and a.submitted_at < now() - interval '1 day'
     and not exists (select 1 from public.application_marks m
                     where m.application_id = a.id and m.applying and m.mark >= v_min);
  get diagnostics v_n = row_count;
  perform set_config('tl.deciding', '', true);
  return v_n;
end $$;

revoke execute on function public.auto_decline_applications() from public, anon, authenticated;

-- Admins hear it's a claim, not a new application.
create or replace function public.push_on_application() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_name text;
begin
  if tg_op = 'INSERT' then
    select full_name into v_name from public.profiles where id = new.student_id;
    perform public.notify(array(select id from public.profiles where role = 'admin'),
      case when new.existing then 'Existing tutor to confirm' else 'New tutor application' end,
      coalesce(v_name, 'A student') || case when new.existing then ' says they already tutor.' else ' wants to tutor.' end,
      '?tab=apps', 'apps');
  elsif new.status in ('approved', 'rejected') and new.status is distinct from old.status then
    perform public.notify(array[new.student_id],
      case when new.status = 'approved' then 'You''re a tutor!' else 'Your tutoring application' end,
      case when new.status = 'approved' then 'Your application was approved. Open TutorLink to see your tutor view.'
           else 'Admin has replied to your application.' end,
      '?view=student&tab=apply', 'application');
  end if;
  return null;
end $$;
