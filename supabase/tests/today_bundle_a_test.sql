-- Sparkle RLS tests: cross-family isolation + guardian-limit behaviour (DEC-06).
begin;

create schema if not exists tests;
create or replace function tests.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if cond is distinct from true then raise exception 'FAIL: %', msg; end if; raise notice 'ok - %', msg; end $$;
create or replace function tests.as_user(uid uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', uid::text, true);
      perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true); end $$;
grant usage on schema tests to authenticated, anon;
grant execute on all functions in schema tests to authenticated, anon;

-- Users: family A (parentA, studentA 15y), family B (parentB, studentB 10y), friend (share grantee)
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000000a', 'parenta@example.com', '{"full_name":"Parent A"}'),
 ('00000000-0000-0000-0000-0000000000a5', 'studenta@example.com', '{"full_name":"Student A"}'),
 ('00000000-0000-0000-0000-00000000000b', 'parentb@example.com', '{"full_name":"Parent B"}'),
 ('00000000-0000-0000-0000-0000000000b5', 'studentb@example.com', '{"full_name":"Student B"}'),
 ('00000000-0000-0000-0000-0000000000f0', 'friend@example.com', '{"full_name":"Friend"}'),
 ('00000000-0000-0000-0000-0000000000c1', 'grandma@example.com', '{"full_name":"Grandma"}'),
 ('00000000-0000-0000-0000-0000000000c2', 'tutor@example.com', '{"full_name":"Tutor"}');

select tests.ok((select count(*) from public.profiles) = 7, 'profiles auto-created from auth.users');

-- Parents create their students (as authenticated users)
set local role authenticated;
select tests.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.students (id, display_name, birth_date, created_by)
values ('10000000-0000-0000-0000-00000000000a', 'Student A', current_date - interval '15 years', auth.uid());
insert into public.invitations (student_id, email, role, code_hash, invited_by)
values ('10000000-0000-0000-0000-00000000000a', 'studenta@example.com', 'student',
        encode(sha256(convert_to('CODE-A', 'UTF8')), 'hex'), auth.uid());
select tests.ok(public.is_active_guardian('10000000-0000-0000-0000-00000000000a'), 'creator is primary guardian');

select tests.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.students (id, display_name, birth_date, created_by)
values ('10000000-0000-0000-0000-00000000000b', 'Student B', current_date - interval '10 years', auth.uid());
select tests.ok((select count(*) from public.students) = 1, 'parent B sees only own student');
select tests.ok(not public.can_view_student('10000000-0000-0000-0000-00000000000a', 'grades'), 'parent B cannot view student A');

-- Student accepts invite
select tests.as_user('00000000-0000-0000-0000-0000000000a5');
select tests.ok(public.redeem_invitation('CODE-A') = '10000000-0000-0000-0000-00000000000a', 'student accepts invite');


-- ===== today_bundle =====
reset role;
-- Supabase grants table SELECT to authenticated by default (RLS gates rows); the PGlite stub does not, so mirror it.
do $$ declare t text; begin foreach t in array array['posts','messages','post_actions','post_reads','resources','grades','attendance_events','units','assignments','classes','tasks'] loop
  if to_regclass('public.'||t) is not null then execute format('grant select on public.%I to authenticated', t); end if; end loop; end $$;
insert into public.classes (id, student_id, name, teacher) values
 ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'Math A', 'Hyden'),
 ('20000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', 'Math B', 'Other');
