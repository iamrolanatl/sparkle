-- Ask Sparkle / study helper audit log (F-12, FR-10, FR-21). Content-free by design (minors' data minimal):
-- no prompt or reply text, only safety outcome and usage metadata. Written by the API with the service role.
-- rollback: drop table if exists public.tutor_logs;  (new table only; nothing existing altered)
create table if not exists public.tutor_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  safety text not null check (safety in ('ok','crisis','blocked','unsafe_output','unavailable','stream_error')),
  reason text check (reason is null or char_length(reason) <= 40),
  mode text check (mode is null or mode in ('coach','normal')),
  band text check (band is null or band in ('k5','6to8','9to12','adult')),
  voice boolean not null default false,
  model text check (model is null or char_length(model) <= 80),
  reply_chars int, source_count int,
  created_at timestamptz not null default now()
);
create index if not exists tutor_logs_student_idx on public.tutor_logs (student_id, created_at desc);
alter table public.tutor_logs enable row level security;
-- The student can see their own log; no client writes (service role bypasses RLS).
drop policy if exists tutor_logs_select on public.tutor_logs;
create policy tutor_logs_select on public.tutor_logs for select to authenticated
  using (public.is_student_self(student_id));
revoke insert, update, delete on public.tutor_logs from anon, authenticated;
