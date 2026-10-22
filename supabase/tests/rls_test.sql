-- Sparkle RLS tests: cross-family isolation + guardian-limit behaviour (DEC-06).
-- Run against a LOCAL database only:  supabase start && supabase db reset && psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_test.sql
-- Also executed in CI via PGlite (supabase/tests/rls.test.ts). Everything runs in one transaction and is rolled back.
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

-- Ingest worker (service role, bypasses RLS) writes school data
reset role;
insert into public.grades (student_id, score, max_score) values
 ('10000000-0000-0000-0000-00000000000a', 95, 100), ('10000000-0000-0000-0000-00000000000b', 80, 100);
insert into public.daily_notes (student_id, body, visibility) values
 ('10000000-0000-0000-0000-00000000000a', 'private note', 'private'),
 ('10000000-0000-0000-0000-00000000000a', 'note for parents', 'guardians');
set local role authenticated;

-- Isolation
select tests.as_user('00000000-0000-0000-0000-00000000000b');
select tests.ok((select count(*) from public.grades) = 1, 'parent B sees only family B grades');
select tests.as_user('00000000-0000-0000-0000-0000000000b5');
select tests.ok((select count(*) from public.grades) = 0, 'unlinked student B profile sees no grades');
select tests.as_user('00000000-0000-0000-0000-0000000000a5');
select tests.ok((select count(*) from public.grades) = 1, 'student A sees own grades');
select tests.ok((select count(*) from public.daily_notes) = 2, 'student A sees own notes');

-- Clients cannot write school data
do $$ begin
  insert into public.grades (student_id, score) values ('10000000-0000-0000-0000-00000000000a', 100);
  raise exception 'FAIL: client inserted a grade';
exception when insufficient_privilege then raise notice 'ok - client cannot insert grades'; end $$;
do $$ begin
  update public.grades set score = 100;
  raise exception 'FAIL: client updated a grade';
exception when insufficient_privilege then raise notice 'ok - client cannot update grades'; end $$;

-- Guardian sees 'guardians' note but not 'private'
select tests.as_user('00000000-0000-0000-0000-00000000000a');
select tests.ok((select count(*) from public.daily_notes) = 1, 'guardian sees guardian-visible note only');

-- Student (15 >= threshold 13) limits daily_notes; cannot limit grades (core scope)
select tests.as_user('00000000-0000-0000-0000-0000000000a5');
insert into public.guardian_access_limits (student_id, scope, limited_by)
values ('10000000-0000-0000-0000-00000000000a', 'daily_notes', auth.uid());
do $$ begin
  insert into public.guardian_access_limits (student_id, scope, limited_by)
  values ('10000000-0000-0000-0000-00000000000a', 'grades', auth.uid());
  raise exception 'FAIL: student limited a core scope';
exception when check_violation then raise notice 'ok - core scope (grades) cannot be limited'; end $$;

select tests.as_user('00000000-0000-0000-0000-00000000000a');
select tests.ok((select count(*) from public.daily_notes) = 0, 'limit hides daily notes from guardian');
select tests.ok((select count(*) from public.grades) = 1, 'guardian still sees grades (core)');
select tests.ok((select count(*) from public.guardian_access_limits where scope = 'daily_notes') = 1, 'guardian can see the limit exists (limited by student)');

-- Under-threshold student cannot set limits (simulate: student B linked, age 10)
reset role;
update public.students set profile_id = '00000000-0000-0000-0000-0000000000b5' where id = '10000000-0000-0000-0000-00000000000b';
set local role authenticated;
select tests.as_user('00000000-0000-0000-0000-0000000000b5');
do $$ begin
  insert into public.guardian_access_limits (student_id, scope, limited_by)
  values ('10000000-0000-0000-0000-00000000000b', 'ai_chat', auth.uid());
  raise exception 'FAIL: under-threshold student set a limit';
exception when insufficient_privilege then raise notice 'ok - under-threshold student cannot limit'; end $$;

