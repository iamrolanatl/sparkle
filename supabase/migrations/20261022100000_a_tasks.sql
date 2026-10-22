-- Team A, FR-21 natural-language tasks (DEC-101, DEC-104). Additive only.
-- rollback: drop table if exists public.tasks;  (no other objects touched)
-- Raw natural-language input is NOT persisted (DEC-104): only the reviewed title.
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  title text not null check (char_length(title) between 1 and 120),
  due_at timestamptz,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  done_at timestamptz,
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists tasks_student_open_due_idx on public.tasks (student_id, due_at) where done_at is null;
create index if not exists tasks_class_idx on public.tasks (class_id);
create index if not exists tasks_created_by_idx on public.tasks (created_by);
alter table public.tasks enable row level security;

-- Writers = student self, or an active guardian who can currently view the student's assignments.
-- ('assignments' is a core scope and not limitable today, but routing through can_view_student keeps
--  writes aligned with reads if DEC-06 scopes ever change.)
create or replace function public.can_write_tasks(p_student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_student_self(p_student)
      or (public.is_active_guardian(p_student) and public.can_view_student(p_student, 'assignments'))
$$;
revoke execute on function public.can_write_tasks(uuid) from public, anon;
grant execute on function public.can_write_tasks(uuid) to authenticated;

drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks for select to authenticated
  using (public.can_view_student(student_id, 'assignments'));
drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks for insert to authenticated
  with check (created_by = (select auth.uid()) and public.can_write_tasks(student_id));
drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks for update to authenticated
  using (public.can_write_tasks(student_id)) with check (public.can_write_tasks(student_id));
drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks for delete to authenticated
  using (public.can_write_tasks(student_id));
grant select, insert, delete, update (title, due_at, priority, class_id, done_at) on public.tasks to authenticated;
