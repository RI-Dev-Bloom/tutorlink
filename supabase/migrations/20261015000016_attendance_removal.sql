-- TutorLink — attendance, part 2: what happens when things are removed.
-- Kept separate because the database tool used during the build refuses SQL with the word
-- "delete" in it, so this part is pasted into the Supabase SQL editor by hand.

-- Removing a session takes its check-in and attendance with it. Removing an account keeps
-- the attendance record (with the copied name and student number) but unlinks it.
alter table public.checkins drop constraint checkins_session_id_fkey,
  add constraint checkins_session_id_fkey foreign key (session_id) references public.sessions (id) on delete cascade;
alter table public.attendance drop constraint attendance_session_id_fkey,
  add constraint attendance_session_id_fkey foreign key (session_id) references public.sessions (id) on delete cascade;
alter table public.attendance drop constraint attendance_student_id_fkey,
  add constraint attendance_student_id_fkey foreign key (student_id) references public.profiles (id) on delete set null;
alter table public.attendance drop constraint attendance_added_by_fkey,
  add constraint attendance_added_by_fkey foreign key (added_by) references public.profiles (id) on delete set null;
alter table public.qualifications drop constraint qualifications_created_by_fkey,
  add constraint qualifications_created_by_fkey foreign key (created_by) references public.profiles (id) on delete set null;
alter table public.profiles drop constraint profiles_qualification_code_fkey,
  add constraint profiles_qualification_code_fkey foreign key (qualification_code)
    references public.qualifications (code) on update cascade on delete set null;

-- The tutor (or admin) takes someone off the list, e.g. added by mistake. Not once confirmed.
create function public.tutor_remove_attendance(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_a public.attendance; v_s public.sessions;
begin
  select * into v_a from public.attendance where id = p_id;
  select * into v_s from public.sessions where id = v_a.session_id for update;
  if v_s.id is null or (v_s.tutor_id <> (select auth.uid()) and not public.is_admin()) then
    raise exception 'Not found' using errcode = '42501';
  end if;
  if v_s.status not in ('scheduled', 'logged') then raise exception 'This session is already confirmed'; end if;
  delete from public.attendance where id = p_id;
  update public.sessions set students_attended = (select count(*) from public.attendance where session_id = v_s.id)
   where id = v_s.id;
end $$;

revoke execute on function public.tutor_remove_attendance(uuid) from public, anon;
grant execute on function public.tutor_remove_attendance(uuid) to authenticated;
