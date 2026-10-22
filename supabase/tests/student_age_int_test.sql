-- #43: student_age must not leak ages across families. Rolled back.
begin;
create schema if not exists tests;
create or replace function tests.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if cond is distinct from true then raise exception 'FAIL: %', msg; end if; raise notice 'ok - %', msg; end $$;
create or replace function tests.as_user(uid uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', coalesce(uid::text, ''), true);
      perform set_config('request.jwt.claims', case when uid is null then '' else json_build_object('sub', uid, 'role', 'authenticated')::text end, true); end $$;
grant usage on schema tests to authenticated, anon;
grant execute on all functions in schema tests to authenticated, anon;
insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-0000000001aa', 'pa@example.com'),
 ('00000000-0000-0000-0000-0000000001bb', 'pb@example.com');
set local role authenticated;
select tests.as_user('00000000-0000-0000-0000-0000000001aa');
insert into public.students (id, display_name, birth_date, created_by)
values ('20000000-0000-0000-0000-0000000001aa', 'Kid A', current_date - interval '15 years', auth.uid());
select tests.ok(public.student_age('20000000-0000-0000-0000-0000000001aa') = 15, 'student_age: guardian sees own student age');
select tests.as_user('00000000-0000-0000-0000-0000000001bb');
select tests.ok(public.student_age('20000000-0000-0000-0000-0000000001aa') is null, 'student_age: other family gets null');
select tests.ok(public.student_at_or_over_threshold('20000000-0000-0000-0000-0000000001aa') = false, 'student_age: threshold check does not leak to other family');
reset role;
select tests.as_user(null);
select tests.ok(public.student_age('20000000-0000-0000-0000-0000000001aa') = 15, 'student_age: internal/service call (no user) unchanged');
rollback;
