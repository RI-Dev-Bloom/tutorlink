-- TutorLink — Row Level Security
-- Default deny: every table has RLS on, and nothing is granted to signed-out users.
-- Tutors never write sessions directly; they go through tutor_mark_session / tutor_log_session.

alter table public.profiles              enable row level security;
alter table public.modules               enable row level security;
alter table public.student_modules       enable row level security;
alter table public.lecturer_modules      enable row level security;
alter table public.tutor_modules         enable row level security;
alter table public.applications          enable row level security;
alter table public.application_marks     enable row level security;
alter table public.settings              enable row level security;
alter table public.response_templates    enable row level security;
alter table public.semesters             enable row level security;
alter table public.tutor_quota_overrides enable row level security;
alter table public.schedule_slots        enable row level security;
alter table public.sessions              enable row level security;
alter table public.registers             enable row level security;
alter table public.conversations         enable row level security;
alter table public.messages              enable row level security;
alter table public.push_subscriptions    enable row level security;

/* ---------- profiles -------------------------------------- */

create policy "see self, admin sees all, see who you can message" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_admin() or public.can_message((select auth.uid()), id));

-- Column changes are policed by the profiles_guard trigger.
create policy "edit self, admin edits all" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or public.is_admin())
  with check (id = (select auth.uid()) or public.is_admin());

/* ---------- modules --------------------------------------- */

create policy "everyone signed in can read modules" on public.modules
  for select to authenticated using (true);

create policy "anyone signed in can add a module" on public.modules
  for insert to authenticated with check (true);

create policy "admin edits modules" on public.modules
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "admin deletes modules" on public.modules
  for delete to authenticated using (public.is_admin());

create policy "students manage their own modules" on public.student_modules
  for all to authenticated
  using (student_id = (select auth.uid()) or public.is_admin())
  with check (student_id = (select auth.uid()) or public.is_admin());

create policy "lecturer sees own, admin sees all" on public.lecturer_modules
  for select to authenticated
  using (lecturer_id = (select auth.uid()) or public.is_admin());

create policy "admin sets lecturer modules" on public.lecturer_modules
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "tutor sees own, lecturer sees their modules, admin sees all" on public.tutor_modules
  for select to authenticated
  using (tutor_id = (select auth.uid()) or public.is_admin() or public.teaches(module_code));

create policy "admin sets tutor modules" on public.tutor_modules
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

/* ---------- applications ---------------------------------- */

create policy "student sees own, admin sees all" on public.applications
  for select to authenticated
  using (student_id = (select auth.uid()) or public.is_admin());

create policy "student submits own" on public.applications
  for insert to authenticated
  with check (student_id = (select auth.uid()) or public.is_admin());

create policy "admin updates applications" on public.applications
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "admin deletes applications" on public.applications
  for delete to authenticated using (public.is_admin());

create policy "student sees own marks, admin sees all" on public.application_marks
  for select to authenticated
  using (public.is_admin() or exists (
    select 1 from public.applications a
    where a.id = application_id and a.student_id = (select auth.uid())));

create policy "student adds marks to own pending application" on public.application_marks
  for insert to authenticated
  with check (public.is_admin() or exists (
    select 1 from public.applications a
    where a.id = application_id and a.student_id = (select auth.uid()) and a.status = 'pending'));

create policy "admin edits marks" on public.application_marks
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "admin deletes marks" on public.application_marks
  for delete to authenticated using (public.is_admin());

/* ---------- settings, templates, semesters ---------------- */

create policy "everyone signed in reads settings" on public.settings
  for select to authenticated using (true);

create policy "admin edits settings" on public.settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "admin manages templates" on public.response_templates
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "everyone signed in reads semesters" on public.semesters
  for select to authenticated using (true);

create policy "admin manages semesters" on public.semesters
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "tutor sees own override, admin sees all" on public.tutor_quota_overrides
  for select to authenticated
  using (tutor_id = (select auth.uid()) or public.is_admin());

create policy "admin manages overrides" on public.tutor_quota_overrides
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

/* ---------- sessions -------------------------------------- */

create policy "tutor sees own slots, admin sees all" on public.schedule_slots
  for select to authenticated
  using (tutor_id = (select auth.uid()) or public.is_admin());

create policy "admin manages slots" on public.schedule_slots
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "tutor sees own, lecturer sees their modules, admin sees all" on public.sessions
  for select to authenticated
  using (tutor_id = (select auth.uid()) or public.is_admin() or public.teaches(module_code));

create policy "admin manages sessions" on public.sessions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "tutor sees own registers, admin sees all" on public.registers
  for select to authenticated
  using (tutor_id = (select auth.uid()) or public.is_admin());

create policy "tutor uploads registers for their modules" on public.registers
  for insert to authenticated
  with check (public.is_admin() or (
    tutor_id = (select auth.uid()) and exists (
      select 1 from public.tutor_modules tm
      where tm.tutor_id = (select auth.uid()) and tm.module_code = registers.module_code)));

create policy "tutor removes own registers, admin removes any" on public.registers
  for delete to authenticated
  using (tutor_id = (select auth.uid()) or public.is_admin());

/* ---------- messaging ------------------------------------- */

-- Losing a shared module means losing the thread too: can_message is re-checked on every read.
create policy "members see their conversations" on public.conversations
  for select to authenticated
  using ((select auth.uid()) in (user_a, user_b) and public.can_message(user_a, user_b));

create policy "members see messages in their conversations" on public.messages
  for select to authenticated
  using (exists (select 1 from public.conversations c where c.id = conversation_id));

-- Normally sent through send_message(); this keeps a direct insert just as strict.
create policy "members send into their conversations" on public.messages
  for insert to authenticated
  with check (sender_id = (select auth.uid()) and exists (
    select 1 from public.conversations c where c.id = conversation_id));

/* ---------- push ------------------------------------------ */

create policy "own push subscriptions" on public.push_subscriptions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

/* ---------- live updates ---------------------------------- */

alter publication supabase_realtime add table public.messages;
