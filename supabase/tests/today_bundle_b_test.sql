-- today_bundle_v2 hardening (review 2026-10-31): denial paths, limits, grants, policy-drift guard, household oracle.
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



-- ===== fixtures =====
reset role;
do $$ declare t text; begin foreach t in array array['posts','messages','post_actions','post_reads','resources','grades','attendance_events','units','assignments','classes','tasks','class_categories','class_materials'] loop
  if to_regclass('public.'||t) is not null then execute format('grant select on public.%I to authenticated', t); end if; end loop; end $$;
insert into public.classes (id, student_id, name, teacher) values
 ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'Math A', 'Hyden');
insert into public.assignments (student_id, class_id, title, due_at) values
 ('10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'HW A', now() + interval '2 days');
insert into public.tasks (student_id, title) values ('10000000-0000-0000-0000-00000000000a', 'Task A');
insert into public.attendance_events (student_id, day, code, source, external_key) values
 ('10000000-0000-0000-0000-00000000000a', current_date, 'Tardy', 'test', 'att-a');
-- grandma: second guardian (made revoked below); tutor: full-scope share (expired / revoked below)
insert into public.student_guardians (student_id, guardian_profile_id, relationship, status) values
 ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000c1', 'grandparent', 'active');
insert into public.shares (id, student_id, grantee_profile_id, scopes, granted_by) values
 ('40000000-0000-0000-0000-0000000000c2', '10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000c2',
  array['schedule','assignments','grades','messages','attendance']::public.access_scope[], '00000000-0000-0000-0000-00000000000a');
create or replace function tests.all_empty(j jsonb) returns boolean language sql as $$
  select j is not null and not exists (select 1 from jsonb_each(j) e where jsonb_array_length(e.value) > 0) $$;
grant execute on function tests.all_empty(jsonb) to authenticated, anon;

-- sanity: active second guardian and live share see data
set local role authenticated;
select tests.as_user('00000000-0000-0000-0000-0000000000c1');
select tests.ok(jsonb_array_length(public.today_bundle_v2('10000000-0000-0000-0000-00000000000a')->'classes') = 1, 'bundleb: active second guardian sees classes');
select tests.as_user('00000000-0000-0000-0000-0000000000c2');
select tests.ok(jsonb_array_length(public.today_bundle_v2('10000000-0000-0000-0000-00000000000a')->'attendance') = 1, 'bundleb: live full share sees attendance');

-- pending / inactive guardian states cannot exist (status check allows only active|revoked)
reset role;
do $$ begin
  update public.student_guardians set status = 'pending' where guardian_profile_id = '00000000-0000-0000-0000-0000000000c1';
  raise exception 'FAIL: pending guardian status accepted';
exception when check_violation then raise notice 'ok - bundleb: pending guardian status rejected by check'; end $$;
do $$ begin
  update public.student_guardians set status = 'inactive' where guardian_profile_id = '00000000-0000-0000-0000-0000000000c1';
  raise exception 'FAIL: inactive guardian status accepted';
exception when check_violation then raise notice 'ok - bundleb: inactive guardian status rejected by check'; end $$;

-- revoked guardian: empty, v2 = v1
update public.student_guardians set status = 'revoked' where guardian_profile_id = '00000000-0000-0000-0000-0000000000c1';
set local role authenticated;
select tests.as_user('00000000-0000-0000-0000-0000000000c1');
select tests.ok(public.today_bundle_v2('10000000-0000-0000-0000-00000000000a', '2026-11-01') = public.today_bundle('10000000-0000-0000-0000-00000000000a', '2026-11-01'), 'bundleb: revoked guardian v2 equals v1');
select tests.ok(tests.all_empty(public.today_bundle_v2('10000000-0000-0000-0000-00000000000a')), 'bundleb: revoked guardian gets only empty arrays');

-- expired share
reset role;
update public.shares set expires_at = now() - interval '1 day' where id = '40000000-0000-0000-0000-0000000000c2';
set local role authenticated;
select tests.as_user('00000000-0000-0000-0000-0000000000c2');
select tests.ok(public.today_bundle_v2('10000000-0000-0000-0000-00000000000a', '2026-11-01') = public.today_bundle('10000000-0000-0000-0000-00000000000a', '2026-11-01'), 'bundleb: expired share v2 equals v1');
select tests.ok(tests.all_empty(public.today_bundle_v2('10000000-0000-0000-0000-00000000000a')), 'bundleb: expired share gets only empty arrays');

-- revoked share (not expired)
reset role;
update public.shares set expires_at = null, revoked_at = now() where id = '40000000-0000-0000-0000-0000000000c2';
set local role authenticated;
select tests.as_user('00000000-0000-0000-0000-0000000000c2');
select tests.ok(public.today_bundle_v2('10000000-0000-0000-0000-00000000000a', '2026-11-01') = public.today_bundle('10000000-0000-0000-0000-00000000000a', '2026-11-01'), 'bundleb: revoked share v2 equals v1');
select tests.ok(tests.all_empty(public.today_bundle_v2('10000000-0000-0000-0000-00000000000a')), 'bundleb: revoked share gets only empty arrays');

-- another family's parent
select tests.as_user('00000000-0000-0000-0000-00000000000b');
select tests.ok(public.today_bundle_v2('10000000-0000-0000-0000-00000000000a', '2026-11-01') = public.today_bundle('10000000-0000-0000-0000-00000000000a', '2026-11-01'), 'bundleb: other family v2 equals v1');
select tests.ok(tests.all_empty(public.today_bundle_v2('10000000-0000-0000-0000-00000000000a')), 'bundleb: other family gets only empty arrays');

-- no session: authenticated role but no JWT sub -> auth.uid() null
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
select tests.ok(auth.uid() is null, 'bundleb: no-session setup has null auth.uid()');
select tests.ok(tests.all_empty(public.today_bundle_v2('10000000-0000-0000-0000-00000000000a')), 'bundleb: no session v2 gets only empty arrays');
select tests.ok(tests.all_empty(public.today_bundle('10000000-0000-0000-0000-00000000000a')), 'bundleb: no session v1 gets only empty arrays');

-- EXECUTE privileges (anon/public denied on both; authenticated allowed)
reset role;
select tests.ok(not has_function_privilege('anon', 'public.today_bundle(uuid,timestamptz)', 'execute'), 'bundleb: anon lacks EXECUTE on today_bundle');
select tests.ok(not has_function_privilege('anon', 'public.today_bundle_v2(uuid,timestamptz)', 'execute'), 'bundleb: anon lacks EXECUTE on today_bundle_v2');
select tests.ok(not exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
  where p.proname in ('today_bundle', 'today_bundle_v2') and a.grantee = 0 and a.privilege_type = 'EXECUTE'), 'bundleb: PUBLIC lacks EXECUTE on both bundles');
