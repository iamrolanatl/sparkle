-- Phase 1 (WBS 3.3/3.4, CR-0007): manual import path + idempotent upserts + sync bookkeeping.
alter table public.classes add column if not exists external_key text;
alter table public.assignments add column if not exists external_key text;
alter table public.assignments add column if not exists points_possible numeric;
create unique index if not exists classes_student_external_uq on public.classes (student_id, external_key);
create unique index if not exists assignments_student_external_uq on public.assignments (student_id, external_key);
create index if not exists assignments_student_due_idx on public.assignments (student_id, due_at);
alter table public.sync_runs add column if not exists rows_in int;
alter table public.sync_runs add column if not exists rows_ok int;
create index if not exists sync_runs_started_idx on public.sync_runs (started_at desc);
