-- TutorLink — tidy-ups from Supabase's security and performance checks (slice 8).

-- The attendance counter is a trigger; nobody needs to call it directly.
revoke execute on function public.attendance_count() from public, anon, authenticated;

-- Indexes for the lookups the app makes often.
create index if not exists sessions_semester_idx        on public.sessions (semester_id);
create index if not exists sessions_slot_idx            on public.sessions (slot_id);
create index if not exists schedule_slots_tutor_idx     on public.schedule_slots (tutor_id);
create index if not exists tutor_quota_overrides_sem_idx on public.tutor_quota_overrides (semester_id);
create index if not exists messages_sender_idx          on public.messages (sender_id);