select tests.ok(has_function_privilege('authenticated', 'public.today_bundle_v2(uuid,timestamptz)', 'execute'), 'bundleb: authenticated has EXECUTE on today_bundle_v2');
select tests.ok((select prosecdef and proconfig @> array['search_path=""'] from pg_proc where proname = 'today_bundle_v2'), 'bundleb: v2 is SECURITY DEFINER with empty search_path');

-- student over the age threshold (15 >= 13) with every limitable scope limited: core scopes stay visible, v2 = v1
insert into public.guardian_access_limits (student_id, scope, limited_by)
select '10000000-0000-0000-0000-00000000000a', s::public.access_scope, '00000000-0000-0000-0000-0000000000a5'
from unnest(array['daily_notes','ai_chat','resources']) s;
select tests.ok(public.student_at_or_over_threshold('10000000-0000-0000-0000-00000000000a'), 'bundleb: student A is over the limit threshold');
set local role authenticated;
select tests.as_user('00000000-0000-0000-0000-00000000000a');
select tests.ok(public.today_bundle_v2('10000000-0000-0000-0000-00000000000a', '2026-11-01') = public.today_bundle('10000000-0000-0000-0000-00000000000a', '2026-11-01'), 'bundleb: v2 equals v1 for guardian when limits are set');
select tests.ok(jsonb_array_length(public.today_bundle_v2('10000000-0000-0000-0000-00000000000a')->'classes') = 1
  and jsonb_array_length(public.today_bundle_v2('10000000-0000-0000-0000-00000000000a')->'attendance') = 1, 'bundleb: limits do not hide core scopes');

