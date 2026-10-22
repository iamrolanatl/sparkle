-- Sparkle — initial multi-tenant data model & parent-child access control
-- CR-0002 · DEC-06 · see docs/02-planning/Technical-Design-Document.md §8
-- Principles:
--   * Every academic table carries student_id; all SELECT policies go through public.can_view_student().
--   * Clients never write synced school data (classes/units/assignments/grades/sync_runs/ai_drafts):
--     only the service-role ingest worker (bypasses RLS) writes them.
--   * No admin read policies. Admin access only via audited, time-limited view-as (stubbed).
--   * School-portal credentials are NEVER stored in the database (device-default, ADR-01).

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Config (age threshold is TBD under DEC-04: 13 vs 14; placeholder 13)
-- ---------------------------------------------------------------------------
create table public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
insert into public.app_settings (key, value) values ('guardian_limit_age_threshold', '13');

-- Scopes. Core records can never be limited by the student (DEC-06 proposed default).
create type public.access_scope as enum (
  'grades', 'attendance', 'assignments', 'schedule', 'messages',   -- core: never limitable
  'daily_notes', 'ai_chat', 'resources'                            -- limitable after threshold
);

-- Helper relationships (FR-16 / DEC-07)
create type public.helper_relationship as enum (
  'parent', 'guardian', 'sibling', 'cousin', 'aunt', 'uncle', 'grandparent', 'babysitter', 'tutor', 'teacher', 'other'
);

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  birth_date date,
  profile_id uuid unique references public.profiles (id) on delete set null, -- null until student accepts invite
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.student_guardians (
  student_id uuid not null references public.students (id) on delete cascade,
  guardian_profile_id uuid not null references public.profiles (id) on delete cascade,
  relationship text not null default 'parent',
  status text not null default 'active' check (status in ('active', 'revoked')),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (student_id, guardian_profile_id)
);

create table public.shares (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  grantee_profile_id uuid not null references public.profiles (id) on delete cascade,
  scopes public.access_scope[] not null check (cardinality(scopes) > 0),
  relationship public.helper_relationship not null default 'other',
  relationship_label text check (char_length(relationship_label) <= 60),
  invitation_id uuid,
  granted_by uuid not null references public.profiles (id),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

-- One table for both flows: role 'student' links the student's own login; role 'helper' grants a
-- guardian link (relationship parent/guardian + guardian inviter) or a read-only share (everyone else).
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  email text,                                   -- null = code-only (not email-bound)
  role text not null default 'helper' check (role in ('student', 'helper')),
  relationship public.helper_relationship,
  relationship_label text check (char_length(relationship_label) <= 60),
  scopes public.access_scope[],                 -- null => default_scopes(relationship)
  code_hash text not null unique,               -- sha256 hex of link token / short code; raw code never stored
  invited_by uuid not null references public.profiles (id),
  requires_approval boolean not null default false, -- set when an under-threshold student invites
  approved_by uuid references public.profiles (id),
  approved_at timestamptz,
  expires_at timestamptz not null default now() + interval '72 hours',
  revoked_at timestamptz,
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.invitation_redeem_attempts (
  id bigint generated always as identity primary key,
  profile_id uuid not null,
  succeeded boolean not null,
  attempted_at timestamptz not null default now()
);
create index on public.invitation_redeem_attempts (profile_id, attempted_at);

create table public.guardian_access_limits (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  scope public.access_scope not null check (scope in ('daily_notes', 'ai_chat', 'resources')),
  limited_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (student_id, scope)
);

-- ---------------------------------------------------------------------------
-- Households (kept separate from academic data)
-- ---------------------------------------------------------------------------
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);
create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (household_id, profile_id)
);
create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  title text not null,
  quantity int not null default 1 check (quantity > 0),
  done boolean not null default false,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Student-authored data
