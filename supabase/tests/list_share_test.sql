-- FR-08 list sharing RLS: invite by email, token accept w/ email match, viewer vs editor, revoke, no household leakage.
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
 ('00000000-0000-0000-0000-0000000006a1', 'ls-owner@example.com', '{"full_name":"Olive Owner"}'),
 ('00000000-0000-0000-0000-0000000006e1', 'ls-ed@example.com', '{"full_name":"Ed Itor"}'),
 ('00000000-0000-0000-0000-0000000006f1', 'ls-view@example.com', '{"full_name":"Vi Ewer"}'),
 ('00000000-0000-0000-0000-0000000006c1', 'ls-other@example.com', '{"full_name":"Cy Other"}');

set local role authenticated;
select tests.as_user('00000000-0000-0000-0000-0000000006a1');
insert into public.students (id, display_name, created_by) values ('60000000-0000-0000-0000-0000000000a0', 'Kid', auth.uid());
create temp table h on commit drop as select public.household_for_student('60000000-0000-0000-0000-0000000000a0') id;
grant select on h to authenticated;
insert into public.shopping_items (household_id, title, created_by) select id, 'Milk', auth.uid() from h;
create temp table inv on commit drop as
  select 'ed' k, * from public.create_list_invite((select id from h), ' LS-Ed@Example.com ', 'editor')
  union all select 'vi', * from public.create_list_invite((select id from h), 'ls-view@example.com', 'viewer');
grant select on inv to authenticated;
select tests.ok((select count(*) from public.list_shares where status = 'pending') = 2, 'share: owner creates pending invites (email normalized)');
select tests.ok((select count(*) from inv where length(token) >= 60) = 2, 'share: raw token returned once');

select tests.as_user('00000000-0000-0000-0000-0000000006c1');
select tests.ok(tests.fails($q$select public.create_list_invite((select id from h), 'x@y.co', 'editor')$q$), 'share: non-owner cannot invite');
select tests.ok(tests.fails($q$select public.accept_list_invite((select token from inv where k = 'ed'))$q$), 'share: wrong email cannot accept link');
select tests.ok((select count(*) from public.shopping_items) = 0, 'share: pending invite grants nothing');
select tests.ok((select count(*) from public.list_shares) = 0, 'share: outsiders see no shares');

select tests.as_user('00000000-0000-0000-0000-0000000006e1');
select tests.ok((select count(*) from public.shopping_items) = 0, 'share: invitee sees nothing before accepting');
select tests.ok(public.accept_list_invite((select token from inv where k = 'ed')) = (select id from h), 'share: matching email accepts');
select tests.ok(public.list_role((select id from h)) = 'editor', 'share: editor role');
select tests.ok((select count(*) from public.shopping_items) = 1, 'share: editor sees items');
insert into public.shopping_items (household_id, title, created_by) select id, 'Eggs', auth.uid() from h;
update public.shopping_items set done = true where title = 'Milk';
update public.shopping_items set assigned_to = auth.uid() where title = 'Eggs';
select tests.ok((select count(*) from public.shopping_items where done or assigned_to is not null) = 2, 'share: editor can add/check/assign self');
select tests.ok((select count(*) from public.household_members) = 0 and (select count(*) from public.students) = 0
  and (select count(*) from public.households) = 0, 'share: no household/student data exposed');
select tests.ok((select string_agg(name, ',') from public.shopping_members((select id from h))) = 'Olive,Ed', 'share: directory is first names');
select tests.ok(tests.fails($q$select public.create_list_invite((select id from h), 'x@y.co', 'editor')$q$), 'share: editor cannot re-share');
select tests.ok(tests.fails($q$select public.accept_list_invite((select token from inv where k = 'ed'))$q$), 'share: token is single-use');

select tests.as_user('00000000-0000-0000-0000-0000000006f1');
select public.accept_list_invite((select token from inv where k = 'vi'));
select tests.ok((select count(*) from public.shopping_items) = 2, 'share: viewer reads');
select tests.ok(tests.fails($q$insert into public.shopping_items (household_id, title, created_by) select id, 'x', auth.uid() from h$q$), 'share: viewer cannot add');
update public.shopping_items set title = 'hacked';
delete from public.shopping_items;
select tests.ok((select count(*) from public.shopping_items where title <> 'hacked') = 2, 'share: viewer cannot edit or delete');

select tests.as_user('00000000-0000-0000-0000-0000000006a1');
select tests.ok(public.revoke_list_share((select share_id from inv where k = 'ed')), 'share: owner revokes');
select tests.as_user('00000000-0000-0000-0000-0000000006e1');
select tests.ok((select count(*) from public.shopping_items) = 0 and public.list_role((select id from h)) is null, 'share: revoked editor loses access');
select tests.as_user('00000000-0000-0000-0000-0000000006f1');
select public.revoke_list_share((select share_id from inv where k = 'vi'));
select tests.ok((select count(*) from public.shopping_items) = 0, 'share: member can leave');
select tests.as_user('00000000-0000-0000-0000-0000000006a1');
delete from public.shopping_items where done;
select tests.ok((select count(*) from public.shopping_items) = 1, 'share: owner bulk-clears checked');
rollback;