-- ===== drift guard: SELECT policies on the 13 tables today_bundle_v2 reads must match v2's hand-copied scope map =====
-- If this fails you changed a policy (or added one) on a bundle table: update today_bundle_v2's scope checks in a new
-- migration to match, then update the expected map below. See docs SOP-15 / supabase/migrations/20261101010000_a_today_bundle_v2.sql.
reset role;
do $$ declare drift text; begin
  with expected(tbl, qual) as (values
    ('classes', 'can_view_student(student_id, ''schedule''::access_scope)'),
    ('units', 'can_view_student(student_id, ''assignments''::access_scope)'),
    ('assignments', 'can_view_student(student_id, ''assignments''::access_scope)'),
    ('tasks', 'can_view_student(student_id, ''assignments''::access_scope)'),
    ('class_materials', 'can_view_student(student_id, ''assignments''::access_scope)'),
    ('resources', 'can_view_student(student_id, ''assignments''::access_scope)'),
    ('grades', 'can_view_student(student_id, ''grades''::access_scope)'),
    ('class_categories', 'can_view_student(student_id, ''grades''::access_scope)'),
    ('posts', 'can_view_student(student_id, ''messages''::access_scope)'),
    ('messages', 'can_view_student(student_id, ''messages''::access_scope)'),
    ('post_actions', 'can_view_student(student_id, ''messages''::access_scope)'),
    ('attendance_events', 'can_view_student(student_id, ''attendance''::access_scope)'),
    ('post_reads', '(user_id = ( SELECT auth.uid() AS uid))')),
  actual as (
    select tablename::text tbl, permissive, replace(coalesce(qual, '<none>'), 'public.', '') qual
    from pg_policies where schemaname = 'public' and cmd in ('SELECT', 'ALL')
      and tablename in (select tbl from expected))
  select string_agg(coalesce(a.tbl, e.tbl) || ': expected [' || coalesce(e.qual, 'no policy') || '] got [' ||
                    coalesce(a.permissive || ' ' || a.qual, 'no policy') || ']', E'\n')
    into drift
  from expected e full join actual a on a.tbl = e.tbl and a.qual = e.qual and a.permissive = 'PERMISSIVE'
  where a.tbl is null or e.tbl is null;
  if drift is not null then
    raise exception E'FAIL: today_bundle_v2 policy drift. A SELECT policy on a table v2 reads changed; update today_bundle_v2 (new migration) and this map:\n%', drift;
  end if;
  raise notice 'ok - bundleb: SELECT policies match today_bundle_v2 scope map';
end $$;

-- ===== household oracle: SECURITY DEFINER list functions must not reveal another family's household id =====
select tests.as_user('00000000-0000-0000-0000-00000000000a');
create temp table hh on commit drop as select public.household_for_student('10000000-0000-0000-0000-00000000000a') id;
grant select on hh to authenticated;
set local role authenticated;
select tests.as_user('00000000-0000-0000-0000-00000000000b');
do $$ begin
  perform public.household_for_student('10000000-0000-0000-0000-00000000000a');
  raise exception 'FAIL: other family obtained a household id';
exception when insufficient_privilege then raise notice 'ok - bundleb: household_for_student forbids other family'; end $$;
select tests.as_user('00000000-0000-0000-0000-0000000000c1');
do $$ begin
  perform public.household_for_student('10000000-0000-0000-0000-00000000000a');
  raise exception 'FAIL: revoked guardian obtained a household id';
exception when insufficient_privilege then raise notice 'ok - bundleb: household_for_student forbids revoked guardian'; end $$;
select tests.as_user('00000000-0000-0000-0000-00000000000b');
select tests.ok((select count(*) from public.households) = 0, 'bundleb: other family cannot list households');
select tests.ok(public.list_role((select id from hh)) is null, 'bundleb: other family has no list_role');
select tests.ok((select count(*) from public.shopping_members((select id from hh))) = 0, 'bundleb: shopping_members empty for other family');
select tests.ok((select count(*) from public.my_shared_lists()) = 0, 'bundleb: my_shared_lists empty for other family');
do $$ begin
  perform public.create_list_invite((select id from hh), 'x@example.com', 'editor');
  raise exception 'FAIL: other family created invite';
exception when insufficient_privilege then raise notice 'ok - bundleb: create_list_invite forbids other family'; end $$;
select tests.ok(public.revoke_list_share(gen_random_uuid()) = false, 'bundleb: revoke_list_share no-op for unknown share');
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
do $$ begin
  perform public.household_for_student('10000000-0000-0000-0000-00000000000a');
  raise exception 'FAIL: no-session obtained a household id';
exception when insufficient_privilege then raise notice 'ok - bundleb: household_for_student forbids no session'; end $$;
reset role;
select tests.ok(not has_function_privilege('anon', 'public.household_for_student(uuid)', 'execute'), 'bundleb: anon lacks EXECUTE on household_for_student');
rollback;
