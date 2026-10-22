-- Team C vault tests (FR-24; DEC-22..28, 140..155). Sample data only. Rolled back.
begin;
create schema if not exists tests;
create or replace function tests.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if cond is distinct from true then raise exception 'FAIL: %', msg; end if; raise notice 'ok - %', msg; end $$;
create or replace function tests.as_user(uid uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', uid::text, true);
      perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true); end $$;
create or replace function tests.as_admin(uid uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', uid::text, true);
      perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated',
        'app_metadata', json_build_object('role', 'support_admin'))::text, true); end $$;
create or replace function tests.raises(sql text, msg text) returns void language plpgsql as $$
begin execute sql; raise exception 'FAIL: % (no error)', msg;
exception when insufficient_privilege or invalid_parameter_value or check_violation or raise_exception then
  raise notice 'ok - %', msg; end $$;
grant usage on schema tests to authenticated; grant execute on all functions in schema tests to authenticated;
alter table auth.users add column if not exists last_sign_in_at timestamptz;  -- present in real Supabase

insert into auth.users (id, email, last_sign_in_at) values
 ('00000000-0000-0000-0000-00000000000a', 'parenta@example.com', now()),
 ('00000000-0000-0000-0000-0000000000a5', 'studenta@example.com', now()),
 ('00000000-0000-0000-0000-00000000000b', 'parentb@example.com', now()),
 ('00000000-0000-0000-0000-0000000000c1', 'grandma@example.com', now()),
 ('00000000-0000-0000-0000-0000000000d1', 'admin1@example.com', now()),
 ('00000000-0000-0000-0000-0000000000d2', 'admin2@example.com', now());

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
insert into public.households (id, name, created_by) values
 ('30000000-0000-0000-0000-00000000000a', 'Sample House A', '00000000-0000-0000-0000-00000000000a'),
 ('30000000-0000-0000-0000-00000000000b', 'Sample House B', '00000000-0000-0000-0000-00000000000b');
insert into public.household_keys (id, household_id, wrapped_dek, kek_version) values
 ('40000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a', '\x00', 1),
 ('40000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-00000000000b', '\x00', 1);
set local role authenticated;

