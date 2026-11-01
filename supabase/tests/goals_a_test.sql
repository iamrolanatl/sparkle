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


-- ===== family goals =====
select tests.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.family_goals (student_id, target_pct, by_date, reward)
values ('10000000-0000-0000-0000-00000000000a', 80, current_date + 30, 'Pizza night');
select tests.ok((select count(*) from public.family_goals) = 1, 'goal: guardian creates and sees goal');
select tests.as_user('00000000-0000-0000-0000-0000000000a5');
select tests.ok((select count(*) from public.family_goals) = 1, 'goal: student sees family goal');
do $$ begin
  insert into public.family_goals (student_id, target_pct, by_date) values ('10000000-0000-0000-0000-00000000000a', 90, current_date);
  raise exception 'FAIL: student inserted a goal';
exception when insufficient_privilege then raise notice 'ok - goal: student cannot set goals'; end $$;
delete from public.family_goals;
reset role;
select tests.ok((select count(*) from public.family_goals) = 1, 'goal: student cannot delete goal');
set local role authenticated;
select tests.as_user('00000000-0000-0000-0000-00000000000b');
select tests.ok((select count(*) from public.family_goals) = 0, 'goal: other family sees no goals');
do $$ begin
  insert into public.family_goals (student_id, target_pct, by_date) values ('10000000-0000-0000-0000-00000000000a', 90, current_date);
  raise exception 'FAIL: other family inserted a goal';
exception when insufficient_privilege then raise notice 'ok - goal: other family cannot insert'; end $$;
select tests.as_user('00000000-0000-0000-0000-00000000000a');
update public.family_goals set archived_at = now();
select tests.ok((select count(*) from public.family_goals where archived_at is not null) = 1, 'goal: guardian archives goal');
reset role;
rollback;
