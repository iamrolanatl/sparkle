-- Today/Classes loader in ONE round trip (perf, ship4). Returns the same rows the app used to fetch with ~15 separate
-- PostgREST queries, as one jsonb object. SECURITY INVOKER: every inner select runs as the caller, so the existing RLS
-- policies on each table still decide what is visible (another family's student yields empty arrays).
-- Additive only.
-- rollback: drop function public.today_bundle(uuid, timestamptz).
create or replace function public.today_bundle(p_student uuid, p_now timestamptz default now())
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'classes', coalesce((select jsonb_agg(to_jsonb(x)) from (
      select id, name, teacher, room, period, syllabus_url, ebook_url, created_at, pct, section_no, synced_at
      from public.classes where student_id = p_student
      order by period asc nulls last, created_at asc limit 30) x), '[]'::jsonb),
    'units', coalesce((select jsonb_agg(to_jsonb(x)) from (
      select id, class_id, title, topics, week_label, is_current, created_at, source
      from public.units where student_id = p_student order by created_at desc limit 200) x), '[]'::jsonb),
    'categories', coalesce((select jsonb_agg(to_jsonb(x)) from (
      select class_id, name, weight, score
      from public.class_categories where student_id = p_student order by weight desc limit 200) x), '[]'::jsonb),
    'upcoming', coalesce((select jsonb_agg(to_jsonb(x)) from (
      select id, class_id, title, due_at, status, category
      from public.assignments where student_id = p_student and due_at >= p_now order by due_at asc limit 300) x), '[]'::jsonb),
    'grades', coalesce((select jsonb_agg(to_jsonb(x)) from (
      select class_id, score, max_score from public.grades where student_id = p_student limit 1000) x), '[]'::jsonb),
    'materials', coalesce((select jsonb_agg(to_jsonb(x)) from (
      select id, class_id, unit_id, kind, name, url, storage_path
      from public.class_materials where student_id = p_student order by created_at desc limit 300) x), '[]'::jsonb),
    'missing', coalesce((select jsonb_agg(to_jsonb(x)) from (
      select id, class_id, title, due_at, status, category
      from public.assignments where student_id = p_student and is_missing = true order by due_at desc limit 100) x), '[]'::jsonb),
    'posts', coalesce((select jsonb_agg(to_jsonb(x)) from (
      select id, class_id, title, author, posted_at, url, body, source
      from public.posts where student_id = p_student and class_id is not null
      order by posted_at desc nulls last limit 200) x), '[]'::jsonb),
    'messages', coalesce((select jsonb_agg(to_jsonb(x)) from (
      select id, class_id, subject, sender, received_at, snippet
      from public.messages where student_id = p_student and class_id is not null
      order by received_at desc nulls last limit 200) x), '[]'::jsonb),
    'resources', coalesce((select jsonb_agg(to_jsonb(x)) from (
      select id, class_id, kind, provider, title, url
      from public.resources where student_id = p_student order by created_at asc limit 500) x), '[]'::jsonb),
    'actions', coalesce((select jsonb_agg(to_jsonb(x)) from (
      select id, post_id, class_id, kind, text, due_at, done_at, method
      from public.post_actions where student_id = p_student and created_at >= p_now - interval '60 days' limit 600) x), '[]'::jsonb),
    'reads', coalesce((select jsonb_agg(x.post_id) from (
      select post_id from public.post_reads where student_id = p_student limit 2000) x), '[]'::jsonb),
    'tasks_open', coalesce((select jsonb_agg(to_jsonb(x)) from (
      select id, title, due_at, priority from public.tasks
      where student_id = p_student and done_at is null order by due_at asc nulls last limit 100) x), '[]'::jsonb),
    'tasks_done', coalesce((select jsonb_agg(x.done_at) from (
      select done_at from public.tasks
      where student_id = p_student and done_at >= p_now - interval '60 days' order by done_at desc limit 500) x), '[]'::jsonb),
    'attendance', coalesce((select jsonb_agg(to_jsonb(x)) from (
      select day, code, excused, course_name from public.attendance_events
      where student_id = p_student order by day desc limit 500) x), '[]'::jsonb)
  );
$$;
revoke all on function public.today_bundle(uuid, timestamptz) from public, anon;
grant execute on function public.today_bundle(uuid, timestamptz) to authenticated;