-- Shares: scoped, revocable, expiring
select tests.as_user('00000000-0000-0000-0000-0000000000a5');
insert into public.shares (id, student_id, grantee_profile_id, scopes, granted_by)
values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-00000000000a',
        '00000000-0000-0000-0000-0000000000f0', '{grades}', auth.uid());
select tests.as_user('00000000-0000-0000-0000-0000000000f0');
select tests.ok((select count(*) from public.grades) = 1, 'share grantee sees shared scope');
select tests.ok((select count(*) from public.assignments) = 0 and not public.can_view_student('10000000-0000-0000-0000-00000000000a', 'assignments'), 'share grantee cannot see unshared scope');
select tests.as_user('00000000-0000-0000-0000-0000000000a5');
update public.shares set revoked_at = now() where id = '20000000-0000-0000-0000-000000000001';
select tests.as_user('00000000-0000-0000-0000-0000000000f0');
select tests.ok((select count(*) from public.grades) = 0, 'revoked share removes access');


-- ===== FR-16 helpers =====
-- Grandma: helper for BOTH families (multi-student), code-only invites
select tests.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.invitations (student_id, role, relationship, relationship_label, code_hash, invited_by)
values ('10000000-0000-0000-0000-00000000000a', 'helper', 'grandparent', 'Grandma Rose',
        encode(sha256(convert_to('GMA-A', 'UTF8')), 'hex'), auth.uid());
select tests.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.invitations (student_id, role, relationship, code_hash, invited_by)
values ('10000000-0000-0000-0000-00000000000b', 'helper', 'grandparent',
        encode(sha256(convert_to('GMA-B', 'UTF8')), 'hex'), auth.uid());
select tests.as_user('00000000-0000-0000-0000-0000000000c1');
select tests.ok(public.redeem_invitation('gma-a') = '10000000-0000-0000-0000-00000000000a', 'helper redeems code for student A (case-insensitive)');
select tests.ok(public.redeem_invitation('GMA-A') is null, 'invitation is single use');
select tests.ok(public.redeem_invitation('GMA-B') = '10000000-0000-0000-0000-00000000000b', 'helper redeems code for student B');
select tests.ok((select count(*) from public.grades) = 2, 'multi-student helper sees grades for both students');
select tests.ok((select count(*) from public.students) = 2, 'multi-student helper can list both students (switcher)');
select tests.ok(not public.can_view_student('10000000-0000-0000-0000-00000000000a', 'ai_chat'), 'helper default scopes exclude ai_chat');

-- Guardian revokes grandma on student A; audit has grant + revoke
select tests.as_user('00000000-0000-0000-0000-00000000000a');
update public.shares set revoked_at = now()
 where student_id = '10000000-0000-0000-0000-00000000000a' and grantee_profile_id = '00000000-0000-0000-0000-0000000000c1';
select tests.ok((select count(*) from public.share_audit_log where student_id = '10000000-0000-0000-0000-00000000000a'
                 and action in ('grant','revoke')) >= 4, 'share grants and revokes are audit-logged');
select tests.as_user('00000000-0000-0000-0000-0000000000c1');
select tests.ok((select count(*) from public.grades) = 1, 'after revoke helper keeps only student B');

-- Tutor: requested daily_notes gets trimmed to academic scopes; email-bound
select tests.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.invitations (student_id, role, relationship, email, scopes, code_hash, invited_by)
values ('10000000-0000-0000-0000-00000000000a', 'helper', 'tutor', 'tutor@example.com', '{grades,daily_notes,ai_chat}',
        encode(sha256(convert_to('TUT-1', 'UTF8')), 'hex'), auth.uid());
select tests.as_user('00000000-0000-0000-0000-0000000000f0');
select tests.ok(public.redeem_invitation('TUT-1') is null, 'email-bound invite rejects other accounts');
select tests.as_user('00000000-0000-0000-0000-0000000000c2');
select tests.ok(public.redeem_invitation('TUT-1') is not null, 'tutor redeems email-bound invite');
select tests.ok(public.can_view_student('10000000-0000-0000-0000-00000000000a', 'grades')
                and not public.can_view_student('10000000-0000-0000-0000-00000000000a', 'daily_notes'), 'tutor limited to academic scopes');

