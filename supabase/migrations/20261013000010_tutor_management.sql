-- TutorLink — admin tutor management (slice 4)

-- Stop a weekly slot from a date onwards: the sessions still to come are cancelled
-- (so they stop counting towards the quota), the ones that happened stay as they are.
create function public.admin_end_slot(p_slot uuid, p_from date) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  if not public.is_admin() then raise exception 'Admin only' using errcode = '42501'; end if;
  if not exists (select 1 from public.schedule_slots where id = p_slot) then raise exception 'Slot not found'; end if;

  update public.sessions set status = 'cancelled'
   where slot_id = p_slot and status = 'scheduled' and session_date >= p_from;
  get diagnostics v_n = row_count;

  update public.schedule_slots set until = greatest(starts_on, p_from - 1) where id = p_slot;
  return v_n;
end $$;

revoke execute on function public.admin_end_slot(uuid, date) from public, anon;
grant execute on function public.admin_end_slot(uuid, date) to authenticated;
