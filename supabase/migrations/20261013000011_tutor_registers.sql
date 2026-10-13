-- TutorLink — tutors upload registers (slice 5)
-- A register can point at the session it proves. Make sure that's the tutor's own session.

drop policy "tutor uploads registers for their modules" on public.registers;

create policy "tutor uploads registers for their modules" on public.registers
  for insert to authenticated
  with check (public.is_admin() or (
    tutor_id = (select auth.uid())
    and exists (select 1 from public.tutor_modules tm
                where tm.tutor_id = (select auth.uid()) and tm.module_code = registers.module_code)
    and (session_id is null or exists (select 1 from public.sessions s
                where s.id = registers.session_id and s.tutor_id = (select auth.uid())))));