-- Under-threshold student B invites a helper -> needs guardian approval
select tests.as_user('00000000-0000-0000-0000-0000000000b5');
insert into public.invitations (id, student_id, role, relationship, code_hash, invited_by)
values ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-00000000000b', 'helper', 'babysitter',
        encode(sha256(convert_to('SIT-1', 'UTF8')), 'hex'), auth.uid());
select tests.as_user('00000000-0000-0000-0000-0000000000f0');
select tests.ok(public.redeem_invitation('SIT-1') is null, 'unapproved under-threshold invite cannot be redeemed');
select tests.as_user('00000000-0000-0000-0000-00000000000b');
select public.approve_invitation('30000000-0000-0000-0000-000000000001');
select tests.as_user('00000000-0000-0000-0000-0000000000f0');
select tests.ok(public.redeem_invitation('SIT-1') = '10000000-0000-0000-0000-00000000000b', 'approved invite redeemed');

-- Rate limit: 5 failures in 15 min blocks further attempts (tutor has 0 failures so far)
select tests.as_user('00000000-0000-0000-0000-0000000000c2');
select public.redeem_invitation('NOPE-' || g) from generate_series(1, 5) g;
do $$ begin
  perform public.redeem_invitation('NOPE-6');
  raise exception 'FAIL: rate limit not enforced';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
  raise notice 'ok - redeem attempts are rate-limited';
end $$;

-- ===== FR-17 waitlist =====
reset role;
set local role anon;
insert into public.waitlist (email, source, ip_hash) values ('fan@example.com', 'landing', 'iphash1');
select tests.ok(not has_table_privilege('public.waitlist', 'select'), 'anon cannot read waitlist');
do $$ begin
  insert into public.waitlist (email, ip_hash) values ('w2@example.com','iphash1'),('w3@example.com','iphash1'),
    ('w4@example.com','iphash1'),('w5@example.com','iphash1'),('w6@example.com','iphash1');
  raise exception 'FAIL: waitlist not rate limited';
exception when sqlstate 'P0429' then raise notice 'ok - waitlist inserts are rate-limited per ip_hash'; end $$;
do $$ begin
  insert into public.waitlist (email) values ('not-an-email');
  raise exception 'FAIL: bad email accepted';
exception when check_violation then raise notice 'ok - waitlist rejects invalid email'; end $$;
reset role;
set local role authenticated;
select tests.as_user('00000000-0000-0000-0000-00000000000a');
select tests.ok(not has_table_privilege('public.waitlist', 'select'), 'authenticated cannot read waitlist');

-- ===== CR-0003 privacy requests / chat =====
reset role;
set local role anon;
insert into public.privacy_requests (request_type, email, gpc_signal) values ('do_not_sell_share', 'p@example.com', true);
select tests.ok(not has_table_privilege('public.privacy_requests', 'select'), 'anon cannot read privacy requests');
select tests.ok(not has_table_privilege('public.chat_messages', 'select') and not has_table_privilege('public.chat_messages', 'insert'), 'anon has no access to chat messages');
select tests.ok(not has_table_privilege('public.feature_flags', 'update'), 'anon cannot flip feature flags');
reset role;
set local role authenticated;
select tests.as_user('00000000-0000-0000-0000-00000000000a');
select tests.ok(not has_table_privilege('public.support_tickets', 'select'), 'authenticated cannot read support tickets');
do $$ begin
  perform public.chat_usage_today();
  raise exception 'FAIL: client called chat_usage_today';
exception when insufficient_privilege then raise notice 'ok - clients cannot call chat usage function'; end $$;
reset role;
insert into public.chat_sessions (id, expires_at) values ('40000000-0000-0000-0000-000000000001', now() - interval '1 day');
select tests.ok(public.purge_expired_chats() = 1, 'expired chat sessions are purged (retention TTL)');
set local role authenticated;

-- Admin: no read policy
select tests.ok(not has_table_privilege('public.admin_audit_log', 'select'), 'clients cannot read audit log');

reset role;
rollback;
