-- FR-08 shared shopping list RLS: family isolation, membership only via RPC, assignee guard, no grade leakage.
begin;
create schema if not exists tests;
create or replace function tests.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if cond is distinct from true then raise exception 'FAIL: %', msg; end if; raise notice 'ok - %', msg; end $$;
create or replace function tests.as_user(uid uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', uid::text, true);
      perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true); end $$;
create or replace function tests.fails(q text) returns boolean language plpgsql as $$
begin execute q; return false; exception when others then return true; end $$;
grant usage on schema tests to authenticated, anon;
grant execute on all functions in schema tests to authenticated, anon;

insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000005a1', 'sl-pa@example.com', '{"full_name":"Pat Alpha"}'),
 ('00000000-0000-0000-0000-0000000005a2', 'sl-sa@example.com', '{"full_name":"Sam Alpha"}'),
 ('00000000-0000-0000-0000-0000000005b1', 'sl-pb@example.com', '{"full_name":"Bo Beta"}');

set local role authenticated;
select tests.as_user('00000000-0000-0000-0000-0000000005a1');
insert into public.students (id, display_name, created_by) values ('50000000-0000-0000-0000-0000000000a0', 'Sam', auth.uid());
select tests.as_user('00000000-0000-0000-0000-0000000005b1');
insert into public.students (id, display_name, created_by) values ('50000000-0000-0000-0000-0000000000b0', 'Kid B', auth.uid());
reset role;
update public.students set profile_id = '00000000-0000-0000-0000-0000000005a2' where id = '50000000-0000-0000-0000-0000000000a0';

set local role authenticated;
select tests.as_user('00000000-0000-0000-0000-0000000005a1');
create temp table h on commit drop as select public.household_for_student('50000000-0000-0000-0000-0000000000a0') id;
grant select on h to authenticated;
select tests.ok((select count(*) from public.household_members where household_id = (select id from h)) = 2, 'list: guardian + linked student are members');
select tests.ok(public.household_for_student('50000000-0000-0000-0000-0000000000a0') = (select id from h), 'list: one household per student (idempotent)');
select tests.ok((select string_agg(name || ':' || role, ',' order by role) from public.shopping_members((select id from h))) = 'Pat:guardian,Sam:student', 'list: member directory is first name + role');
insert into public.shopping_items (household_id, title, quantity, category, class_label, notes, created_by)
  values ((select id from h), 'Graph paper', 2, 'school', 'Math 7', 'quad ruled', auth.uid());
select tests.ok(tests.fails($q$insert into public.shopping_items (household_id, title, created_by) select id, 'x', '00000000-0000-0000-0000-0000000005a2' from h$q$), 'list: cannot spoof created_by');
select tests.ok(tests.fails($q$update public.shopping_items set assigned_to = '00000000-0000-0000-0000-0000000005b1'$q$), 'list: assignee must be in household');
update public.shopping_items set assigned_to = auth.uid();

select tests.as_user('00000000-0000-0000-0000-0000000005a2');
update public.shopping_items set done = true where title = 'Graph paper';
select tests.ok((select done_by from public.shopping_items where title = 'Graph paper') = '00000000-0000-0000-0000-0000000005a2', 'list: student can check off; done_by stamped');
select tests.ok(tests.fails($q$insert into public.household_members (household_id, profile_id) select id, '00000000-0000-0000-0000-0000000005b1' from h$q$), 'list: members cannot add profiles directly');
select tests.ok(tests.fails($q$update public.shopping_items set household_id = gen_random_uuid()$q$), 'list: household is immutable');

select tests.as_user('00000000-0000-0000-0000-0000000005b1');
select tests.ok((select count(*) from public.shopping_items) = 0, 'list: other family sees no items');
select tests.ok((select count(*) from public.shopping_members((select id from h))) = 0, 'list: other family sees no members');
select tests.ok(tests.fails($q$select public.household_for_student('50000000-0000-0000-0000-0000000000a0')$q$), 'list: non-guardian cannot open another family list');
update public.shopping_items set title = 'hacked';
delete from public.shopping_items;
select tests.as_user('00000000-0000-0000-0000-0000000005a1');
select tests.ok((select title from public.shopping_items) = 'Graph paper', 'list: other family cannot edit or delete');
delete from public.shopping_items;
select tests.ok((select count(*) from public.shopping_items) = 0, 'list: member can delete');
rollback;
