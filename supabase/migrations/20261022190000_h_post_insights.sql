-- Class-board posts: richer fields, per-post action items (teacher post summaries), per-user read state.
-- Feature "teacher_post_summaries" is narrowly scoped (extract/summarize only, no chat). Pending SA-A1 review.
-- rollback: drop table if exists public.post_reads, public.post_actions; alter table public.posts drop column if exists links,
--   drop column if exists pinned, drop column if exists starts_at, drop column if exists content_hash, drop column if exists analyzed_hash;
--   delete from public.feature_flags where key = 'teacher_post_summaries';
alter table public.posts
  add column if not exists links jsonb not null default '[]'::jsonb,
  add column if not exists pinned boolean not null default false,
  add column if not exists starts_at timestamptz,
  add column if not exists content_hash text,
  add column if not exists analyzed_hash text;
create index if not exists posts_class_posted_idx on public.posts (class_id, posted_at desc);
create index if not exists posts_student_posted_idx on public.posts (student_id, posted_at desc);

create table if not exists public.post_actions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  class_id uuid references public.classes (id) on delete set null,
  kind text not null check (kind in ('todo','due','bring','assessment','reminder','change','announcement')),
  text text not null check (char_length(text) between 1 and 200),
  due_at timestamptz,
  method text not null default 'rules' check (method in ('rules','ai')),
  done_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists post_actions_post_idx on public.post_actions (post_id);
create index if not exists post_actions_student_open_idx on public.post_actions (student_id, due_at) where done_at is null;
create index if not exists post_actions_class_idx on public.post_actions (class_id);

create table if not exists public.post_reads (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists post_reads_user_student_idx on public.post_reads (user_id, student_id);
create index if not exists post_reads_student_idx on public.post_reads (student_id);

alter table public.post_actions enable row level security;
alter table public.post_reads enable row level security;
drop policy if exists post_actions_select on public.post_actions;
create policy post_actions_select on public.post_actions for select to authenticated
  using (public.can_view_student(student_id, 'messages'));
-- The student (or guardian) may tick an action done; only done_at is writable.
drop policy if exists post_actions_done on public.post_actions;
create policy post_actions_done on public.post_actions for update to authenticated
  using (public.can_view_student(student_id, 'messages')) with check (public.can_view_student(student_id, 'messages'));
revoke insert, update, delete on public.post_actions from anon, authenticated;
grant update (done_at) on public.post_actions to authenticated;

drop policy if exists post_reads_select on public.post_reads;
create policy post_reads_select on public.post_reads for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists post_reads_insert on public.post_reads;
create policy post_reads_insert on public.post_reads for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_view_student(student_id, 'messages')
    and exists (select 1 from public.posts p where p.id = post_id and p.student_id = post_reads.student_id));
revoke update, delete on public.post_reads from anon, authenticated;
grant select, insert on public.post_reads to authenticated;

insert into public.feature_flags (key, enabled, config) values ('teacher_post_summaries', true,
  '{"note": "extract/summarize teacher class-board posts only, no chat; pending SA-A1 review", "max_ai_posts_per_batch": 25}')
  on conflict (key) do nothing;
