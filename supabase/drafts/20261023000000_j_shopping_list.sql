-- DRAFT (not applied). FR-08 / F-09 shared shopping list. Move to supabase/migrations after Rolan approves the mockup.
-- Builds on households / household_members / shopping_items (initial_tenant_model). Kept separate from academic data (TDD §8).

-- 1) Tighten membership: today hm_insert lets ANY member add ANY profile. Replace with RPC-only adds.
drop policy if exists hm_insert on public.household_members;
revoke insert on public.household_members from authenticated;
alter table public.household_members
  add column if not exists role text not null default 'guardian' check (role in ('guardian','student')),
  add column if not exists student_id uuid references public.students (id) on delete cascade;

-- one household per student family; link student so membership follows student_guardians
alter table public.households add column if not exists student_id uuid references public.students (id) on delete set null;

-- 2) Items: categories, assignee, notes, check-off audit, soft delete, ordering
alter table public.shopping_items
  add column if not exists category text not null default 'household' check (category in ('school','household')),
  add column if not exists class_label text check (char_length(class_label) <= 60),   -- display label only, no FK to grades (no leakage)
  add column if not exists notes text check (char_length(notes) <= 280),
  add column if not exists assigned_to uuid references public.profiles (id),
  add column if not exists done_by uuid references public.profiles (id),
  add column if not exists done_at timestamptz,
  add column if not exists source text not null default 'manual' check (source in ('manual','teacher_post')),
  add column if not exists position int not null default 0,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;
alter table public.shopping_items add constraint shopping_title_len check (char_length(title) between 1 and 120) not valid;
alter table public.shopping_items add constraint shopping_qty_max check (quantity <= 999) not valid;
create index if not exists shopping_items_live_idx on public.shopping_items (household_id, done, position) where deleted_at is null;

-- assignee must be a member of the same household
create or replace function public.shopping_items_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.assigned_to is not null and not exists (select 1 from household_members m where m.household_id = new.household_id and m.profile_id = new.assigned_to) then
    raise exception 'assignee not in household' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' then
    if new.household_id <> old.household_id or new.created_by <> old.created_by then raise exception 'immutable' using errcode='42501'; end if;
    if new.done and not old.done then new.done_by := auth.uid(); new.done_at := now(); end if;
    if not new.done then new.done_by := null; new.done_at := null; end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists shopping_items_guard on public.shopping_items;
create trigger shopping_items_guard before insert or update on public.shopping_items for each row execute function public.shopping_items_guard();

-- 3) RLS: any member reads/updates/soft-deletes; insert must be self-authored. Hard delete: service role only (soft delete via update).
drop policy if exists si_all on public.shopping_items;
revoke delete on public.shopping_items from authenticated;
create policy si_select on public.shopping_items for select to authenticated using (public.is_household_member(household_id) and deleted_at is null);
create policy si_insert on public.shopping_items for insert to authenticated with check (public.is_household_member(household_id) and created_by = auth.uid());
create policy si_update on public.shopping_items for update to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));

-- 4) Membership RPCs (guardian of the household's student only; student joins via existing invite flow)
create or replace function public.household_for_student(p_student uuid) returns uuid language plpgsql security definer set search_path = public as $$
declare h uuid;
begin
  if not exists (select 1 from student_guardians g where g.student_id = p_student and g.guardian_profile_id = auth.uid() and g.status='active')
     and not exists (select 1 from students s where s.id = p_student and s.profile_id = auth.uid()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select id into h from households where student_id = p_student limit 1;
  if h is null then
    insert into households (name, created_by, student_id) values ('Family list', auth.uid(), p_student) returning id into h;
  end if;
  -- sync membership from the family model: active guardians + linked student
  insert into household_members (household_id, profile_id, role, student_id)
    select h, g.guardian_profile_id, 'guardian', p_student from student_guardians g where g.student_id = p_student and g.status='active'
    union select h, s.profile_id, 'student', p_student from students s where s.id = p_student and s.profile_id is not null
  on conflict do nothing;
  delete from household_members m where m.household_id = h and m.role='guardian'
    and not exists (select 1 from student_guardians g where g.student_id=p_student and g.guardian_profile_id=m.profile_id and g.status='active');
  return h;
end $$;
revoke all on function public.household_for_student(uuid) from public, anon;
grant execute on function public.household_for_student(uuid) to authenticated;

-- 5) Realtime (Supabase postgres_changes respects RLS)
alter table public.shopping_items replica identity full;
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='shopping_items') then
    alter publication supabase_realtime add table public.shopping_items;
  end if;
end $$;
