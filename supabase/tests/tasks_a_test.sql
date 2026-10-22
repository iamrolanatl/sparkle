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


-- ===== Team A: FR-21 tasks =====
select tests.as_user('00000000-0000-0000-0000-0000000000a5');
insert into public.tasks (student_id, title, priority) values ('10000000-0000-0000-0000-00000000000a', 'Study for bio quiz', 'high');
select tests.ok((select count(*) from public.tasks) = 1, 'student creates and sees own task');
select tests.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.tasks (student_id, title) values ('10000000-0000-0000-0000-00000000000a', 'Sign permission slip');
select tests.ok((select count(*) from public.tasks) = 2, 'guardian creates and sees student tasks');
select tests.as_user('00000000-0000-0000-0000-00000000000b');
select tests.ok((select count(*) from public.tasks) = 0, 'other family sees no tasks');
do $$ begin
  insert into public.tasks (student_id, title) values ('10000000-0000-0000-0000-00000000000a', 'x');
  raise exception 'FAIL: other family inserted a task';
exception when insufficient_privilege then raise notice 'ok - other family cannot insert tasks'; end $$;
update public.tasks set title = 'pwned';
reset role;
select tests.ok((select count(*) from public.tasks where title = 'pwned') = 0, 'other family cannot update tasks');
insert into public.shares (student_id, grantee_profile_id, scopes, granted_by)
values ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000c2', '{grades}', '00000000-0000-0000-0000-00000000000a');
set local role authenticated;
select tests.as_user('00000000-0000-0000-0000-0000000000c2');
select tests.ok((select count(*) from public.tasks) = 0, 'helper without assignments scope sees no tasks');
reset role;
insert into public.shares (student_id, grantee_profile_id, scopes, granted_by)
values ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000f0', '{assignments}', '00000000-0000-0000-0000-00000000000a');
set local role authenticated;
select tests.as_user('00000000-0000-0000-0000-0000000000f0');
select tests.ok((select count(*) from public.tasks) = 2, 'helper with assignments scope can read tasks');
do $$ begin
  insert into public.tasks (student_id, title) values ('10000000-0000-0000-0000-00000000000a', 'x');
  raise exception 'FAIL: helper inserted a task';
exception when insufficient_privilege then raise notice 'ok - helpers are read-only on tasks'; end $$;
delete from public.tasks;
reset role;
select tests.ok((select count(*) from public.tasks) = 2, 'helpers cannot delete tasks');
do $$ begin
  insert into public.guardian_access_limits (student_id, scope, limited_by)
  values ('10000000-0000-0000-0000-00000000000a', 'assignments', '00000000-0000-0000-0000-0000000000a5');
  raise exception 'FAIL: assignments scope was limitable';
exception when check_violation then raise notice 'ok - assignments is a core scope (DEC-06), so guardian task writes cannot bypass a limit'; end $$;
set local role authenticated;
select tests.as_user('00000000-0000-0000-0000-0000000000a5');
do $$ begin
  insert into public.tasks (student_id, title, created_by) values ('10000000-0000-0000-0000-00000000000a', 'x', '00000000-0000-0000-0000-00000000000a');
  raise exception 'FAIL: spoofed created_by';
exception when insufficient_privilege then raise notice 'ok - created_by cannot be spoofed'; end $$;
delete from public.tasks where title = 'Study for bio quiz';
select tests.ok((select count(*) from public.tasks) = 1, 'student can delete a mistaken task');
reset role;
rollback;
