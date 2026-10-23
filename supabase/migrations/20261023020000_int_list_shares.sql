-- FR-08 shopping list sharing: owner (household member) shares the list with other users by email invite.
-- A share grants access to shopping_items + first-name member directory of that list ONLY (no household_members row,
-- so no other household/student data is reachable). Invite links are bearer tokens stored as sha256 hashes; the
-- invite is accepted only by a signed-in account whose auth email matches. No email is sent by the system.
-- integration-signoff: list-share (RLS tests: supabase/tests/list_share_test.sql)
-- rollback: restore si_* policies from 20261023000000_int_shopping_list.sql; drop functions list_role, create_list_invite,
--   accept_list_invite, revoke_list_share, list_shares_for, my_shared_lists; drop table public.list_shares.

create table if not exists public.list_shares (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  email text not null check (email = lower(email) and char_length(email) between 3 and 254 and email like '%@%'),
  role text not null default 'editor' check (role in ('viewer','editor')),
  status text not null default 'pending' check (status in ('pending','active','revoked')),
  token_hash text unique,
  invited_by uuid references public.profiles (id) on delete set null,
  member_profile_id uuid references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  expires_at timestamptz not null default now() + interval '14 days'
);
create unique index if not exists list_shares_open_uidx on public.list_shares (household_id, email) where status <> 'revoked';
create index if not exists list_shares_member_idx on public.list_shares (member_profile_id) where status = 'active';
create index if not exists list_shares_invited_by_idx on public.list_shares (invited_by);
alter table public.list_shares enable row level security;
revoke all on public.list_shares from anon, authenticated;
grant select (id, household_id, email, role, status, invited_by, member_profile_id, created_at, accepted_at, expires_at)
  on public.list_shares to authenticated;
drop policy if exists ls_select on public.list_shares;
create policy ls_select on public.list_shares for select to authenticated
  using (public.is_household_member(household_id) or member_profile_id = (select auth.uid()));

-- Caller's role on a list: owner (household member) > editor/viewer (active share) > null.
create or replace function public.list_role(p_household uuid) returns text
language sql stable security definer set search_path = public as $$
  select case when public.is_household_member(p_household) then 'owner' else (
    select s.role from list_shares s where s.household_id = p_household and s.status = 'active'
      and s.member_profile_id = auth.uid() limit 1) end
$$;
revoke all on function public.list_role(uuid) from public, anon;
grant execute on function public.list_role(uuid) to authenticated;

-- Items: any role reads; owner/editor write.
drop policy if exists si_all on public.shopping_items;
create policy si_all on public.shopping_items for select to authenticated using (public.list_role(household_id) is not null);
drop policy if exists si_insert on public.shopping_items;
create policy si_insert on public.shopping_items for insert to authenticated
  with check (public.list_role(household_id) in ('owner','editor') and created_by = (select auth.uid()));
drop policy if exists si_update on public.shopping_items;
create policy si_update on public.shopping_items for update to authenticated
  using (public.list_role(household_id) in ('owner','editor')) with check (public.list_role(household_id) in ('owner','editor'));
drop policy if exists si_delete on public.shopping_items;
create policy si_delete on public.shopping_items for delete to authenticated using (public.list_role(household_id) in ('owner','editor'));

-- Member directory now includes active share members (first name + role only).
create or replace function public.shopping_members(p_household uuid)
returns table (profile_id uuid, name text, role text)
language sql stable security definer set search_path = public as $$
  select x.profile_id, coalesce(nullif(split_part(coalesce(p.display_name, ''), ' ', 1), ''), 'Member'), x.role
  from (
    select m.profile_id, m.role, 0 k, m.created_at from household_members m where m.household_id = p_household
    union all
    select s.member_profile_id, s.role, 1, s.accepted_at from list_shares s
     where s.household_id = p_household and s.status = 'active' and s.member_profile_id is not null
  ) x left join profiles p on p.id = x.profile_id
  where public.list_role(p_household) is not null
  order by x.k, x.role desc, x.created_at
$$;
revoke all on function public.shopping_members(uuid) from public, anon;
grant execute on function public.shopping_members(uuid) to authenticated;

