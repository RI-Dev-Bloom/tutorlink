-- TutorLink — students apply to tutor (slice 2)
-- The app sends the whole application in one call, so it's saved completely or not at all.

-- Students can only ask to tutor a module they passed with at least the minimum mark.
-- Checked on every mark row, so it holds however the row gets written.
create function public.guard_application_mark() returns trigger
language plpgsql set search_path = '' as $$
declare v_min smallint := (select min_mark from public.settings);
begin
  if new.applying and new.mark < v_min and not public.is_admin() then
    raise exception '%', format('You need at least %s%% in %s to tutor it', v_min, new.module_code);
  end if;
  return new;
end $$;

create trigger application_marks_guard
  before insert or update on public.application_marks
  for each row execute function public.guard_application_mark();

-- p_marks: [{ "module_code": "PROG1111", "mark": 82, "applying": true }, ...]
create function public.submit_application(p_results_path text, p_marks jsonb) returns uuid
language plpgsql set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_id  uuid;
begin
  if coalesce(split_part(p_results_path, '/', 1), '') <> v_uid::text then
    raise exception 'Upload your statement of results first';
  end if;
  if jsonb_typeof(p_marks) is distinct from 'array' or jsonb_array_length(p_marks) = 0 then
    raise exception 'Add the marks from your results';
  end if;
  if not exists (select 1 from jsonb_array_elements(p_marks) m where coalesce((m ->> 'applying')::boolean, false)) then
    raise exception 'Choose at least one module to tutor';
  end if;

  insert into public.applications (student_id, results_path)
    values (v_uid, p_results_path) returning id into v_id;
  insert into public.application_marks (application_id, module_code, mark, applying)
    select v_id, upper(btrim(m ->> 'module_code')), (m ->> 'mark')::smallint, coalesce((m ->> 'applying')::boolean, false)
    from jsonb_array_elements(p_marks) m;
  return v_id;
end $$;

revoke execute on function public.submit_application(text, jsonb) from public, anon;
grant execute on function public.submit_application(text, jsonb) to authenticated;
revoke execute on function public.guard_application_mark() from public, anon, authenticated;