-- ---------------------------------------------------------------------------
create table public.daily_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  body text not null,
  visibility text not null default 'private' check (visibility in ('private', 'guardians', 'shared')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- School data (service-role writes only)
-- ---------------------------------------------------------------------------
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  name text not null, teacher text, period text, source text,
  created_at timestamptz not null default now()
);
create table public.units (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  title text not null, is_current boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  class_id uuid references public.classes (id) on delete cascade,
  unit_id uuid references public.units (id) on delete set null,
  title text not null, due_at timestamptz, status text,
  created_at timestamptz not null default now()
);
create table public.grades (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  class_id uuid references public.classes (id) on delete cascade,
  assignment_id uuid references public.assignments (id) on delete cascade,
  score numeric, max_score numeric, letter text,
  recorded_at timestamptz not null default now()
);
create table public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  source text not null, status text not null, error_class text,
  started_at timestamptz not null default now(), finished_at timestamptz
);
create table public.ai_drafts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  kind text not null, body text not null,
  confirmed_at timestamptz, -- ADR-04: nothing is sent without explicit confirmation
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Admin audit (no client access at all)
-- ---------------------------------------------------------------------------
create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor uuid, action text not null, target_student_id uuid, reason text,
  expires_at timestamptz, created_at timestamptz not null default now()
);

create table public.share_audit_log (
  id bigint generated always as identity primary key,
  share_id uuid, student_id uuid not null, actor uuid, action text not null check (action in ('grant', 'revoke')),
  relationship public.helper_relationship, scopes public.access_scope[],
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Access functions
-- ---------------------------------------------------------------------------
create or replace function public.student_age(p_student uuid)
returns int language sql stable security definer set search_path = public as $$
  select extract(year from age(current_date, birth_date))::int from public.students where id = p_student
$$;

create or replace function public.is_active_guardian(p_student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.student_guardians g
    where g.student_id = p_student and g.guardian_profile_id = auth.uid() and g.status = 'active')
$$;

create or replace function public.is_primary_guardian(p_student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.student_guardians g
    where g.student_id = p_student and g.guardian_profile_id = auth.uid() and g.status = 'active' and g.is_primary)
$$;

create or replace function public.is_student_self(p_student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.students s where s.id = p_student and s.profile_id = auth.uid())
$$;

-- The single gate used by every academic SELECT policy.
create or replace function public.can_view_student(p_student uuid, p_scope public.access_scope)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    public.is_student_self(p_student)
    or (
      public.is_active_guardian(p_student)
      and not (
        coalesce(public.student_age(p_student), 0) >=
          (select value::int from public.app_settings where key = 'guardian_limit_age_threshold')
        and exists (select 1 from public.guardian_access_limits l
                    where l.student_id = p_student and l.scope = p_scope)
      )
    )
    or exists (
      select 1 from public.shares sh
      where sh.student_id = p_student and sh.grantee_profile_id = auth.uid()
        and sh.revoked_at is null and (sh.expires_at is null or sh.expires_at > now())
        and p_scope = any (sh.scopes))
  )
$$;

create or replace function public.is_household_member(p_household uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.household_members m where m.household_id = p_household and m.profile_id = auth.uid())
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email), new.raw_user_meta_data ->> 'avatar_url')
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Creator of a student becomes its primary guardian.
create or replace function public.handle_new_student()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.student_guardians (student_id, guardian_profile_id, is_primary)
  values (new.id, new.created_by, true) on conflict do nothing;
  return new;
end $$;
create trigger on_student_created after insert on public.students
  for each row execute function public.handle_new_student();

create or replace function public.handle_new_household()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.household_members (household_id, profile_id) values (new.id, new.created_by) on conflict do nothing;
  return new;
end $$;
create trigger on_household_created after insert on public.households
  for each row execute function public.handle_new_household();

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------
-- Default read-only scopes per relationship (DEC-07). Teachers/tutors: academic only.
create or replace function public.default_scopes(p_rel public.helper_relationship)
returns public.access_scope[] language sql immutable as $$
  select case when p_rel in ('teacher', 'tutor')
    then array['grades', 'attendance', 'assignments', 'schedule']::public.access_scope[]
    else array['grades', 'attendance', 'assignments', 'schedule', 'messages']::public.access_scope[] end
$$;

create or replace function public.student_at_or_over_threshold(p_student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.student_age(p_student), 0) >=
         (select value::int from public.app_settings where key = 'guardian_limit_age_threshold')
$$;

-- Invitation insert guard: guardians always; the student only for helpers, needing guardian approval under threshold.
create or replace function public.handle_new_invitation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.approved_by := null; new.approved_at := null; new.accepted_at := null; new.accepted_by := null; new.revoked_at := null;
  if new.role = 'helper' and new.relationship is null then raise exception 'relationship required'; end if;
  if new.relationship in ('teacher', 'tutor') then
    -- academic only, whatever was requested
    new.scopes := array(select unnest(coalesce(new.scopes, public.default_scopes(new.relationship)))
                        intersect select unnest(public.default_scopes(new.relationship)));
  end if;
  if public.is_active_guardian(new.student_id) then
    new.requires_approval := false;
  elsif public.is_student_self(new.student_id) and new.role = 'helper' then
    new.requires_approval := not public.student_at_or_over_threshold(new.student_id);
  else
    raise exception 'not allowed to invite for this student';
  end if;
  return new;
