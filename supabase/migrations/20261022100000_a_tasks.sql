-- Team A, FR-21 natural-language tasks (DEC-101). Additive only.
-- Rollback (down): drop table if exists public.tasks;  (no other objects touched)
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  title text not null check (char_length(title) between 1 and 120),
  due_at timestamptz,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  source_text text check (source_text is null or char_length(source_text) <= 500),
  done_at timestamptz,
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists tasks_student_open_due_idx on public.tasks (student_id, due_at) where done_at is null;
create index if not exists tasks_class_idx on public.tasks (class_id);
create index if not exists tasks_created_by_idx on public.tasks (created_by);
alter table public.tasks enable row level security;

drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks for select to authenticated
  using (public.can_view_student(student_id, 'assignments'));
-- Writes: the student themself or an active guardian; helpers are read-only.
drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks for insert to authenticated
  with check (created_by = (select auth.uid())
    and (public.is_student_self(student_id) or public.is_active_guardian(student_id)));
drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks for update to authenticated
  using (public.is_student_self(student_id) or public.is_active_guardian(student_id))
  with check (public.is_student_self(student_id) or public.is_active_guardian(student_id));
grant select, insert, update (title, due_at, priority, class_id, done_at) on public.tasks to authenticated;
