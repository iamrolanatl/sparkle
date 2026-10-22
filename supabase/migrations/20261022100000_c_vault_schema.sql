-- Team C · FR-24 School mail vault schema (WBS 6.8.3–6.8.6; DEC-20..39, DEC-140..)
-- Additive only. Vault stays behind feature flag vault_enabled=false (DEC-37); sample data only.
-- rollback: (requires a CR) remove functions public.vault_purge_due(), public.vault_request_delete(uuid),
--   public.vault_log(uuid,uuid,text,text,text), public.vault_grant_sensitive(uuid,uuid,int),
--   public.can_view_vault_doc(uuid), public.vault_insert_document(...);
--   then tables public.vault_access_log, public.vault_grants, public.vault_documents,
--   public.household_keys, public.consents and type public.vault_class.

do $$ begin
  create type public.vault_class as enum ('standard', 'academic', 'sensitive');
exception when duplicate_object then null; end $$;

create table if not exists public.consents (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  kind text not null check (kind in ('vault_vpc', 'third_party_ai')),
  method text not null check (method in ('card_verification', 'id_face_match', 'sample_only')),
  version text not null,
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
  shredded_at timestamptz
);
create index if not exists household_keys_household_idx on public.household_keys (household_id);

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
  size bigint not null check (size > 0 and size <= 26214400),
  mime text not null check (mime in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic')),
  ocr_status text not null default 'pending' check (ocr_status in ('pending', 'done', 'failed', 'skipped')),
  ocr_text text,                            -- plaintext only for standard/academic (redacted)
  ocr_text_enc bytea,                       -- sensitive: ciphertext only
  ocr_tsv tsvector generated always as (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(ocr_text, ''))) stored,
  tags text[] not null default '{}',
  dek_id uuid references public.household_keys (id),
  is_sample boolean not null default true,  -- DEC-37: only synthetic docs until launch gate
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  purge_after timestamptz,
  constraint sensitive_no_plaintext check (class <> 'sensitive' or (ocr_text is null and dek_id is not null)),
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

-- Append-only (DEC-26): no content, minimal fields.
create table if not exists public.vault_access_log (
  id bigint generated always as identity primary key,
  actor uuid,
  student_id uuid not null,
  doc_id uuid,
  action text not null check (action in ('upload','view','download','share','unshare','classify','ocr','ai_use','delete','export','purge')),
  ip_hash text,
  user_agent text check (char_length(user_agent) <= 300),
  at timestamptz not null default now()
);
create index if not exists vault_access_log_student_idx on public.vault_access_log (student_id, at desc);
create index if not exists vault_access_log_actor_idx on public.vault_access_log (actor, at desc);

-- Access rule: can_view_student AND class rule (Plan §5, DEC-23).
create or replace function public.can_view_vault_doc(p_doc uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.vault_documents d
    where d.id = p_doc and d.deleted_at is null and (select auth.uid()) is not null and (
      case d.class
        when 'standard' then public.can_view_student(d.student_id, 'messages')
        when 'academic' then public.can_view_student(d.student_id, 'grades')
        else public.is_active_guardian(d.student_id)
          or exists (select 1 from public.vault_grants g where g.doc_id = d.id
                     and g.grantee_profile_id = (select auth.uid())
                     and g.revoked_at is null and g.expires_at > now())
      end))
$$;

create or replace function public.vault_log(p_student uuid, p_doc uuid, p_action text, p_ip_hash text, p_ua text)
returns void language sql security definer set search_path = public as $$
  insert into public.vault_access_log (actor, student_id, doc_id, action, ip_hash, user_agent)
  values ((select auth.uid()), p_student, p_doc, p_action, p_ip_hash, left(p_ua, 300))
$$;

