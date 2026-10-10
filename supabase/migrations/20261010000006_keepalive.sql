-- TutorLink — keep-alive
-- Free Supabase projects pause after 7 days without activity. A daily GitHub Action
-- calls this so the database never goes to sleep over the holidays.
create function public.keepalive() returns timestamptz
language sql stable set search_path = '' as $$ select now() $$;

grant execute on function public.keepalive() to anon, authenticated;
