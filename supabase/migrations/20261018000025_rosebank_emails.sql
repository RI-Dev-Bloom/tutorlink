/* Sign-in with Rosebank emails.
   - Students (tutors are students) make their own account with st########@rcconnect.edu.za.
     Their student number is read from the email.
   - Staff (lecturers, admin) can't sign themselves up: admin lets their email in first
     (staff_invites, written by the admin-users function), then creates the account.
   - Any other new account is refused by the database, whatever the sign-in method. */

create table public.staff_invites (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);
alter table public.staff_invites enable row level security;
revoke all on public.staff_invites from anon, authenticated;
-- No policies: only the server (secret key) and this trigger read or write it.

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  addr text := lower(btrim(coalesce(new.email, '')));
  student text[] := regexp_match(addr, '^(st[0-9]{8})@rcconnect\.edu\.za$');
begin
  if student is null
     and coalesce(new.raw_app_meta_data ->> 'role', '') = ''
     and not exists (select 1 from public.staff_invites i where i.email = addr) then
    raise exception 'Use your Rosebank student email, like st12345678@rcconnect.edu.za' using errcode = '22023';
  end if;

  insert into public.profiles (id, role, full_name, email, student_number)
  values (
    new.id,
    coalesce((new.raw_app_meta_data ->> 'role')::public.user_role, 'student'),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    addr,
    case when student is not null then upper(student[1]) end);
  return new;
end $$;