end $$;
create trigger on_invitation_created before insert on public.invitations
  for each row execute function public.handle_new_invitation();

create or replace function public.approve_invitation(p_invitation uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.invitations set approved_by = auth.uid(), approved_at = now()
   where id = p_invitation and requires_approval and approved_at is null and public.is_active_guardian(student_id);
  if not found then raise exception 'cannot approve'; end if;
end $$;

-- Redeem an invitation by its raw code (email link token or short code). Single use, expiring,
-- email-bound when email is set, rate-limited to 5 failed attempts per 15 minutes per user.
create or replace function public.redeem_invitation(p_code text)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare inv public.invitations; v_email text; v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if (select count(*) from public.invitation_redeem_attempts
       where profile_id = v_uid and not succeeded and attempted_at > now() - interval '15 minutes') >= 5 then
    raise exception 'too many attempts, try again later';
  end if;
  select * into inv from public.invitations
   where code_hash = encode(sha256(convert_to(upper(trim(p_code)), 'UTF8')), 'hex')
     and accepted_at is null and revoked_at is null and expires_at > now()
     and (not requires_approval or approved_at is not null)
   for update;
  if not found then
    insert into public.invitation_redeem_attempts (profile_id, succeeded) values (v_uid, false);
    return null; -- generic failure (no enumeration); caller shows "invalid or expired"
  end if;
  select email into v_email from auth.users where id = v_uid;
  if inv.email is not null and lower(inv.email) <> lower(coalesce(v_email, '')) then
    insert into public.invitation_redeem_attempts (profile_id, succeeded) values (v_uid, false);
    return null;
  end if;

  if inv.role = 'student' then
    update public.students set profile_id = v_uid where id = inv.student_id and profile_id is null;
    if not found then raise exception 'student already linked'; end if;
  elsif inv.relationship in ('parent', 'guardian') and exists (
          select 1 from public.student_guardians g where g.student_id = inv.student_id
          and g.guardian_profile_id = inv.invited_by and g.status = 'active') then
    insert into public.student_guardians (student_id, guardian_profile_id, relationship)
    values (inv.student_id, v_uid, inv.relationship::text)
    on conflict (student_id, guardian_profile_id) do update set status = 'active';
  else
    insert into public.shares (student_id, grantee_profile_id, scopes, relationship, relationship_label, invitation_id, granted_by)
    values (inv.student_id, v_uid, coalesce(inv.scopes, public.default_scopes(inv.relationship)),
            inv.relationship, inv.relationship_label, inv.id, inv.invited_by);
  end if;
  update public.invitations set accepted_at = now(), accepted_by = v_uid where id = inv.id;
  insert into public.invitation_redeem_attempts (profile_id, succeeded) values (v_uid, true);
  return inv.student_id;
end $$;

-- Audit share grant + revoke
create or replace function public.audit_share()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.share_audit_log (share_id, student_id, actor, action, relationship, scopes)
    values (new.id, new.student_id, coalesce(auth.uid(), new.granted_by), 'grant', new.relationship, new.scopes);
  elsif new.revoked_at is not null and old.revoked_at is null then
    insert into public.share_audit_log (share_id, student_id, actor, action, relationship, scopes)
    values (new.id, new.student_id, auth.uid(), 'revoke', new.relationship, new.scopes);
  end if;
  return new;
end $$;
create trigger on_share_change after insert or update on public.shares
  for each row execute function public.audit_share();

-- Admin view-as (STUB): audited and time-limited; grants no data access yet.
-- Real implementation (Phase 4) requires admin SSO + hardware MFA, student/guardian consent, visible banner.
create or replace function public.admin_request_view_as(p_student uuid, p_reason text, p_minutes int default 15)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'support_admin' then
    raise exception 'forbidden';
  end if;
  if p_reason is null or length(trim(p_reason)) < 10 then raise exception 'reason required'; end if;
  insert into public.admin_audit_log (actor, action, target_student_id, reason, expires_at)
  values (auth.uid(), 'view_as_requested', p_student, p_reason, now() + make_interval(mins => least(p_minutes, 30)))
  returning id into v_id;
  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- Grants (least privilege) + RLS
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon;
grant execute on function public.can_view_student(uuid, public.access_scope), public.redeem_invitation(text),
  public.approve_invitation(uuid), public.default_scopes(public.helper_relationship), public.student_at_or_over_threshold(uuid),
  public.admin_request_view_as(uuid, text, int), public.student_age(uuid), public.is_active_guardian(uuid),
  public.is_primary_guardian(uuid), public.is_student_self(uuid), public.is_household_member(uuid) to authenticated;

alter table public.app_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.student_guardians enable row level security;
alter table public.shares enable row level security;
alter table public.invitations enable row level security;
alter table public.guardian_access_limits enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.shopping_items enable row level security;
alter table public.daily_notes enable row level security;
alter table public.classes enable row level security;
alter table public.units enable row level security;
alter table public.assignments enable row level security;
alter table public.grades enable row level security;
alter table public.sync_runs enable row level security;
alter table public.ai_drafts enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.share_audit_log enable row level security;
alter table public.invitation_redeem_attempts enable row level security;

-- app_settings: readable, never client-writable
grant select on public.app_settings to authenticated;
create policy app_settings_read on public.app_settings for select to authenticated using (true);

-- profiles: self; plus people linked to a student you can see (names only, for access lists)
grant select, update (display_name, avatar_url) on public.profiles to authenticated;
create policy profiles_self on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_linked on public.profiles for select to authenticated using (
  exists (select 1 from public.student_guardians g where g.guardian_profile_id = profiles.id
          and (public.is_student_self(g.student_id) or public.is_active_guardian(g.student_id)))
  or exists (select 1 from public.shares sh where sh.grantee_profile_id = profiles.id and public.is_student_self(sh.student_id))
  or exists (select 1 from public.students s where s.profile_id = profiles.id and public.is_active_guardian(s.id)));
create policy profiles_update_self on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- students
grant select, insert, update (display_name, birth_date) on public.students to authenticated;
create policy students_select on public.students for select to authenticated using (
  public.can_view_student(id, 'schedule') or created_by = auth.uid());
create policy students_insert on public.students for insert to authenticated with check (created_by = auth.uid() and profile_id is null);
create policy students_update on public.students for update to authenticated using (public.is_active_guardian(id) or public.is_student_self(id));

-- student_guardians: student and guardians can see the link list; primary guardian can revoke others
grant select, update (status) on public.student_guardians to authenticated;
create policy sg_select on public.student_guardians for select to authenticated using (
  guardian_profile_id = auth.uid() or public.is_student_self(student_id) or public.is_active_guardian(student_id));
create policy sg_revoke on public.student_guardians for update to authenticated using (public.is_primary_guardian(student_id));

-- shares: the student's visible access list
grant select, insert, update (revoked_at) on public.shares to authenticated;
create policy shares_select on public.shares for select to authenticated using (
  grantee_profile_id = auth.uid() or public.is_student_self(student_id) or public.is_active_guardian(student_id));
create policy shares_insert on public.shares for insert to authenticated with check (
  granted_by = auth.uid() and (public.is_student_self(student_id) or public.is_active_guardian(student_id)));
create policy shares_revoke on public.shares for update to authenticated using (
  granted_by = auth.uid() or public.is_active_guardian(student_id)
  or (public.is_student_self(student_id) and public.student_at_or_over_threshold(student_id)));

-- invitations: guardians see/manage all for the student; the student sees their own; insert rules in trigger
grant select, insert, update (revoked_at) on public.invitations to authenticated;
create policy inv_select on public.invitations for select to authenticated using (
  public.is_active_guardian(student_id) or invited_by = auth.uid());
create policy inv_insert on public.invitations for insert to authenticated with check (
  invited_by = auth.uid() and (public.is_active_guardian(student_id) or public.is_student_self(student_id)));
create policy inv_revoke on public.invitations for update to authenticated using (
  invited_by = auth.uid() or public.is_active_guardian(student_id));
-- share_audit_log: student and guardians can read the history for their student
grant select on public.share_audit_log to authenticated;
create policy sal_select on public.share_audit_log for select to authenticated using (
  public.is_student_self(student_id) or public.is_active_guardian(student_id));

-- guardian_access_limits: student sets after threshold; guardians always SEE limits ("limited by student")
grant select, insert, delete on public.guardian_access_limits to authenticated;
create policy gal_select on public.guardian_access_limits for select to authenticated using (
  public.is_student_self(student_id) or public.is_active_guardian(student_id));
create policy gal_insert on public.guardian_access_limits for insert to authenticated with check (
  limited_by = auth.uid() and public.is_student_self(student_id)
  and coalesce(public.student_age(student_id), 0) >=
      (select value::int from public.app_settings where key = 'guardian_limit_age_threshold'));
create policy gal_delete on public.guardian_access_limits for delete to authenticated using (public.is_student_self(student_id));

-- households
grant select, insert on public.households to authenticated;
create policy hh_select on public.households for select to authenticated using (public.is_household_member(id) or created_by = auth.uid());
create policy hh_insert on public.households for insert to authenticated with check (created_by = auth.uid());
grant select, insert, delete on public.household_members to authenticated;
create policy hm_select on public.household_members for select to authenticated using (public.is_household_member(household_id));
create policy hm_insert on public.household_members for insert to authenticated with check (public.is_household_member(household_id));
create policy hm_delete on public.household_members for delete to authenticated using (public.is_household_member(household_id));
grant select, insert, update, delete on public.shopping_items to authenticated;
create policy si_all on public.shopping_items for all to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id) and created_by = auth.uid());

