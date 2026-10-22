-- Team D (WBS 3.2, DEC-166): provenance + score persistence for desktop-agent ingest. ADDITIVE ONLY.
-- rollback: additive only; in a new migration under a CR run the statements below (drop new index, constraints, columns):
--   drop index if exists grades_student_external_uq;
--   alter table public.grades drop column if exists external_key, drop column if exists source, drop column if exists entered_by;
--   alter table public.assignments drop column if exists source, drop column if exists entered_by;
--   alter table public.sync_runs drop column if exists actor;
-- Clients keep SELECT only on these tables (no new policies/grants); guardians see `source`/`entered_by`
-- through the existing can_view_student(...,'grades'|'assignments') policies.
alter table public.grades add column if not exists external_key text;
alter table public.grades add column if not exists source text;
alter table public.grades add column if not exists entered_by text;
alter table public.assignments add column if not exists source text;
alter table public.assignments add column if not exists entered_by text;
alter table public.sync_runs add column if not exists actor text;
create unique index if not exists grades_student_external_uq on public.grades (student_id, external_key);
do $$ begin
  alter table public.grades add constraint grades_entered_by_chk check (entered_by in ('guardian', 'student', 'system'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.assignments add constraint assignments_entered_by_chk check (entered_by in ('guardian', 'student', 'system'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.sync_runs add constraint sync_runs_actor_chk check (actor in ('guardian', 'student', 'system'));
exception when duplicate_object then null; end $$;
comment on column public.grades.entered_by is 'Provenance (DEC-166): who uploaded this row. student = self-reported via the student''s own agent; show a label in guardian views.';
