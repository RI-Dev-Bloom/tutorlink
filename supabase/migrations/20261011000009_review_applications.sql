-- TutorLink — admin reviews applications (slice 3)

-- Templates are either for approving or for declining, so each button only offers the right ones.
alter table public.response_templates
  add column kind text not null default 'decline' check (kind in ('approve', 'decline'));
update public.response_templates set kind = 'approve' where label ilike 'congratulations%';

-- Approving does more than flip a status (it makes the student a tutor), so a decision
-- can only be made through decide_application. Plain edits can move pending → under review.
create function public.guard_application_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.status in ('approved', 'rejected') and new.status is distinct from old.status then
    raise exception 'This application has already been decided';
  end if;
  if new.status in ('approved', 'rejected') and new.status is distinct from old.status
     and coalesce(current_setting('tl.deciding', true), '') <> 'on' then
    raise exception 'Use Approve or Decline to decide an application';
  end if;
  return new;
end $$;

create trigger applications_guard_update
  before update on public.applications
  for each row execute function public.guard_application_update();

revoke execute on function public.guard_application_update() from public, anon, authenticated;

-- Same as before, but the status change is let through the guard above.
-- (A declined student isn't a tutor, so they have no inbox; they read the reply on their Apply tab.)
create or replace function public.decide_application(p_application uuid, p_approve boolean, p_message text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_app public.applications;
begin
  if not public.is_admin() then raise exception 'Admin only' using errcode = '42501'; end if;
  if btrim(coalesce(p_message, '')) = '' then raise exception 'Choose or write a response first'; end if;

  select * into v_app from public.applications where id = p_application for update;
  if not found then raise exception 'Application not found'; end if;
  if v_app.status not in ('pending', 'under_review') then raise exception 'This application has already been decided'; end if;

  perform set_config('tl.deciding', 'on', true);
  update public.applications
     set status = case when p_approve then 'approved'::public.application_status else 'rejected' end,
         response_message = btrim(p_message),
         processed_by = (select auth.uid()),
         processed_at = now()
   where id = p_application;
  perform set_config('tl.deciding', '', true);

  if p_approve then
    if not exists (select 1 from public.application_marks where application_id = p_application and applying) then
      raise exception 'This application has no modules to tutor';
    end if;
    update public.profiles set is_tutor = true where id = v_app.student_id;
    insert into public.tutor_modules (tutor_id, module_code)
      select v_app.student_id, module_code from public.application_marks
      where application_id = p_application and applying
      on conflict do nothing;
    perform public.send_message(v_app.student_id, 'Welcome to the tutoring programme', p_message);
  end if;
end $$;
