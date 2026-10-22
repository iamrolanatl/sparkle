-- Team C · FR-24 School mail vault (WBS 6.8.2–6.8.6; DEC-20..39, DEC-140..155)
-- Additive only. Behind feature flag vault_enabled=false (DEC-37). Sample data only: CHECK (is_sample) until launch gate.
-- rollback: (requires a CR) remove the vault_* functions, then tables vault_lifecycle_events, vault_break_glass,
--   vault_student_control, vault_access_log, vault_grants, vault_documents, household_keys, consents, type vault_class,
--   and app_settings keys 'vault_consent_version'. No existing table or row is modified.
-- NOTE for migration lint (SOP-15): every UPDATE/DELETE below is inside a runtime function body
-- (user delete, purge, lifecycle jobs); this migration rewrites no existing data.

do $$ begin
  create type public.vault_class as enum ('standard', 'academic', 'sensitive');
exception when duplicate_object then null; end $$;

insert into public.app_settings (key, value) values ('vault_consent_version', 'v0-sample') on conflict (key) do nothing;

create table if not exists public.consents (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  kind text not null check (kind in ('vault_vpc', 'third_party_ai')),
  method text not null check (method in ('card_verification', 'id_face_match', 'sample_only')),
  version text not null,
  verifier_ref text check (char_length(verifier_ref) <= 120),  -- vendor transaction id; never card/ID data
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index if not exists consents_guardian_idx on public.consents (guardian_id);
create index if not exists consents_student_idx on public.consents (student_id, kind);

-- Wrapped per-household DEK (AES-256-GCM). KEK is a Workers secret, never in DB (DEC-24).
create table if not exists public.household_keys (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  wrapped_dek bytea,                       -- null after crypto-shred
  kek_version int not null,
  created_at timestamptz not null default now(),
  rewrapped_at timestamptz,
  shredded_at timestamptz
);
create index if not exists household_keys_household_idx on public.household_keys (household_id);
create index if not exists household_keys_kek_idx on public.household_keys (kek_version) where shredded_at is null;

create table if not exists public.vault_documents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  household_id uuid references public.households (id) on delete set null,
  class public.vault_class not null,
  title text not null check (char_length(title) <= 200),
  source text check (char_length(source) <= 120),
  received_on date,
  r2_key text not null unique,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  size bigint not null check (size > 0 and size <= 10485760),
  mime text not null check (mime in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic')),
  ocr_status text not null default 'pending' check (ocr_status in ('pending', 'done', 'failed', 'skipped')),
  ocr_text text,
  ocr_text_enc bytea,
  ocr_tsv tsvector generated always as (
    case when class = 'sensitive' then null
         else to_tsvector('english', coalesce(title, '') || ' ' || coalesce(ocr_text, '')) end) stored,
  tags text[] not null default '{}',
  dek_id uuid references public.household_keys (id),
  is_sample boolean not null default true,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  purge_after timestamptz,
  purge_claimed_at timestamptz,
  constraint sample_only_until_launch_gate check (is_sample),                     -- DEC-37/144; lifting needs a CR
  constraint r2_key_scoped check (r2_key like 'v1/' || student_id::text || '/%'), -- no foreign object refs
  constraint sensitive_no_plaintext check (class <> 'sensitive' or (ocr_text is null and dek_id is not null and household_id is not null)),
  constraint purge_within_30d check (purge_after is null or purge_after <= deleted_at + interval '30 days')
);
create index if not exists vault_documents_student_idx on public.vault_documents (student_id, created_at desc) where deleted_at is null;
create index if not exists vault_documents_household_idx on public.vault_documents (household_id);
create index if not exists vault_documents_dek_idx on public.vault_documents (dek_id);
create index if not exists vault_documents_created_by_idx on public.vault_documents (created_by);
create index if not exists vault_documents_tsv_idx on public.vault_documents using gin (ocr_tsv);
create index if not exists vault_documents_tags_idx on public.vault_documents using gin (tags);
create index if not exists vault_documents_purge_idx on public.vault_documents (purge_after) where purge_after is not null;

create table if not exists public.vault_grants (
  id uuid primary key default gen_random_uuid(),
  doc_id uuid not null references public.vault_documents (id) on delete cascade,
  grantee_profile_id uuid not null references public.profiles (id) on delete cascade,
  granted_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  constraint grant_max_30d check (expires_at <= created_at + interval '30 days')
);
create index if not exists vault_grants_doc_idx on public.vault_grants (doc_id);
create index if not exists vault_grants_grantee_idx on public.vault_grants (grantee_profile_id);
create index if not exists vault_grants_granted_by_idx on public.vault_grants (granted_by);

-- Append-only (DEC-26). No content. 24-month rolling retention via vault_access_log_prune().
-- Scale plan (CR-0007): convert to monthly range partitions on `at` before 100k users (RAID R-C3).
create table if not exists public.vault_access_log (
  id bigint generated always as identity primary key,
  actor uuid,
  student_id uuid not null,
  doc_id uuid,
  action text not null check (action in ('upload','view','download','share','unshare','classify','ocr','ai_use',
    'delete','export','purge','consent','break_glass_request','break_glass_approve','break_glass_view','transfer','lifecycle_notice')),
  ip_hash text,
  user_agent text check (char_length(user_agent) <= 300),
  at timestamptz not null default now()
);
create index if not exists vault_access_log_student_idx on public.vault_access_log (student_id, at desc);
create index if not exists vault_access_log_actor_idx on public.vault_access_log (actor, at desc);
create index if not exists vault_access_log_doc_idx on public.vault_access_log (doc_id);
create index if not exists vault_access_log_at_idx on public.vault_access_log (at);

-- Age-18 handover state (DEC-28)
create table if not exists public.vault_student_control (
  student_id uuid primary key references public.students (id) on delete cascade,
  controlled_by_student_at timestamptz,     -- student has account: student owns vault
  guardian_readonly_until timestamptz,      -- no student account: guardians read-only for 12 months
  updated_at timestamptz not null default now()
);

-- Break-glass view-as (DEC-27): dual control, ticket + reason, ≤ 30 min, sensitive only with guardian consent.
create table if not exists public.vault_break_glass (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  requested_by uuid not null references public.profiles (id),
  approved_by uuid references public.profiles (id),
  ticket_id text not null check (char_length(ticket_id) between 3 and 60),
  reason text not null check (char_length(reason) between 10 and 500),
  minutes int not null check (minutes between 1 and 30),
  include_sensitive boolean not null default false,
  guardian_consent_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  expires_at timestamptz,
  ended_at timestamptz,
  family_notified_at timestamptz,
  constraint dual_control check (approved_by is null or approved_by <> requested_by),
  constraint max_30_min check (expires_at is null or expires_at <= approved_at + interval '30 minutes')
);
create index if not exists vault_break_glass_student_idx on public.vault_break_glass (student_id);
create index if not exists vault_break_glass_requested_idx on public.vault_break_glass (requested_by);
create index if not exists vault_break_glass_approved_idx on public.vault_break_glass (approved_by);
create index if not exists vault_break_glass_consent_idx on public.vault_break_glass (guardian_consent_by);
create index if not exists vault_break_glass_notify_idx on public.vault_break_glass (approved_at) where family_notified_at is null;

-- Lifecycle notices/actions, idempotent per cycle (DEC-28)
create table if not exists public.vault_lifecycle_events (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.students (id) on delete cascade,
  kind text not null check (kind in ('inactive_24m', 'inactive_25m', 'inactive_delete_26m', 'age18_60d', 'age18_14d',
                                     'age18_transfer', 'age18_readonly', 'age18_readonly_expired')),
  cycle_key text not null,
  created_at timestamptz not null default now(),
  notified_at timestamptz,
  unique (student_id, kind, cycle_key)
);
create index if not exists vault_lifecycle_pending_idx on public.vault_lifecycle_events (created_at) where notified_at is null;

-- ---------------------------------------------------------------------------
-- Access
-- ---------------------------------------------------------------------------
create or replace function public.is_support_admin()
returns boolean language sql stable as $$
  select coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'support_admin'
$$;

create or replace function public.vault_student_controls(p_student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.vault_student_control c where c.student_id = p_student and c.controlled_by_student_at is not null)
$$;

-- Guardian vault access: active guardian, unless the vault transferred to the (adult) student — then only via a share.
create or replace function public.vault_guardian_access(p_student uuid, p_scope public.access_scope)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_active_guardian(p_student) and (
    not public.vault_student_controls(p_student)
    or exists (select 1 from public.shares sh where sh.student_id = p_student and sh.grantee_profile_id = (select auth.uid())
               and sh.revoked_at is null and (sh.expires_at is null or sh.expires_at > now()) and p_scope = any (sh.scopes)))
$$;

create or replace function public.vault_break_glass_active(p_student uuid, p_sensitive boolean)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_support_admin() and exists (
    select 1 from public.vault_break_glass b
    where b.student_id = p_student and b.requested_by = (select auth.uid()) and b.approved_at is not null
      and b.ended_at is null and b.expires_at > now()
      and (not p_sensitive or (b.include_sensitive and b.guardian_consent_by is not null)))
$$;

-- Read rule: can_view_student + class rule (Plan §5, DEC-23/140) + handover + break-glass.
create or replace function public.can_view_vault_doc(p_doc uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.vault_documents d
    where d.id = p_doc and d.deleted_at is null and (select auth.uid()) is not null and (
      public.vault_break_glass_active(d.student_id, d.class = 'sensitive')
      or case d.class
        when 'standard' then public.is_student_self(d.student_id) or public.vault_guardian_access(d.student_id, 'messages')
          or (not public.is_active_guardian(d.student_id) and public.can_view_student(d.student_id, 'messages'))
        when 'academic' then public.is_student_self(d.student_id) or public.vault_guardian_access(d.student_id, 'grades')
          or (not public.is_active_guardian(d.student_id) and public.can_view_student(d.student_id, 'grades'))
        else public.vault_guardian_access(d.student_id, 'grades')
          or (public.is_student_self(d.student_id) and public.vault_student_controls(d.student_id))
          or exists (select 1 from public.vault_grants g where g.doc_id = d.id
                     and g.grantee_profile_id = (select auth.uid())
                     and g.revoked_at is null and g.expires_at > now())
      end))
$$;

-- Who may write to a student's vault (upload/delete/grant).
create or replace function public.vault_can_manage(p_student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when public.vault_student_controls(p_student) then public.is_student_self(p_student)
    when exists (select 1 from public.vault_student_control c where c.student_id = p_student
                 and c.guardian_readonly_until is not null) then false
    else public.is_active_guardian(p_student) end
$$;

-- Internal logger (no client grant: forgery fix).
create or replace function public.vault_log(p_actor uuid, p_student uuid, p_doc uuid, p_action text, p_ip_hash text, p_ua text)
returns void language sql security definer set search_path = public as $$
  insert into public.vault_access_log (actor, student_id, doc_id, action, ip_hash, user_agent)
  values (p_actor, p_student, p_doc, p_action, p_ip_hash, left(p_ua, 300))
$$;

-- Client-callable, doc-scoped: derives student from the doc and requires read access.
create or replace function public.vault_log_access(p_doc uuid, p_action text, p_ip_hash text, p_ua text)
returns void language plpgsql security definer set search_path = public as $$
declare v_student uuid; v_class public.vault_class;
begin
  if p_action not in ('view', 'download') then raise exception 'bad action' using errcode = '22023'; end if;
  if not public.can_view_vault_doc(p_doc) then raise exception 'not allowed' using errcode = '42501'; end if;
  select student_id, class into v_student, v_class from public.vault_documents where id = p_doc;
  perform public.vault_log((select auth.uid()), v_student, p_doc,
    case when public.vault_break_glass_active(v_student, v_class = 'sensitive')
              and not public.is_active_guardian(v_student) and not public.is_student_self(v_student)
         then 'break_glass_view' else p_action end, p_ip_hash, p_ua);
end $$;

-- Consent is recorded by the API only after the ConsentVerifier adapter succeeds (service role).
create or replace function public.vault_record_consent(p_guardian uuid, p_student uuid, p_method text, p_ref text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not exists (select 1 from public.student_guardians g where g.student_id = p_student
                 and g.guardian_profile_id = p_guardian and g.status = 'active') then
    raise exception 'not an active guardian' using errcode = '42501';
  end if;
  insert into public.consents (guardian_id, student_id, kind, method, version, verifier_ref)
  values (p_guardian, p_student, 'vault_vpc', p_method,
          (select value from public.app_settings where key = 'vault_consent_version'), p_ref)
  returning id into v_id;
  perform public.vault_log(p_guardian, p_student, null, 'consent', null, null);
  return v_id;
end $$;

create or replace function public.vault_has_consent(p_student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.consents c join public.student_guardians g
      on g.student_id = c.student_id and g.guardian_profile_id = c.guardian_id and g.status = 'active'
    where c.student_id = p_student and c.kind = 'vault_vpc' and c.revoked_at is null
      and c.version = (select value from public.app_settings where key = 'vault_consent_version'))
    -- sample_only consent is acceptable only because every row is is_sample (CHECK); revisit at launch gate.
$$;

create or replace function public.vault_insert_document(
  p_student uuid, p_class public.vault_class, p_title text, p_r2_key text, p_sha256 text, p_size bigint,
  p_mime text, p_ocr_text text, p_ocr_text_enc bytea, p_tags text[], p_dek uuid, p_household uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not (public.vault_can_manage(p_student) or (public.is_student_self(p_student) and not public.vault_student_controls(p_student)
          and not exists (select 1 from public.vault_student_control c where c.student_id = p_student and c.guardian_readonly_until is not null))) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_class = 'sensitive' and not public.vault_can_manage(p_student) then
    raise exception 'sensitive documents are guardian-only' using errcode = '42501';
  end if;
  if not public.vault_has_consent(p_student) then
    raise exception 'guardian consent required' using errcode = '42501';
  end if;
  if p_household is not null and not public.is_household_member(p_household) then
    raise exception 'household mismatch' using errcode = '42501';
  end if;
  if p_dek is not null and not exists (select 1 from public.household_keys k where k.id = p_dek
       and k.household_id = p_household and k.shredded_at is null) then
    raise exception 'key does not belong to household' using errcode = '42501';
  end if;
  insert into public.vault_documents (student_id, household_id, class, title, r2_key, sha256, size, mime,
    ocr_status, ocr_text, ocr_text_enc, tags, dek_id, is_sample, created_by)
  values (p_student, p_household, p_class, p_title, p_r2_key, p_sha256, p_size, p_mime,
    case when p_ocr_text is null and p_ocr_text_enc is null then 'pending' else 'done' end,
    case when p_class = 'sensitive' then null else p_ocr_text end, p_ocr_text_enc, coalesce(p_tags, '{}'),
    p_dek, true, (select auth.uid()))
  returning id into v_id;
  perform public.vault_log((select auth.uid()), p_student, v_id, 'upload', null, null);
  return v_id;
end $$;

-- Non-guardians may only raise class (DEC-23).
create or replace function public.vault_reclassify(p_doc uuid, p_class public.vault_class)
returns void language plpgsql security definer set search_path = public as $$
declare d public.vault_documents;
begin
  select * into d from public.vault_documents where id = p_doc and deleted_at is null;
  if not found or not public.can_view_vault_doc(p_doc) then raise exception 'not allowed' using errcode = '42501'; end if;
  if not public.vault_can_manage(d.student_id) and p_class < d.class then
    raise exception 'only guardians may lower a class' using errcode = '42501';
  end if;
  if p_class = 'sensitive' and d.class <> 'sensitive' then
    raise exception 'upgrade to sensitive requires re-encryption via API' using errcode = '22023';
  end if;
  update public.vault_documents set class = p_class where id = p_doc;
  perform public.vault_log((select auth.uid()), d.student_id, p_doc, 'classify', null, null);
end $$;

-- Per-doc sensitive grant: grantee must already be connected to the student (share or guardian).
create or replace function public.vault_grant_sensitive(p_doc uuid, p_grantee uuid, p_days int)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_student uuid; v_id uuid;
begin
  select student_id into v_student from public.vault_documents where id = p_doc and deleted_at is null;
  if v_student is null or not public.vault_can_manage(v_student) then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_days < 1 or p_days > 30 then raise exception 'grant must be 1..30 days' using errcode = '22023'; end if;
  if not exists (select 1 from public.shares sh where sh.student_id = v_student and sh.grantee_profile_id = p_grantee
                 and sh.revoked_at is null and (sh.expires_at is null or sh.expires_at > now()))
     and not exists (select 1 from public.student_guardians g where g.student_id = v_student
                     and g.guardian_profile_id = p_grantee and g.status = 'active') then
    raise exception 'grantee has no relationship to this student' using errcode = '42501';
  end if;
  insert into public.vault_grants (doc_id, grantee_profile_id, granted_by, expires_at)
  values (p_doc, p_grantee, (select auth.uid()), now() + make_interval(days => p_days)) returning id into v_id;
  perform public.vault_log((select auth.uid()), v_student, p_doc, 'share', null, null);
  return v_id;
end $$;

create or replace function public.vault_revoke_grant(p_grant uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_student uuid; v_doc uuid;
begin
  select d.student_id, d.id into v_student, v_doc from public.vault_grants g join public.vault_documents d on d.id = g.doc_id
   where g.id = p_grant and g.revoked_at is null;
  if v_student is null or not public.vault_can_manage(v_student) then raise exception 'not allowed' using errcode = '42501'; end if;
  update public.vault_grants set revoked_at = now() where id = p_grant;
  perform public.vault_log((select auth.uid()), v_student, v_doc, 'unshare', null, null);
end $$;

-- Soft delete: 7-day undo, purge ≤ 30 days (DEC-28).
create or replace function public.vault_request_delete(p_doc uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_student uuid;
begin
  select student_id into v_student from public.vault_documents where id = p_doc and deleted_at is null;
  if v_student is null or not (public.vault_can_manage(v_student)
     or (public.is_student_self(v_student) and coalesce(public.student_age(v_student), 0) >= 18)) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.vault_documents set deleted_at = now(), purge_after = now() + interval '7 days' where id = p_doc;
  perform public.vault_log((select auth.uid()), v_student, p_doc, 'delete', null, null);
end $$;

create or replace function public.vault_undo_delete(p_doc uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_student uuid;
begin
  select student_id into v_student from public.vault_documents
   where id = p_doc and deleted_at is not null and purge_after > now() and purge_claimed_at is null;
  if v_student is null or not public.vault_can_manage(v_student) then raise exception 'not allowed' using errcode = '42501'; end if;
  update public.vault_documents set deleted_at = null, purge_after = null where id = p_doc;
end $$;

-- Two-phase purge (service role): claim keys → API deletes R2 objects → finalize rows. Re-claims stale claims after 1 h.
create or replace function public.vault_purge_claim(p_limit int default 1000)
returns table (r2_key text) language sql security definer set search_path = public as $$
  update public.vault_documents d set purge_claimed_at = now()
   where d.id in (select id from public.vault_documents
                  where purge_after is not null and purge_after <= now()
                    and (purge_claimed_at is null or purge_claimed_at < now() - interval '1 hour')
                  order by purge_after limit least(p_limit, 1000))
  returning d.r2_key
$$;

create or replace function public.vault_purge_finalize(p_keys text[])
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with gone as (
    delete from public.vault_documents d where d.r2_key = any (p_keys) and d.purge_claimed_at is not null
    returning d.id, d.student_id)
  , logged as (insert into public.vault_access_log (actor, student_id, doc_id, action)
               select null, g.student_id, g.id, 'purge' from gone g returning 1)
  select count(*) into n from logged;
  return n;
end $$;

create or replace function public.vault_access_log_prune()
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  delete from public.vault_access_log where at < now() - interval '24 months';
  get diagnostics n = row_count;
  return n;
end $$;

-- Crypto-shred a household's keys (account closure / whole-vault delete).
create or replace function public.vault_shred_household(p_household uuid)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.household_keys set wrapped_dek = null, shredded_at = now() where household_id = p_household and shredded_at is null;
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------------------------------------------------------------------------
-- Break-glass (DEC-27)
-- ---------------------------------------------------------------------------
create or replace function public.vault_break_glass_request(p_student uuid, p_ticket text, p_reason text, p_minutes int, p_include_sensitive boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_support_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into public.vault_break_glass (student_id, requested_by, ticket_id, reason, minutes, include_sensitive)
  values (p_student, (select auth.uid()), p_ticket, p_reason, least(greatest(p_minutes, 1), 30), coalesce(p_include_sensitive, false))
  returning id into v_id;
  perform public.vault_log((select auth.uid()), p_student, null, 'break_glass_request', null, null);
  return v_id;
end $$;

create or replace function public.vault_break_glass_approve(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare b public.vault_break_glass;
begin
  if not public.is_support_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into b from public.vault_break_glass where id = p_id and approved_at is null and created_at > now() - interval '1 hour';
  if not found then raise exception 'no pending request' using errcode = '22023'; end if;
  if b.requested_by = (select auth.uid()) then raise exception 'dual control: approver must differ' using errcode = '42501'; end if;
  update public.vault_break_glass set approved_by = (select auth.uid()), approved_at = now(),
         expires_at = now() + make_interval(mins => b.minutes) where id = p_id;
  perform public.vault_log((select auth.uid()), b.student_id, null, 'break_glass_approve', null, null);
end $$;

create or replace function public.vault_break_glass_guardian_consent(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_student uuid;
begin
  select student_id into v_student from public.vault_break_glass where id = p_id and include_sensitive and ended_at is null;
  if v_student is null or not public.is_active_guardian(v_student) then raise exception 'not allowed' using errcode = '42501'; end if;
  update public.vault_break_glass set guardian_consent_by = (select auth.uid()) where id = p_id;
end $$;

create or replace function public.vault_break_glass_end(p_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.vault_break_glass set ended_at = now()
   where id = p_id and ended_at is null and (requested_by = (select auth.uid()) or approved_by = (select auth.uid()))
$$;

-- ---------------------------------------------------------------------------
-- Lifecycle jobs (service role): inactivity 24/25/26 months; age-18 notices + handover (DEC-28)
-- Returns events created this run; the API hands them to the notification queue (no emails from DB).
-- ---------------------------------------------------------------------------
create or replace function public.vault_lifecycle_run(p_now timestamptz default now())
returns table (event_student uuid, event_kind text) language plpgsql security definer set search_path = public, auth as $$
declare r record; v_kind text; v_cycle text; v_bday date;
begin
  -- Inactivity: last sign-in of ANY active guardian of students who have live vault docs
  for r in
    select s.id sid, max(u.last_sign_in_at) last_in
      from public.students s
      join public.student_guardians g on g.student_id = s.id and g.status = 'active'
      join auth.users u on u.id = g.guardian_profile_id
     where exists (select 1 from public.vault_documents d where d.student_id = s.id and d.deleted_at is null)
       and not public.vault_student_controls(s.id)
     group by s.id
  loop
    v_cycle := coalesce(to_char(r.last_in, 'YYYY-MM-DD'), 'never');
    v_kind := case when r.last_in is null or r.last_in < p_now - interval '26 months' then 'inactive_delete_26m'
                   when r.last_in < p_now - interval '25 months' then 'inactive_25m'
                   when r.last_in < p_now - interval '24 months' then 'inactive_24m' end;
    continue when v_kind is null;
    insert into public.vault_lifecycle_events (student_id, kind, cycle_key) values (r.sid, v_kind, v_cycle)
      on conflict do nothing;
    if found then
      event_student := r.sid; event_kind := v_kind; return next;
      if v_kind = 'inactive_delete_26m' then
        update public.vault_documents d set deleted_at = p_now, purge_after = p_now
         where d.student_id = r.sid and d.deleted_at is null;
      end if;
    end if;
  end loop;

  -- Age 18
  for r in
    select s.id sid, s.birth_date, s.profile_id from public.students s
     where s.birth_date is not null
       and exists (select 1 from public.vault_documents d where d.student_id = s.id and d.deleted_at is null)
       and s.birth_date + interval '18 years' <= p_now::date + 60
  loop
    v_bday := (r.birth_date + interval '18 years')::date;
    v_cycle := v_bday::text;
    v_kind := case
      when p_now::date >= v_bday + 365 and r.profile_id is null then 'age18_readonly_expired'
      when p_now::date >= v_bday and r.profile_id is not null then 'age18_transfer'
      when p_now::date >= v_bday then 'age18_readonly'
      when p_now::date >= v_bday - 14 then 'age18_14d'
      else 'age18_60d' end;
    insert into public.vault_lifecycle_events (student_id, kind, cycle_key) values (r.sid, v_kind, v_cycle)
      on conflict do nothing;
    continue when not found;
    event_student := r.sid; event_kind := v_kind; return next;
    if v_kind = 'age18_transfer' then
      insert into public.vault_student_control (student_id, controlled_by_student_at) values (r.sid, p_now)
        on conflict (student_id) do update set controlled_by_student_at = p_now, guardian_readonly_until = null, updated_at = p_now;
      perform public.vault_log(null, r.sid, null, 'transfer', null, null);
    elsif v_kind = 'age18_readonly' then
      insert into public.vault_student_control (student_id, guardian_readonly_until) values (r.sid, (v_bday + 365)::timestamptz)
        on conflict (student_id) do update set guardian_readonly_until = (v_bday + 365)::timestamptz, updated_at = p_now;
    elsif v_kind = 'age18_readonly_expired' then
      update public.vault_documents d set deleted_at = p_now, purge_after = p_now
       where d.student_id = r.sid and d.deleted_at is null;
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- RLS + grants
-- ---------------------------------------------------------------------------
alter table public.consents enable row level security;
alter table public.household_keys enable row level security;
alter table public.vault_documents enable row level security;
alter table public.vault_grants enable row level security;
alter table public.vault_access_log enable row level security;
alter table public.vault_student_control enable row level security;
alter table public.vault_break_glass enable row level security;
alter table public.vault_lifecycle_events enable row level security;

do $$ begin
  create policy vault_documents_select on public.vault_documents for select to authenticated using (public.can_view_vault_doc(id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy vault_grants_select on public.vault_grants for select to authenticated
    using (grantee_profile_id = (select auth.uid()) or granted_by = (select auth.uid()));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy vault_access_log_select on public.vault_access_log for select to authenticated
    using (public.is_active_guardian(student_id) or public.vault_student_controls(student_id) and public.is_student_self(student_id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy consents_select on public.consents for select to authenticated using (guardian_id = (select auth.uid()));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy vault_student_control_select on public.vault_student_control for select to authenticated
    using (public.is_active_guardian(student_id) or public.is_student_self(student_id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy vault_break_glass_select on public.vault_break_glass for select to authenticated
    using (public.is_support_admin() or public.is_active_guardian(student_id));
exception when duplicate_object then null; end $$;
-- household_keys, vault_lifecycle_events: no client policies (service role only).

grant select on public.vault_documents, public.vault_grants, public.vault_access_log, public.consents,
  public.vault_student_control, public.vault_break_glass to authenticated;
revoke insert, update, delete on public.vault_documents, public.vault_grants, public.vault_access_log, public.consents,
  public.household_keys, public.vault_student_control, public.vault_break_glass, public.vault_lifecycle_events from authenticated, anon;

revoke all on function public.vault_log(uuid, uuid, uuid, text, text, text), public.vault_record_consent(uuid, uuid, text, text),
  public.vault_purge_claim(int), public.vault_purge_finalize(text[]), public.vault_access_log_prune(),
  public.vault_shred_household(uuid), public.vault_lifecycle_run(timestamptz) from public, anon, authenticated;
grant execute on function public.vault_record_consent(uuid, uuid, text, text), public.vault_purge_claim(int),
  public.vault_purge_finalize(text[]), public.vault_access_log_prune(), public.vault_shred_household(uuid),
  public.vault_lifecycle_run(timestamptz) to service_role;
grant execute on function public.can_view_vault_doc(uuid), public.vault_has_consent(uuid), public.vault_can_manage(uuid),
  public.vault_log_access(uuid, text, text, text),
  public.vault_insert_document(uuid, public.vault_class, text, text, text, bigint, text, text, bytea, text[], uuid, uuid),
  public.vault_reclassify(uuid, public.vault_class), public.vault_grant_sensitive(uuid, uuid, int), public.vault_revoke_grant(uuid),
  public.vault_request_delete(uuid), public.vault_undo_delete(uuid),
  public.vault_break_glass_request(uuid, text, text, int, boolean), public.vault_break_glass_approve(uuid),
  public.vault_break_glass_guardian_consent(uuid), public.vault_break_glass_end(uuid) to authenticated;
