-- TutorLink — announcements (11 Nov 2026)
-- Admin posts to every student: an image, a title and a line of text, each optional (but not all three
-- empty). It shows on the students' Home feed for 1 day to 2 weeks (a week by default), or until the
-- event date if that comes first. After that the image is removed (by tidy-files) and the text stays
-- in the students' Messages tab with its end date.

create table public.announcements (
  id               uuid primary key default gen_random_uuid(),
  title            text check (length(title) <= 120),
  body             text check (length(body) <= 2000),
  image_path       text,
  image_removed_at timestamptz,
  event_date       date,
  ends_at          timestamptz not null,
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  check (title is not null or body is not null or image_path is not null or image_removed_at is not null)
);

create index announcements_ends_at on public.announcements (ends_at desc);

alter table public.announcements enable row level security;

-- Everyone signed in can read them (the app shows them to students; admin manages them).
create policy "signed in read announcements" on public.announcements
  for select to authenticated using (true);

-- Admin can end one early or remove it. New ones go through post_announcement.
create policy "admin updates announcements" on public.announcements
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin deletes announcements" on public.announcements
  for delete to authenticated using (public.is_admin());

/* ---------- images ------------------------------------------ */

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('announcements', 'announcements', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']);

create policy "admin uploads announcement images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'announcements' and public.is_admin()
              and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "signed in read announcement images" on storage.objects
  for select to authenticated using (bucket_id = 'announcements');

create policy "admin deletes announcement images" on storage.objects
  for delete to authenticated using (bucket_id = 'announcements' and public.is_admin());

/* ---------- posting ----------------------------------------- */

-- p_days: how long it shows (1, 3, 7 or 14). p_event: optional event date; it ends at the end of that
-- day (SA time) if that comes sooner.
create function public.post_announcement(p_title text, p_body text, p_image text, p_days integer default 7, p_event date default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_title text := nullif(btrim(coalesce(p_title, '')), '');
  v_body  text := nullif(btrim(coalesce(p_body, '')), '');
  v_image text := nullif(p_image, '');
  v_ends  timestamptz;
  v_id    uuid;
begin
  if not public.is_admin() then raise exception 'Admin only' using errcode = '42501'; end if;
  if v_title is null and v_body is null and v_image is null then raise exception 'Add an image, a title or some text'; end if;
  if p_days not in (1, 3, 7, 14) then raise exception 'Choose how long it shows'; end if;
  if p_event is not null and p_event < (now() at time zone 'Africa/Johannesburg')::date then
    raise exception 'The event date has already passed';
  end if;
  if v_image is not null and (split_part(v_image, '/', 1) <> (select auth.uid())::text
     or not exists (select 1 from storage.objects where bucket_id = 'announcements' and name = v_image)) then
    raise exception 'Add the image again';
  end if;

  v_ends := now() + make_interval(days => p_days);
  if p_event is not null then
    v_ends := least(v_ends, ((p_event + 1)::timestamp at time zone 'Africa/Johannesburg'));
  end if;

  insert into public.announcements (title, body, image_path, event_date, ends_at, created_by)
    values (v_title, v_body, v_image, p_event, v_ends, (select auth.uid()))
    returning id into v_id;
  return v_id;
end $$;

revoke execute on function public.post_announcement(text, text, text, integer, date) from public, anon;
grant execute on function public.post_announcement(text, text, text, integer, date) to authenticated;

-- Every student hears about it (tutors too: they're students).
create function public.push_on_announcement() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.notify(array(select id from public.profiles where role = 'student'),
    coalesce(new.title, 'New announcement'),
    coalesce(left(new.body, 140), case when new.image_path is not null then '📷 New announcement from the programme office' else '' end),
    '?view=student&tab=home', 'ann-' || new.id);
  return null;
end $$;

create trigger push_on_announcement after insert on public.announcements
  for each row execute function public.push_on_announcement();

-- Images uploaded but never posted. The tidy-files function removes them.
create function public.orphan_announcement_images(p_before timestamptz) returns setof text
language plpgsql stable security definer set search_path = '' as $$
begin
  return query
    select o.name from storage.objects o
    where o.bucket_id = 'announcements' and o.created_at < p_before
      and not exists (select 1 from public.announcements a where a.image_path = o.name);
end $$;

revoke execute on function public.orphan_announcement_images(timestamptz) from public, anon, authenticated;
grant execute on function public.orphan_announcement_images(timestamptz) to service_role;