-- NOTE for migration lint: UPDATE/DELETE below are runtime function bodies (user-initiated delete/purge),
-- not data rewrites executed by this migration.
-- Writes only via SECURITY DEFINER RPCs. Sensitive uploads by guardians only; VPC consent required.
create or replace function public.vault_insert_document(
  p_student uuid, p_class public.vault_class, p_title text, p_r2_key text, p_sha256 text, p_size bigint,
  p_mime text, p_ocr_text text, p_ocr_text_enc bytea, p_tags text[], p_dek uuid, p_household uuid, p_is_sample boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not (public.is_active_guardian(p_student) or public.is_student_self(p_student)) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_class = 'sensitive' and not public.is_active_guardian(p_student) then
    raise exception 'sensitive documents are guardian-only' using errcode = '42501';
  end if;
  if not exists (select 1 from public.consents c where c.student_id = p_student and c.kind = 'vault_vpc' and c.revoked_at is null) then
    raise exception 'guardian consent required' using errcode = '42501';
  end if;
  insert into public.vault_documents (student_id, household_id, class, title, r2_key, sha256, size, mime,
    ocr_status, ocr_text, ocr_text_enc, tags, dek_id, is_sample, created_by)
  values (p_student, p_household, p_class, p_title, p_r2_key, p_sha256, p_size, p_mime,
    case when p_ocr_text is null and p_ocr_text_enc is null then 'pending' else 'done' end,
    case when p_class = 'sensitive' then null else p_ocr_text end, p_ocr_text_enc, coalesce(p_tags, '{}'),
    p_dek, coalesce(p_is_sample, true), (select auth.uid()))
  returning id into v_id;
  perform public.vault_log(p_student, v_id, 'upload', null, null);
  return v_id;
end $$;

-- Non-guardians may only raise class (DEC-23).
create or replace function public.vault_reclassify(p_doc uuid, p_class public.vault_class)
returns void language plpgsql security definer set search_path = public as $$
declare d public.vault_documents;
begin
  select * into d from public.vault_documents where id = p_doc and deleted_at is null;
  if not found or not public.can_view_vault_doc(p_doc) then raise exception 'not allowed' using errcode = '42501'; end if;
  if not public.is_active_guardian(d.student_id) and p_class < d.class then
    raise exception 'only guardians may lower a class' using errcode = '42501';
  end if;
  if p_class = 'sensitive' and d.class <> 'sensitive' then
    raise exception 'upgrade to sensitive requires re-encryption via API' using errcode = '22023';
  end if;
  update public.vault_documents set class = p_class where id = p_doc;
  perform public.vault_log(d.student_id, p_doc, 'classify', null, null);
end $$;

create or replace function public.vault_grant_sensitive(p_doc uuid, p_grantee uuid, p_days int)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_student uuid; v_id uuid;
begin
  select student_id into v_student from public.vault_documents where id = p_doc and deleted_at is null;
  if v_student is null or not public.is_active_guardian(v_student) then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_days < 1 or p_days > 30 then raise exception 'grant must be 1..30 days' using errcode = '22023'; end if;
  insert into public.vault_grants (doc_id, grantee_profile_id, granted_by, expires_at)
  values (p_doc, p_grantee, (select auth.uid()), now() + make_interval(days => p_days)) returning id into v_id;
  perform public.vault_log(v_student, p_doc, 'share', null, null);
  return v_id;
end $$;

-- Soft delete: 7-day undo, purge ≤ 30 days (DEC-28). Guardians or adult students only.
create or replace function public.vault_request_delete(p_doc uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_student uuid;
begin
  select student_id into v_student from public.vault_documents where id = p_doc and deleted_at is null;
  if v_student is null or not (public.is_active_guardian(v_student)
     or (public.is_student_self(v_student) and coalesce(public.student_age(v_student), 0) >= 18)) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.vault_documents set deleted_at = now(), purge_after = now() + interval '7 days' where id = p_doc;
  perform public.vault_log(v_student, p_doc, 'delete', null, null);
end $$;

-- Service-role job: returns R2 keys whose rows were hard-deleted; caller deletes the objects.
create or replace function public.vault_purge_due()
returns table (r2_key text) language plpgsql security definer set search_path = public as $$
begin
  return query
  with gone as (
    delete from public.vault_documents d where d.purge_after is not null and d.purge_after <= now()
    returning d.id, d.student_id, d.r2_key)
  , logged as (insert into public.vault_access_log (actor, student_id, doc_id, action)
               select null, g.student_id, g.id, 'purge' from gone g)
  select g.r2_key from gone g;
end $$;

alter table public.consents enable row level security;
alter table public.household_keys enable row level security;
alter table public.vault_documents enable row level security;
alter table public.vault_grants enable row level security;
alter table public.vault_access_log enable row level security;

do $$ begin
  create policy vault_documents_select on public.vault_documents for select to authenticated
  using (public.can_view_vault_doc(id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy vault_grants_select on public.vault_grants for select to authenticated
  using (grantee_profile_id = (select auth.uid()) or granted_by = (select auth.uid()));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy vault_access_log_select on public.vault_access_log for select to authenticated
  using (public.is_active_guardian(student_id));
exception when duplicate_object then null; end $$;  -- "who viewed what" (DEC-26)
do $$ begin
  create policy consents_select on public.consents for select to authenticated
  using (guardian_id = (select auth.uid()));
exception when duplicate_object then null; end $$;
-- household_keys: no client policies (service role only).

grant select on public.vault_documents, public.vault_grants, public.vault_access_log, public.consents to authenticated;
revoke insert, update, delete on public.vault_documents, public.vault_grants, public.vault_access_log,
  public.consents, public.household_keys from authenticated, anon;
revoke all on function public.vault_purge_due() from public, authenticated, anon;
grant execute on function public.vault_purge_due() to service_role;
revoke all on function public.vault_log(uuid, uuid, text, text, text) from public, anon;
grant execute on function public.vault_log(uuid, uuid, text, text, text), public.can_view_vault_doc(uuid),
  public.vault_insert_document(uuid, public.vault_class, text, text, text, bigint, text, text, bytea, text[], uuid, uuid, boolean),
  public.vault_reclassify(uuid, public.vault_class), public.vault_grant_sensitive(uuid, uuid, int),
  public.vault_request_delete(uuid) to authenticated;