-- Consent (adapter writes via service role only)
select tests.as_user('00000000-0000-0000-0000-00000000000a');
select tests.raises($$select public.vault_insert_document('10000000-0000-0000-0000-00000000000a', 'standard', 'Flyer', 'v1/10000000-0000-0000-0000-00000000000a/k0', repeat('a',64), 10, 'image/png', 'x', null, null, null, null)$$, 'upload blocked without guardian consent');
select tests.raises($$select public.vault_record_consent('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'sample_only', 'stub')$$, 'clients cannot record consent');
reset role;
select tests.raises($$select public.vault_record_consent('00000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000a', 'sample_only', 'stub')$$, 'consent rejected from non-guardian');
select public.vault_record_consent('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'sample_only', 'dev-stub-1');
select tests.raises($$insert into public.vault_documents (student_id, class, title, r2_key, sha256, size, mime, is_sample, created_by) values ('10000000-0000-0000-0000-00000000000a','standard','x','v1/10000000-0000-0000-0000-00000000000a/z',repeat('a',64),1,'image/png',false,'00000000-0000-0000-0000-00000000000a')$$, 'is_sample=false is impossible until launch gate');
set local role authenticated;

select tests.as_user('00000000-0000-0000-0000-00000000000a');
select public.vault_insert_document('10000000-0000-0000-0000-00000000000a', 'standard', 'Bake sale flyer', 'v1/10000000-0000-0000-0000-00000000000a/k1', repeat('a',64), 10, 'image/png', 'bake sale friday gym', null, '{events}', null, null);
select public.vault_insert_document('10000000-0000-0000-0000-00000000000a', 'academic', 'Report card Q1', 'v1/10000000-0000-0000-0000-00000000000a/k2', repeat('b',64), 10, 'application/pdf', 'algebra B+ science A', null, null, null, null);
select public.vault_insert_document('10000000-0000-0000-0000-00000000000a', 'sensitive', 'IEP annual review', 'v1/10000000-0000-0000-0000-00000000000a/k3', repeat('c',64), 10, 'application/pdf', 'dropped', '\xdeadbeef', '{iep}', '40000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a');
select tests.raises($$select public.vault_insert_document('10000000-0000-0000-0000-00000000000a', 'standard', 'x', 'v1/10000000-0000-0000-0000-00000000000b/evil', repeat('a',64), 10, 'image/png', null, null, null, null, null)$$, 'r2 key outside student prefix rejected');
select tests.raises($$select public.vault_insert_document('10000000-0000-0000-0000-00000000000a', 'sensitive', 'x', 'v1/10000000-0000-0000-0000-00000000000a/k9', repeat('a',64), 10, 'image/png', null, '\x01', null, '40000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-00000000000b')$$, 'foreign household rejected');
select tests.raises($$select public.vault_insert_document('10000000-0000-0000-0000-00000000000a', 'sensitive', 'x', 'v1/10000000-0000-0000-0000-00000000000a/k9', repeat('a',64), 10, 'image/png', null, '\x01', null, '40000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-00000000000a')$$, 'foreign DEK rejected');
select tests.ok((select count(*) from public.vault_documents) = 3, 'guardian sees all three classes');
select tests.ok((select ocr_text from public.vault_documents where class='sensitive') is null, 'sensitive plaintext OCR never stored');
select tests.ok((select count(*) from public.vault_documents where ocr_tsv @@ plainto_tsquery('english','bake sale')) = 1, 'OCR full-text search works');
select tests.ok((select count(*) from public.vault_documents where ocr_tsv @@ plainto_tsquery('english','IEP review')) = 0, 'sensitive titles not full-text indexed');

-- Audit log forgery
select tests.raises($$select public.vault_log('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000b', null, 'view', null, null)$$, 'clients cannot call internal vault_log');
select public.vault_log_access((select id from public.vault_documents where title='Report card Q1'), 'download', 'h', 'ua');
select tests.ok((select count(*) from public.vault_access_log where action='download') = 1, 'doc-scoped download audit recorded');

select tests.as_user('00000000-0000-0000-0000-0000000000a5');
select tests.ok((select count(*) from public.vault_documents) = 2, 'student sees standard+academic, not sensitive');
select tests.raises($$select public.vault_insert_document('10000000-0000-0000-0000-00000000000a', 'sensitive', 'x', 'v1/10000000-0000-0000-0000-00000000000a/k4', repeat('d',64), 10, 'application/pdf', null, '\x01', null, null, null)$$, 'student cannot upload sensitive');
select tests.raises($$select public.vault_reclassify((select id from public.vault_documents where title='Report card Q1'), 'standard')$$, 'non-guardian cannot lower class');
select tests.ok((select count(*) from public.vault_access_log) = 0, 'student cannot read audit log before handover');

select tests.as_user('00000000-0000-0000-0000-0000000000c1');
select tests.ok((select count(*) from public.vault_documents) = 2, 'helper sees scoped docs only, never sensitive');

select tests.as_user('00000000-0000-0000-0000-00000000000b');
select tests.ok((select count(*) from public.vault_documents) = 0, 'other family sees nothing (cross-tenant)');
select tests.raises($$select public.vault_log_access((select id from public.vault_documents limit 1), 'view', null, null)$$, 'other family cannot write audit rows');
reset role;
create temp table ids as select id, title from public.vault_documents;
grant select on ids to authenticated;
set local role authenticated;
select tests.as_user('00000000-0000-0000-0000-00000000000b');
select tests.raises($$select public.vault_log_access((select id from ids where title='IEP annual review'), 'view', null, null)$$, 'audit write denied for unreadable doc');

-- Grants
select tests.as_user('00000000-0000-0000-0000-00000000000a');
select tests.raises($$select public.vault_grant_sensitive((select id from ids where title='IEP annual review'), '00000000-0000-0000-0000-00000000000b', 7)$$, 'grant to unrelated profile rejected');
select tests.raises($$select public.vault_grant_sensitive((select id from ids where title='IEP annual review'), '00000000-0000-0000-0000-0000000000c1', 31)$$, 'grant capped at 30 days');
select public.vault_grant_sensitive((select id from ids where title='IEP annual review'), '00000000-0000-0000-0000-0000000000c1', 7);
select tests.as_user('00000000-0000-0000-0000-0000000000c1');
select tests.ok((select count(*) from public.vault_documents) = 3, 'per-doc grant exposes that sensitive doc');
select tests.as_user('00000000-0000-0000-0000-00000000000a');
select public.vault_revoke_grant((select id from public.vault_grants limit 1));
select tests.as_user('00000000-0000-0000-0000-0000000000c1');
select tests.ok((select count(*) from public.vault_documents) = 2, 'revoked grant removes access');

select tests.raises($$update public.vault_documents set title = 'x'$$, 'no direct writes to vault_documents');
select tests.as_user('00000000-0000-0000-0000-00000000000a');
select tests.raises($$delete from public.vault_access_log$$, 'audit log is append-only');

-- Delete / undo / two-phase purge
select public.vault_request_delete((select id from ids where title='Bake sale flyer'));
select tests.ok((select count(*) from public.vault_documents) = 2, 'deleted doc hidden immediately');
select public.vault_undo_delete((select id from ids where title='Bake sale flyer'));
select tests.ok((select count(*) from public.vault_documents) = 3, 'undo within 7 days restores');
select public.vault_request_delete((select id from ids where title='Bake sale flyer'));
select tests.raises($$select public.vault_purge_claim()$$, 'purge is service-role only');
reset role;
update public.vault_documents set deleted_at = now() - interval '8 days', purge_after = now() - interval '1 day' where title = 'Bake sale flyer';
select tests.ok((select array_agg(r2_key) from public.vault_purge_claim()) = '{v1/10000000-0000-0000-0000-00000000000a/k1}', 'purge claim returns due R2 keys');
select tests.ok(exists (select 1 from public.vault_documents where title='Bake sale flyer'), 'row survives until R2 delete confirmed');
select tests.ok((select count(*) from public.vault_purge_claim()) = 0, 'claimed rows not re-claimed within 1 h');
select tests.ok(public.vault_purge_finalize('{v1/10000000-0000-0000-0000-00000000000a/k1}') = 1, 'finalize hard-deletes and audits');
select tests.ok(exists (select 1 from public.vault_access_log where action='purge'), 'purge is audited');
set local role authenticated;

-- Break-glass (dual control)
select tests.as_user('00000000-0000-0000-0000-0000000000d1');
select tests.raises($$select public.vault_break_glass_request('10000000-0000-0000-0000-00000000000a', 'T-1', 'customer cannot see report card', 15, false)$$, 'non-admin cannot request break-glass');
select tests.as_admin('00000000-0000-0000-0000-0000000000d1');
select tests.ok((select count(*) from public.vault_documents) = 0, 'admin has no standing access');
select public.vault_break_glass_request('10000000-0000-0000-0000-00000000000a', 'T-1', 'customer cannot see report card', 60, true);
select tests.ok((select minutes from public.vault_break_glass) = 30, 'break-glass capped at 30 minutes');
select tests.raises($$select public.vault_break_glass_approve((select id from public.vault_break_glass))$$, 'requester cannot self-approve');
select tests.as_admin('00000000-0000-0000-0000-0000000000d2');
select public.vault_break_glass_approve((select id from public.vault_break_glass));
select tests.ok((select count(*) from public.vault_documents) = 0, 'approver does not gain access');
select tests.as_admin('00000000-0000-0000-0000-0000000000d1');
select tests.ok((select count(*) from public.vault_documents) = 1, 'approved session sees non-sensitive only');
select public.vault_log_access((select id from ids where title='Report card Q1'), 'view', null, null);
select tests.as_user('00000000-0000-0000-0000-00000000000a');
select tests.ok(exists (select 1 from public.vault_access_log where action='break_glass_view'), 'break-glass views audited and visible to guardian');
select public.vault_break_glass_guardian_consent((select id from public.vault_break_glass));
select tests.as_admin('00000000-0000-0000-0000-0000000000d1');
select tests.ok((select count(*) from public.vault_documents) = 2, 'sensitive visible only after guardian consent');
reset role;
update public.vault_break_glass set expires_at = now() - interval '1 second';
set local role authenticated;
select tests.as_admin('00000000-0000-0000-0000-0000000000d1');
select tests.ok((select count(*) from public.vault_documents) = 0, 'access ends at expiry');

-- Lifecycle jobs
select tests.raises($$select * from public.vault_lifecycle_run()$$, 'lifecycle job is service-role only');
reset role;
update auth.users set last_sign_in_at = now() - interval '24 months 15 days' where id = '00000000-0000-0000-0000-00000000000a';
select tests.ok((select array_agg(event_kind) from public.vault_lifecycle_run()) = '{inactive_24m}', 'inactivity notice at 24 months');
select tests.ok((select count(*) from public.vault_lifecycle_run()) = 0, 'lifecycle run is idempotent');
update auth.users set last_sign_in_at = now() where id = '00000000-0000-0000-0000-00000000000a';
update public.students set birth_date = current_date - interval '18 years' + interval '10 days' where id = '10000000-0000-0000-0000-00000000000a';
select tests.ok((select array_agg(event_kind) from public.vault_lifecycle_run()) = '{age18_14d}', 'age-18 notice 14 days ahead');
update public.students set birth_date = current_date - interval '18 years' where id = '10000000-0000-0000-0000-00000000000a';
select tests.ok((select array_agg(event_kind) from public.vault_lifecycle_run()) = '{age18_transfer}', 'vault transfers to student at 18');
set local role authenticated;
select tests.as_user('00000000-0000-0000-0000-00000000000a');
select tests.ok((select count(*) from public.vault_documents) = 0, 'after transfer guardian needs a student share');
select tests.as_user('00000000-0000-0000-0000-0000000000a5');
select tests.ok((select count(*) from public.vault_documents) = 2, 'adult student controls whole vault incl. sensitive');
reset role;
update public.students set profile_id = null where id = '10000000-0000-0000-0000-00000000000b';
update public.students set birth_date = current_date - interval '19 years' where id = '10000000-0000-0000-0000-00000000000b';
select tests.ok(public.vault_shred_household('30000000-0000-0000-0000-00000000000b') = 1, 'crypto-shred nulls household DEK');
select tests.ok((select wrapped_dek from public.household_keys where household_id = '30000000-0000-0000-0000-00000000000b') is null, 'shredded key unrecoverable');
rollback;