-- daily_notes: default private
grant select, insert, update, delete on public.daily_notes to authenticated;
create policy dn_select on public.daily_notes for select to authenticated using (
  public.is_student_self(student_id)
  or (visibility in ('guardians', 'shared') and public.is_active_guardian(student_id) and public.can_view_student(student_id, 'daily_notes'))
  or (visibility = 'shared' and public.can_view_student(student_id, 'daily_notes')));
create policy dn_write on public.daily_notes for insert to authenticated with check (public.is_student_self(student_id));
create policy dn_update on public.daily_notes for update to authenticated using (public.is_student_self(student_id)) with check (public.is_student_self(student_id));
create policy dn_delete on public.daily_notes for delete to authenticated using (public.is_student_self(student_id));

-- school data: SELECT only, via can_view_student; NO client insert/update/delete
grant select on public.classes, public.units, public.assignments, public.grades, public.sync_runs, public.ai_drafts to authenticated;
create policy classes_select on public.classes for select to authenticated using (public.can_view_student(student_id, 'schedule'));
create policy units_select on public.units for select to authenticated using (public.can_view_student(student_id, 'assignments'));
create policy assignments_select on public.assignments for select to authenticated using (public.can_view_student(student_id, 'assignments'));
create policy grades_select on public.grades for select to authenticated using (public.can_view_student(student_id, 'grades'));
create policy sync_runs_select on public.sync_runs for select to authenticated using (public.can_view_student(student_id, 'schedule'));
create policy ai_drafts_select on public.ai_drafts for select to authenticated using (public.can_view_student(student_id, 'messages'));
-- admin_audit_log: no policies => no client access.

