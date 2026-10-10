-- TutorLink — private file buckets
-- Files live at <bucket>/<owner user id>/<file>, so the first folder says whose it is.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('results',   'results',   false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('registers', 'registers', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

create policy "students upload their own results" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'results' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "student and admin read results" on storage.objects
  for select to authenticated
  using (bucket_id = 'results' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin()));

create policy "admin deletes results" on storage.objects
  for delete to authenticated
  using (bucket_id = 'results' and public.is_admin());

create policy "tutors upload their own registers" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'registers' and public.is_tutor()
              and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "tutor and admin read registers" on storage.objects
  for select to authenticated
  using (bucket_id = 'registers' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin()));

create policy "tutor and admin delete registers" on storage.objects
  for delete to authenticated
  using (bucket_id = 'registers' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin()));