insert into public.assignments (student_id, class_id, title, due_at) values
 ('10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'HW A', now() + interval '2 days');
insert into public.tasks (student_id, title) values ('10000000-0000-0000-0000-00000000000a', 'Task A');
set local role authenticated;
select tests.as_user('00000000-0000-0000-0000-00000000000a');
select tests.ok(jsonb_array_length(public.today_bundle('10000000-0000-0000-0000-00000000000a')->'classes') = 1, 'bundle: guardian gets own class');
select tests.ok(public.today_bundle('10000000-0000-0000-0000-00000000000a')->'classes'->0->>'name' = 'Math A', 'bundle: class row content');
select tests.ok(jsonb_array_length(public.today_bundle('10000000-0000-0000-0000-00000000000a')->'upcoming') = 1, 'bundle: upcoming assignment');
select tests.ok(jsonb_array_length(public.today_bundle('10000000-0000-0000-0000-00000000000a')->'tasks_open') = 1, 'bundle: open task');
select tests.ok(jsonb_array_length(public.today_bundle('10000000-0000-0000-0000-00000000000b')->'classes') = 0, 'bundle: parent A cannot read family B classes');
select tests.as_user('00000000-0000-0000-0000-0000000000a5');
select tests.ok(jsonb_array_length(public.today_bundle('10000000-0000-0000-0000-00000000000a')->'classes') = 1, 'bundle: student reads own classes');
select tests.as_user('00000000-0000-0000-0000-00000000000b');
select tests.ok(jsonb_array_length(public.today_bundle('10000000-0000-0000-0000-00000000000a')->'classes') = 0, 'bundle: parent B cannot read family A classes');
select tests.ok(jsonb_array_length(public.today_bundle('10000000-0000-0000-0000-00000000000a')->'upcoming') = 0, 'bundle: parent B cannot read family A assignments');
select tests.ok(jsonb_array_length(public.today_bundle('10000000-0000-0000-0000-00000000000a')->'tasks_open') = 0, 'bundle: parent B cannot read family A tasks');
reset role;
set local role anon;
do $$ begin
  perform public.today_bundle('10000000-0000-0000-0000-00000000000a');
  raise exception 'FAIL: anon executed today_bundle';
exception when insufficient_privilege then raise notice 'ok - bundle: anon cannot execute'; end $$;
reset role;
select tests.ok((select not prosecdef from pg_proc where proname = 'today_bundle'), 'bundle: function is SECURITY INVOKER');
-- ===== today_bundle_v2 (SECURITY DEFINER, per-scope checks) must equal the RLS-enforced invoker version =====
reset role;
do $$ declare t text; begin foreach t in array array['posts','post_reads','attendance_events','grades'] loop
  if to_regclass('public.'||t) is not null then execute format('grant select on public.%I to authenticated', t); end if; end loop; end $$;
insert into public.posts (id, student_id, class_id, source, title, external_key, posted_at) values
 ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'ctls-learn', 'Post A', 'pa', now());
insert into public.post_reads (post_id, user_id, student_id) values
 ('30000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a5', '10000000-0000-0000-0000-00000000000a');
insert into public.attendance_events (student_id, day, code, source, external_key) values
 ('10000000-0000-0000-0000-00000000000a', current_date, 'Tardy', 'test', 'att-a');
insert into public.shares (student_id, grantee_profile_id, scopes, granted_by) values
 ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000f0', array['schedule']::public.access_scope[], '00000000-0000-0000-0000-00000000000a');
set local role authenticated;
select tests.as_user('00000000-0000-0000-0000-00000000000a');
select tests.ok(public.today_bundle_v2('10000000-0000-0000-0000-00000000000a', '2026-11-01') = public.today_bundle('10000000-0000-0000-0000-00000000000a', '2026-11-01'), 'bundle: v2 equals RLS version for guardian');
select tests.ok(jsonb_array_length(public.today_bundle_v2('10000000-0000-0000-0000-00000000000a')->'posts') = 1 and jsonb_array_length(public.today_bundle_v2('10000000-0000-0000-0000-00000000000a')->'reads') = 0, 'bundle: v2 guardian sees post but not the student''s reads');
select tests.ok(jsonb_array_length(public.today_bundle_v2('10000000-0000-0000-0000-00000000000b')->'classes') = 0, 'bundle: v2 parent A cannot read family B classes');
select tests.as_user('00000000-0000-0000-0000-0000000000a5');
select tests.ok(public.today_bundle_v2('10000000-0000-0000-0000-00000000000a', '2026-11-01') = public.today_bundle('10000000-0000-0000-0000-00000000000a', '2026-11-01'), 'bundle: v2 equals RLS version for student');
select tests.as_user('00000000-0000-0000-0000-00000000000b');
select tests.ok(public.today_bundle_v2('10000000-0000-0000-0000-00000000000a', '2026-11-01') = public.today_bundle('10000000-0000-0000-0000-00000000000a', '2026-11-01'), 'bundle: v2 equals RLS version for other family');
select tests.ok(not exists (select 1 from jsonb_each(public.today_bundle_v2('10000000-0000-0000-0000-00000000000a')) e where jsonb_array_length(e.value) > 0), 'bundle: v2 other family gets only empty arrays');
select tests.as_user('00000000-0000-0000-0000-0000000000f0');
select tests.ok(public.today_bundle_v2('10000000-0000-0000-0000-00000000000a', '2026-11-01') = public.today_bundle('10000000-0000-0000-0000-00000000000a', '2026-11-01'), 'bundle: v2 equals RLS version for schedule-only share');
select tests.ok(jsonb_array_length(public.today_bundle_v2('10000000-0000-0000-0000-00000000000a')->'classes') = 1 and jsonb_array_length(public.today_bundle_v2('10000000-0000-0000-0000-00000000000a')->'posts') = 0 and jsonb_array_length(public.today_bundle_v2('10000000-0000-0000-0000-00000000000a')->'attendance') = 0, 'bundle: v2 share scopes honoured');
reset role;
set local role anon;
do $$ begin
  perform public.today_bundle_v2('10000000-0000-0000-0000-00000000000a');
  raise exception 'FAIL: anon executed today_bundle_v2';
exception when insufficient_privilege then raise notice 'ok - bundle: v2 anon cannot execute'; end $$;
reset role;
rollback;
