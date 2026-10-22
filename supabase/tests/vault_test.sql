-- Team C vault RLS tests (FR-24, DEC-23/26/28). Sample data only. Rolled back.
begin;
create schema if not exists tests;
create or replace function tests.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if cond is distinct from true then raise exception 'FAIL: %', msg; end if; raise notice 'ok - %', msg; end $$;
create or replace function tests.as_user(uid uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', uid::text, true);
      perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true); end $$;
grant usage on schema tests to authenticated; grant execute on all functions in schema tests to authenticated;

insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-00000000000a', 'parenta@example.com'),
 ('00000000-0000-0000-0000-0000000000a5', 'studenta@example.com'),
 ('00000000-0000-0000-0000-00000000000b', 'parentb@example.com'),
 ('00000000-0000-0000-0000-0000000000c1', 'grandma@example.com');

set local role authenticated;
select tests.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.students (id, display_name, birth_date, created_by)
values ('10000000-0000-0000-0000-00000000000a', 'Sample Student A', current_date - interval '15 years', auth.uid());
select tests.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.students (id, display_name, birth_date, created_by)
values ('10000000-0000-0000-0000-00000000000b', 'Sample Student B', current_date - interval '10 years', auth.uid());
reset role;
update public.students set profile_id = '00000000-0000-0000-0000-0000000000a5' where id = '10000000-0000-0000-0000-00000000000a';
insert into public.shares (student_id, grantee_profile_id, scopes, relationship, granted_by)
values ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000c1', '{grades,messages}', 'grandparent', '00000000-0000-0000-0000-00000000000a');
insert into public.households (id, name, created_by) values ('30000000-0000-0000-0000-00000000000a', 'Sample House', '00000000-0000-0000-0000-00000000000a');
insert into public.household_keys (id, household_id, wrapped_dek, kek_version) values ('40000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a', '\x00', 1);
set local role authenticated;

-- Consent gate
select tests.as_user('00000000-0000-0000-0000-00000000000a');
do $$ begin
  perform public.vault_insert_document('10000000-0000-0000-0000-00000000000a', 'standard', 'Flyer', 'k0', repeat('a',64), 10, 'image/png', 'bake sale', null, null, null, null, true);
  raise exception 'FAIL: upload without consent';
exception when insufficient_privilege then raise notice 'ok - upload blocked without guardian consent'; end $$;
reset role;
insert into public.consents (guardian_id, student_id, kind, method, version)
values ('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'vault_vpc', 'sample_only', 'v0-sample');
set local role authenticated;
select tests.as_user('00000000-0000-0000-0000-00000000000a');
select public.vault_insert_document('10000000-0000-0000-0000-00000000000a', 'standard', 'Bake sale flyer', 'k1', repeat('a',64), 10, 'image/png', 'bake sale friday gym', null, '{events}', null, null, true);
select public.vault_insert_document('10000000-0000-0000-0000-00000000000a', 'academic', 'Report card Q1', 'k2', repeat('b',64), 10, 'application/pdf', 'algebra B+ science A', null, null, null, null, true);
select public.vault_insert_document('10000000-0000-0000-0000-00000000000a', 'sensitive', 'IEP 2026', 'k3', repeat('c',64), 10, 'application/pdf', 'should be dropped', '\xdeadbeef', '{iep}', '40000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a', true);
select tests.ok((select count(*) from public.vault_documents) = 3, 'guardian sees all three classes');
select tests.ok((select ocr_text from public.vault_documents where class='sensitive') is null, 'sensitive plaintext OCR never stored');
select tests.ok((select count(*) from public.vault_documents where ocr_tsv @@ plainto_tsquery('english','bake sale')) = 1, 'OCR full-text search works');
select tests.ok((select count(*) from public.vault_access_log) = 3, 'guardian sees upload audit rows');

select tests.as_user('00000000-0000-0000-0000-0000000000a5');
select tests.ok((select count(*) from public.vault_documents) = 2, 'student sees standard+academic, not sensitive');
do $$ begin
  perform public.vault_insert_document('10000000-0000-0000-0000-00000000000a', 'sensitive', 'x', 'k4', repeat('d',64), 10, 'application/pdf', null, '\x01', null, '40000000-0000-0000-0000-00000000000a', null, true);
  raise exception 'FAIL: student uploaded sensitive';
exception when insufficient_privilege then raise notice 'ok - student cannot upload sensitive'; end $$;
do $$ begin
  perform public.vault_reclassify((select id from public.vault_documents where r2_key='k2'), 'standard');
  raise exception 'FAIL: student lowered class';
exception when insufficient_privilege then raise notice 'ok - non-guardian cannot lower class'; end $$;
select tests.ok((select count(*) from public.vault_access_log) = 0, 'student cannot read audit log');

select tests.as_user('00000000-0000-0000-0000-0000000000c1');
select tests.ok((select count(*) from public.vault_documents) = 2, 'helper sees scoped docs only, never sensitive');

select tests.as_user('00000000-0000-0000-0000-00000000000b');
select tests.ok((select count(*) from public.vault_documents) = 0, 'other family sees nothing (cross-tenant)');
select tests.ok(not public.can_view_vault_doc((select id from public.vault_documents limit 1)), 'other family denied by function');

-- Time-boxed sensitive grant
select tests.as_user('00000000-0000-0000-0000-00000000000a');
do $$ begin
  perform public.vault_grant_sensitive((select id from public.vault_documents where r2_key='k3'), '00000000-0000-0000-0000-0000000000c1', 31);
  raise exception 'FAIL: 31-day grant';
exception when invalid_parameter_value then raise notice 'ok - grant capped at 30 days'; end $$;
select public.vault_grant_sensitive((select id from public.vault_documents where r2_key='k3'), '00000000-0000-0000-0000-0000000000c1', 7);
select tests.as_user('00000000-0000-0000-0000-0000000000c1');
select tests.ok((select count(*) from public.vault_documents) = 3, 'per-doc grant exposes that sensitive doc');

-- Direct writes blocked; audit append-only
do $$ begin
  update public.vault_documents set title = 'x';
  raise exception 'FAIL: direct update';
exception when insufficient_privilege then raise notice 'ok - no direct writes to vault_documents'; end $$;
select tests.as_user('00000000-0000-0000-0000-00000000000a');
do $$ begin
  delete from public.vault_access_log;
  raise exception 'FAIL: audit delete';
exception when insufficient_privilege then raise notice 'ok - audit log is append-only'; end $$;

-- Delete + purge
select public.vault_request_delete((select id from public.vault_documents where r2_key='k1'));
select tests.ok((select count(*) from public.vault_documents) = 2, 'deleted doc hidden immediately');
do $$ begin
  perform public.vault_purge_due();
  raise exception 'FAIL: client ran purge';
exception when insufficient_privilege then raise notice 'ok - purge is service-role only'; end $$;
reset role;
update public.vault_documents set deleted_at = now() - interval '8 days', purge_after = now() - interval '1 day' where r2_key='k1';
select tests.ok((select array_agg(r2_key) from public.vault_purge_due()) = '{k1}', 'purge returns R2 keys due');
select tests.ok(not exists (select 1 from public.vault_documents where r2_key='k1'), 'purged row hard-deleted');
select tests.ok(exists (select 1 from public.vault_access_log where action='purge'), 'purge is audited');
rollback;
