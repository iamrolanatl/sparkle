-- FR-08 / F-09 shared shopping list (approved mockup sparkle-list-vault). Kept separate from academic data (TDD §8):
-- items carry a free-text class label only, never a link to grades/assignments.
-- integration-signoff: list-vault (RLS tests: supabase/tests/shopping_int_test.sql)
-- rollback: alter table public.shopping_items drop column if exists category, class_label, notes, assigned_to, done_by, done_at, source, position, updated_at;
--   drop function if exists public.household_for_student(uuid), public.shopping_members(uuid), public.shopping_items_guard();
--   drop policy si_select/si_insert/si_update/si_delete and recreate si_all; restore hm_insert/hm_delete from initial_tenant_model.

-- 1) Membership is managed only by household_for_student() (was: any member could add any profile).
alter table public.household_members
  add column if not exists role text not null default 'guardian' check (role in ('guardian','student')),
  add column if not exists student_id uuid references public.students (id) on delete cascade;
alter table public.households add column if not exists student_id uuid references public.students (id) on delete set null;
create unique index if not exists households_student_uidx on public.households (student_id) where student_id is not null;
drop policy if exists hm_insert on public.household_members;
create policy hm_insert on public.household_members for insert to authenticated with check (false);
drop policy if exists hm_delete on public.household_members;
create policy hm_delete on public.household_members for delete to authenticated using (profile_id = (select auth.uid()));
revoke insert on public.household_members from authenticated;

-- 2) Item fields
alter table public.shopping_items
  add column if not exists category text not null default 'household' check (category in ('school','household')),
  add column if not exists class_label text check (class_label is null or char_length(class_label) <= 60),
  add column if not exists notes text check (notes is null or char_length(notes) <= 280),
  add column if not exists assigned_to uuid references public.profiles (id) on delete set null,
  add column if not exists done_by uuid references public.profiles (id) on delete set null,
  add column if not exists done_at timestamptz,
  add column if not exists source text not null default 'manual' check (source in ('manual','teacher_post')),
  add column if not exists position int not null default 0,
  add column if not exists updated_at timestamptz not null default now();
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'shopping_title_len') then
    alter table public.shopping_items add constraint shopping_title_len check (char_length(title) between 1 and 120) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'shopping_qty_max') then
    alter table public.shopping_items add constraint shopping_qty_max check (quantity <= 999) not valid;
  end if;
end $$;
create index if not exists shopping_items_list_idx on public.shopping_items (household_id, done, position);
create index if not exists shopping_items_assigned_idx on public.shopping_items (assigned_to);
create index if not exists shopping_items_done_by_idx on public.shopping_items (done_by);
create index if not exists household_members_student_idx on public.household_members (student_id);

create or replace function public.shopping_items_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.assigned_to is not null and not exists (
    select 1 from household_members m where m.household_id = new.household_id and m.profile_id = new.assigned_to) then
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
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'shopping_items_guard') then
    create trigger shopping_items_guard before insert or update on public.shopping_items
      for each row execute function public.shopping_items_guard();
  end if;
end $$;

-- 3) RLS: members read/update/delete; inserts must be self-authored.
drop policy if exists si_all on public.shopping_items;
create policy si_all on public.shopping_items for select to authenticated using (public.is_household_member(household_id));
drop policy if exists si_insert on public.shopping_items;
create policy si_insert on public.shopping_items for insert to authenticated
  with check (public.is_household_member(household_id) and created_by = (select auth.uid()));
drop policy if exists si_update on public.shopping_items;
create policy si_update on public.shopping_items for update to authenticated
  using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
drop policy if exists si_delete on public.shopping_items;
create policy si_delete on public.shopping_items for delete to authenticated using (public.is_household_member(household_id));

-- 4) Family list for a student: active guardians + the linked student. Membership re-synced on each call.
create or replace function public.household_for_student(p_student uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare h uuid;
begin
  if auth.uid() is null or (
     not exists (select 1 from student_guardians g where g.student_id = p_student and g.guardian_profile_id = auth.uid() and g.status = 'active')
     and not exists (select 1 from students s where s.id = p_student and s.profile_id = auth.uid())) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select id into h from households where student_id = p_student;
  if h is null then
    insert into households (name, created_by, student_id) values ('Family list', auth.uid(), p_student)
      on conflict do nothing returning id into h;
    if h is null then select id into h from households where student_id = p_student; end if;
  end if;
  insert into household_members (household_id, profile_id, role, student_id)
    select h, g.guardian_profile_id, 'guardian', p_student from student_guardians g
     where g.student_id = p_student and g.status = 'active'
    union
    select h, s.profile_id, 'student', p_student from students s where s.id = p_student and s.profile_id is not null
  on conflict (household_id, profile_id) do update set role = excluded.role, student_id = excluded.student_id;
  delete from household_members m where m.household_id = h
    and not exists (select 1 from student_guardians g where g.student_id = p_student and g.guardian_profile_id = m.profile_id and g.status = 'active')
    and not exists (select 1 from students s where s.id = p_student and s.profile_id = m.profile_id);
  return h;
end $$;
revoke all on function public.household_for_student(uuid) from public, anon;
grant execute on function public.household_for_student(uuid) to authenticated;

-- Minimal member directory (first name + role) for avatars; members only.
create or replace function public.shopping_members(p_household uuid)
returns table (profile_id uuid, name text, role text)
language sql stable security definer set search_path = public as $$
  select m.profile_id, coalesce(nullif(split_part(coalesce(p.display_name, ''), ' ', 1), ''), 'Member'), m.role
  from household_members m left join profiles p on p.id = m.profile_id
  where m.household_id = p_household and public.is_household_member(p_household)
  order by m.role desc, m.created_at
$$;
revoke all on function public.shopping_members(uuid) from public, anon;
grant execute on function public.shopping_members(uuid) to authenticated;

-- 5) Realtime change signal (RLS-filtered). Default replica identity: DELETE events carry only the id.
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'shopping_items') then
    alter publication supabase_realtime add table public.shopping_items;
  end if;
end $$;
