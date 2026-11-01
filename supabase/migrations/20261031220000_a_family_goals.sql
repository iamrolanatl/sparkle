-- Shared parent-child goals (product plan #7). A guardian sets a class grade target + date + reward text; the student
-- sees it as a mission. Progress is computed in the app from real grades (no stored progress). Visibility follows the
-- core 'grades' scope (DEC-06: core records always visible to the family; nothing is shared outside it).
-- rollback: drop table public.family_goals.
create table if not exists public.family_goals (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  class_id uuid references public.classes (id) on delete cascade,
  target_pct numeric(5, 2) not null check (target_pct > 0 and target_pct <= 100),
  by_date date not null,
  reward text check (reward is null or char_length(reward) <= 200),
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);
create index if not exists family_goals_student_idx on public.family_goals (student_id) where archived_at is null;
create index if not exists family_goals_class_idx on public.family_goals (class_id);
create index if not exists family_goals_created_by_idx on public.family_goals (created_by);
alter table public.family_goals enable row level security;
revoke all on public.family_goals from anon, authenticated;
grant select, insert, delete on public.family_goals to authenticated;
grant update (archived_at) on public.family_goals to authenticated;
drop policy if exists fg_select on public.family_goals;
create policy fg_select on public.family_goals for select to authenticated
  using (public.can_view_student(student_id, 'grades'));
drop policy if exists fg_insert on public.family_goals;
create policy fg_insert on public.family_goals for insert to authenticated
  with check (created_by = (select auth.uid()) and public.is_active_guardian(student_id));
drop policy if exists fg_update on public.family_goals;
create policy fg_update on public.family_goals for update to authenticated
  using (public.is_active_guardian(student_id)) with check (public.is_active_guardian(student_id));
drop policy if exists fg_delete on public.family_goals;
create policy fg_delete on public.family_goals for delete to authenticated
  using (public.is_active_guardian(student_id));
