-- TutorLink — messages (slice 6)
-- The inbox in one call: one row per conversation, with the other person, the latest
-- message and how many are unread. Runs as the caller, so the usual rules decide what's visible
-- (a lecturer who no longer shares a module with a tutor doesn't see that thread).

create function public.my_inbox() returns table (
  conversation_id uuid,
  other_id        uuid,
  other_name      text,
  other_title     text,
  other_role      public.user_role,
  other_is_tutor  boolean,
  last_topic      text,
  last_at         timestamptz,
  last_from_me    boolean,
  unread          integer
)
language sql stable set search_path = '' as $$
  select c.id, o.id, o.full_name, o.title, o.role, o.is_tutor,
         m.topic, m.created_at, m.sender_id = (select auth.uid()),
         (select count(*)::int from public.messages u
           where u.conversation_id = c.id and u.read_at is null and u.sender_id <> (select auth.uid()))
  from public.conversations c
  join public.profiles o on o.id = case when c.user_a = (select auth.uid()) then c.user_b else c.user_a end
  left join lateral (
    select topic, created_at, sender_id from public.messages
    where conversation_id = c.id order by created_at desc limit 1) m on true
  where (select auth.uid()) in (c.user_a, c.user_b)
  order by coalesce(m.created_at, c.created_at) desc
$$;

revoke execute on function public.my_inbox() from public, anon;
grant execute on function public.my_inbox() to authenticated;
