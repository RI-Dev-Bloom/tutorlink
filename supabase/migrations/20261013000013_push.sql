-- TutorLink — push notifications (slice 7)
-- When something happens, the database asks the send-push Edge Function to buzz the right phones.
-- The function's address and a shared secret live in Supabase Vault ('push_url', 'push_secret'),
-- so they're never in the code. Without them (e.g. in tests) notify() quietly does nothing.

do $$ begin
  create extension if not exists pg_net with schema extensions;
exception when others then raise notice 'pg_net not available: %', sqlerrm;
end $$;

-- Hand a notification to send-push. Never lets a notification problem break the real change.
create function public.notify(p_users uuid[], p_title text, p_body text, p_url text, p_tag text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_url text; v_secret text;
begin
  if p_users is null or cardinality(p_users) = 0 then return; end if;
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'push_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_secret';
  if v_url is null or v_secret is null then return; end if;
  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('user_ids', p_users, 'title', p_title, 'body', p_body, 'url', p_url, 'tag', p_tag),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret));
exception when others then
  raise warning 'notify failed: %', sqlerrm;
end $$;

/* ---------- what sends a notification --------------------- */

-- A new message: the other person in the conversation.
create function public.push_on_message() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_to uuid; v_from text; v_tutor boolean;
begin
  select case when c.user_a = new.sender_id then c.user_b else c.user_a end into v_to
    from public.conversations c where c.id = new.conversation_id;
  select btrim(coalesce(nullif(title, '') || ' ', '') || full_name) into v_from from public.profiles where id = new.sender_id;
  select is_tutor into v_tutor from public.profiles where id = v_to;
  perform public.notify(array[v_to], v_from, new.topic,
    case when v_tutor then '?view=tutor&tab=inbox' else '?tab=inbox' end, 'msg-' || new.conversation_id);
  return null;
end $$;

create trigger messages_push after insert on public.messages
  for each row execute function public.push_on_message();

-- A new application: every admin. A decision: the student.
create function public.push_on_application() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_name text;
begin
  if tg_op = 'INSERT' then
    select full_name into v_name from public.profiles where id = new.student_id;
    perform public.notify(array(select id from public.profiles where role = 'admin'),
      'New tutor application', coalesce(v_name, 'A student') || ' wants to tutor.', '?tab=apps', 'apps');
  elsif new.status in ('approved', 'rejected') and new.status is distinct from old.status then
    perform public.notify(array[new.student_id],
      case when new.status = 'approved' then 'You''re a tutor!' else 'Your tutoring application' end,
      case when new.status = 'approved' then 'Your application was approved. Open TutorLink to see your tutor view.'
           else 'Admin has replied to your application.' end,
      '?view=student&tab=apply', 'application');
  end if;
  return null;
end $$;

create trigger applications_push after insert or update on public.applications
  for each row execute function public.push_on_application();

-- Sessions confirmed or paid: one notification per tutor, however many sessions admin ticked off at once.
create function public.push_on_sessions() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  for r in
    select n.tutor_id,
           count(*) filter (where n.status = 'confirmed') as confirmed,
           count(*) filter (where n.status = 'paid') as paid,
           coalesce(sum(n.rate) filter (where n.status = 'paid'), 0) as paid_amount
    from new_rows n join old_rows o on o.id = n.id
    where n.status is distinct from o.status and n.status in ('confirmed', 'paid')
    group by n.tutor_id
  loop
    if r.paid > 0 then
      perform public.notify(array[r.tutor_id], 'You''ve been paid',
        'R' || case when r.paid_amount = trunc(r.paid_amount) then to_char(r.paid_amount, 'FM9999999') else to_char(r.paid_amount, 'FM9999999D00') end || ' for ' || r.paid || ' session' || case when r.paid = 1 then '' else 's' end || ' was marked as paid.',
        '?view=tutor&tab=pay', 'pay');
    end if;
    if r.confirmed > 0 then
      perform public.notify(array[r.tutor_id], 'Session' || case when r.confirmed = 1 then '' else 's' end || ' confirmed',
        'Admin confirmed ' || r.confirmed || ' session' || case when r.confirmed = 1 then '' else 's' end || '. It''s on your Pay tab.',
        '?view=tutor&tab=pay', 'confirmed');
    end if;
  end loop;
  return null;
end $$;

create trigger sessions_push after update on public.sessions
  referencing old table as old_rows new table as new_rows
  for each statement execute function public.push_on_sessions();

-- Every morning: tutors who have a session today.
create function public.send_session_reminders() returns integer
language plpgsql security definer set search_path = '' as $$
declare r record; v_n int := 0;
begin
  for r in
    select s.tutor_id,
           string_agg(coalesce(to_char(s.starts_at, 'HH24:MI'), 'today') || ' · ' || s.module_code
                      || coalesce(nullif(' · ' || s.venue, ' · '), ''), ', ' order by s.starts_at) as what,
           count(*) as n
    from public.sessions s
    where s.session_date = (now() at time zone 'Africa/Johannesburg')::date and s.status = 'scheduled'
    group by s.tutor_id
  loop
    perform public.notify(array[r.tutor_id],
      case when r.n = 1 then 'Tutoring session today' else r.n || ' tutoring sessions today' end,
      r.what, '?view=tutor&tab=home', 'today');
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

revoke execute on function public.notify(uuid[], text, text, text, text) from public, anon, authenticated;
revoke execute on function public.send_session_reminders() from public, anon, authenticated;
revoke execute on function public.push_on_message() from public, anon, authenticated;
revoke execute on function public.push_on_application() from public, anon, authenticated;
revoke execute on function public.push_on_sessions() from public, anon, authenticated;

-- 05:00 UTC = 07:00 in South Africa.
do $$ begin
  create extension if not exists pg_cron;
  perform cron.schedule('session-reminders', '0 5 * * *', 'select public.send_session_reminders()');
exception when others then raise notice 'pg_cron not available: %', sqlerrm;
end $$;

-- send-push reads its keys from Vault through this. Only the server's secret key (service_role) may call it.
create function public.push_config() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_object_agg(name, decrypted_secret) from vault.decrypted_secrets
  where name in ('push_secret', 'vapid_public_key', 'vapid_private_key', 'vapid_subject')
$$;

revoke execute on function public.push_config() from public, anon, authenticated;
grant execute on function public.push_config() to service_role;
