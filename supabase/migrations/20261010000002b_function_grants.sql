-- TutorLink — who may call which function
-- Signed-out visitors can call nothing; signed-in users get the RPCs the app uses.
-- Each function checks the caller's role itself.

revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.is_admin(), public.is_tutor(), public.teaches(text),
  public.shares_module(uuid, uuid), public.can_message(uuid, uuid),
  public.add_module(text, text), public.merge_modules(text, text),
  public.conversation_with(uuid), public.send_message(uuid, text, text),
  public.mark_conversation_read(uuid), public.decide_application(uuid, boolean, text),
  public.tutor_quota(uuid, uuid), public.sessions_used(uuid, uuid),
  public.tutor_mark_session(uuid, int), public.tutor_log_session(date, text, int, time, time, text),
  public.admin_create_slot(uuid, text, smallint, time, time, text, date, date, boolean)
to authenticated;