-- Owner creates (or re-issues) an invite; returns the raw token once.
create or replace function public.create_list_invite(p_household uuid, p_email text, p_role text default 'editor')
returns table (share_id uuid, token text)
language plpgsql security definer set search_path = public as $$
declare e text := lower(trim(p_email)); t text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''); sid uuid;
begin
  if auth.uid() is null or not public.is_household_member(p_household) then raise exception 'forbidden' using errcode = '42501'; end if;
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(e) > 254 then raise exception 'bad email' using errcode = '22023'; end if;
  if p_role not in ('viewer','editor') then raise exception 'bad role' using errcode = '22023'; end if;
  if (select count(*) from list_shares where household_id = p_household and status <> 'revoked') >= 20 then
    raise exception 'too many shares' using errcode = '54000'; end if;
  select id into sid from list_shares where household_id = p_household and email = e and status <> 'revoked';
  if sid is null then
    insert into list_shares (household_id, email, role, token_hash, invited_by)
      values (p_household, e, p_role, encode(sha256(convert_to(t, 'UTF8')), 'hex'), auth.uid()) returning id into sid;
  else
    update list_shares set role = p_role,
      token_hash = case when status = 'pending' then encode(sha256(convert_to(t, 'UTF8')), 'hex') else token_hash end,
      expires_at = case when status = 'pending' then now() + interval '14 days' else expires_at end
     where id = sid;
    if (select status from list_shares where id = sid) = 'active' then t := null; end if;
  end if;
  return query select sid, t;
end $$;
revoke all on function public.create_list_invite(uuid, text, text) from public, anon;
grant execute on function public.create_list_invite(uuid, text, text) to authenticated;

-- Invitee accepts with the link token; their account email must match the invite.
create or replace function public.accept_list_invite(p_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare s list_shares; e text;
begin
  if auth.uid() is null then raise exception 'unauthorized' using errcode = '42501'; end if;
  select * into s from list_shares where token_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex');
  if s.id is null or s.status = 'revoked' or (s.status = 'pending' and s.expires_at < now()) then
    raise exception 'invalid invite' using errcode = 'P0002'; end if;
  select lower(u.email) into e from auth.users u where u.id = auth.uid();
  if e is distinct from s.email then raise exception 'email mismatch' using errcode = '42501'; end if;
  if s.status = 'active' then return s.household_id; end if;
  if public.is_household_member(s.household_id) then raise exception 'already owner' using errcode = '23505'; end if;
  update list_shares set status = 'active', member_profile_id = auth.uid(), accepted_at = now(), token_hash = null where id = s.id;
  return s.household_id;
end $$;
revoke all on function public.accept_list_invite(text) from public, anon;
grant execute on function public.accept_list_invite(text) to authenticated;

-- Owner revokes any share on their list; a share member may leave (revoke their own).
create or replace function public.revoke_list_share(p_share uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update list_shares set status = 'revoked', token_hash = null
   where id = p_share and status <> 'revoked'
     and (public.is_household_member(household_id) or member_profile_id = auth.uid());
  return found;
end $$;
revoke all on function public.revoke_list_share(uuid) from public, anon;
grant execute on function public.revoke_list_share(uuid) to authenticated;

-- Lists shared with me (list name + owner first name only).
create or replace function public.my_shared_lists()
returns table (household_id uuid, share_id uuid, role text, owner_name text)
language sql stable security definer set search_path = public as $$
  select s.household_id, s.id, s.role,
    coalesce(nullif(split_part(coalesce(p.display_name, ''), ' ', 1), ''), 'Someone')
  from list_shares s left join profiles p on p.id = s.invited_by
  where s.member_profile_id = auth.uid() and s.status = 'active'
  order by s.accepted_at
$$;
revoke all on function public.my_shared_lists() from public, anon;
grant execute on function public.my_shared_lists() to authenticated;

-- Assignee may be a household member or an active share member of the same list.
create or replace function public.shopping_items_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.assigned_to is not null and not exists (
    select 1 from household_members m where m.household_id = new.household_id and m.profile_id = new.assigned_to)
    and not exists (select 1 from list_shares s where s.household_id = new.household_id and s.status = 'active'
      and s.member_profile_id = new.assigned_to and s.role = 'editor') then
    raise exception 'assignee not in household' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' then
    if new.household_id <> old.household_id or new.created_by <> old.created_by or new.source <> old.source then
      raise exception 'immutable field' using errcode = '42501';
    end if;
  end if;
  if new.done and (tg_op = 'INSERT' or not old.done) then new.done_by := auth.uid(); new.done_at := now(); end if;
  if not new.done then new.done_by := null; new.done_at := null; end if;
  new.updated_at := now();
  return new;
end $$;
revoke all on function public.shopping_items_guard() from public, anon, authenticated;