-- ---------------------------------------------------------------------------
-- Marketing waitlist (FR-17): insert-only for anon/authenticated; readable only by service role.
-- ---------------------------------------------------------------------------
create table public.waitlist (
  id bigint generated always as identity primary key,
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  role_hint text check (role_hint in ('parent', 'student', 'educator', 'other')),
  source text not null default 'landing' check (char_length(source) <= 40),
  ip_hash text check (char_length(ip_hash) <= 64), -- sha256 of client IP, set server-side; for rate limiting only
  created_at timestamptz not null default now()
);
create unique index waitlist_email_unique on public.waitlist (lower(email));
create index on public.waitlist (ip_hash, created_at);

create or replace function public.waitlist_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.created_at := now();
  if new.ip_hash is not null and (select count(*) from public.waitlist
       where ip_hash = new.ip_hash and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'rate limited' using errcode = 'P0429';
  end if;
  return new;
end $$;
create trigger waitlist_rate_limit before insert on public.waitlist
  for each row execute function public.waitlist_rate_limit();

alter table public.waitlist enable row level security;
grant insert (email, role_hint, source, ip_hash) on public.waitlist to anon, authenticated;
create policy waitlist_insert on public.waitlist for insert to anon, authenticated with check (true);
-- No SELECT/UPDATE/DELETE grants or policies: only service_role (bypasses RLS) can read.
