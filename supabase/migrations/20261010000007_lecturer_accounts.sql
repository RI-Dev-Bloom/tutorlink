-- TutorLink — lecturer accounts (slice 1)
-- Admin creates lecturers with a generated password (admin-users Edge Function);
-- the lecturer must pick their own password on first sign-in.

alter table public.profiles
  add column title text not null default '' check (length(title) <= 20),
  add column must_change_password boolean not null default false;

-- Same rules as before, plus: users may clear their own must_change_password
-- flag (after setting a new password) but never set it.
create or replace function public.guard_profile_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is not null and not public.is_admin() then
    if new.id is distinct from old.id
       or new.role is distinct from old.role
       or new.is_tutor is distinct from old.is_tutor
       or new.email is distinct from old.email
       or new.created_at is distinct from old.created_at
       or (new.must_change_password and not old.must_change_password) then
      raise exception 'Only admin can change that' using errcode = '42501';
    end if;
    if old.student_number is not null and new.student_number is distinct from old.student_number then
      raise exception 'Ask admin to change your student number' using errcode = '42501';
    end if;
  end if;
  new.student_number := upper(btrim(new.student_number));
  new.full_name := btrim(new.full_name);
  new.title := btrim(new.title);
  return new;
end $$;

revoke execute on function public.guard_profile_update() from authenticated, public, anon;
