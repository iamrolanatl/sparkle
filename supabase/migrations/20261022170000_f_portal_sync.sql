-- School-portal sync (inventory: /workspace/eli/portal-dive/inventory.md). Laptop agent → /ingest/:id/portal → service-role writer.
-- Every new table: student-scoped, RLS read via can_view_student(scope); NO client write policies (only the ingest worker writes).
-- rollback:
--   drop table if exists public.portal_sessions, public.source_records, public.resources, public.calendar_events,
--     public.messages, public.posts, public.attendance_events, public.grade_snapshots, public.class_aliases,
--     public.teachers, public.terms;
--   alter table public.classes drop column if exists course_code, drop column if exists section_no, drop column if exists term_id,
--     drop column if exists teacher_id, drop column if exists mark, drop column if exists pct, drop column if exists missing_count,
--     drop column if exists synced_at;
--   alter table public.assignments drop column if exists is_missing, drop column if exists teacher_comment, drop column if exists score_pct;
--   alter table public.units drop column if exists external_key, drop column if exists source, drop column if exists start_date, drop column if exists end_date;
--   alter table public.class_categories drop column if exists source, drop column if exists drop_scores;
--   alter table public.sync_runs drop column if exists rows_changed, drop column if exists source_detail;

create table if not exists public.terms (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  school_year text not null, name text not null, start_date date, end_date date,
  external_key text not null, created_at timestamptz not null default now(),
  unique (student_id, external_key)
);
create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  name text not null check (char_length(name) <= 120),
  email text check (email is null or char_length(email) <= 200),
  aliases text[] not null default '{}',
  external_key text not null, created_at timestamptz not null default now(),
  unique (student_id, external_key)
);

alter table public.classes add column if not exists course_code text;
alter table public.classes add column if not exists section_no text;
alter table public.classes add column if not exists term_id uuid references public.terms (id) on delete set null;
alter table public.classes add column if not exists teacher_id uuid references public.teachers (id) on delete set null;
alter table public.classes add column if not exists mark text;
alter table public.classes add column if not exists pct numeric;
alter table public.classes add column if not exists missing_count int;
alter table public.classes add column if not exists synced_at timestamptz;
alter table public.assignments add column if not exists is_missing boolean not null default false;
alter table public.assignments add column if not exists teacher_comment text;
alter table public.assignments add column if not exists score_pct numeric;
alter table public.units add column if not exists external_key text;
alter table public.units add column if not exists source text;
alter table public.units add column if not exists start_date date;
alter table public.units add column if not exists end_date date;
alter table public.class_categories add column if not exists source text;
alter table public.class_categories add column if not exists drop_scores int;
alter table public.sync_runs add column if not exists rows_changed int;
alter table public.sync_runs add column if not exists source_detail text;
create unique index if not exists units_student_ext_uq on public.units (student_id, external_key);
create index if not exists classes_section_idx on public.classes (student_id, section_no);
create index if not exists assignments_missing_idx on public.assignments (student_id, class_id) where is_missing;

create table if not exists public.class_aliases (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  source text not null, external_id text not null, label text,
  created_at timestamptz not null default now(),
  unique (student_id, source, external_id)
);
create table if not exists public.grade_snapshots (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  captured_on date not null, pct numeric, mark text, missing_count int,
  created_at timestamptz not null default now(),
  unique (class_id, captured_on)
);
create table if not exists public.attendance_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  class_id uuid references public.classes (id) on delete set null,
  day date not null, period text, course_name text, code text not null, reason text,
  excused boolean, source text not null, external_key text not null,
  created_at timestamptz not null default now(),
  unique (student_id, external_key)
);
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  class_id uuid references public.classes (id) on delete set null,
  source text not null, author text, title text not null, body text check (body is null or char_length(body) <= 4000),
  url text, posted_at timestamptz, external_key text not null,
  created_at timestamptz not null default now(),
  unique (student_id, external_key)
);
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  class_id uuid references public.classes (id) on delete set null,
  source text not null, sender text, is_teacher boolean not null default false,
  subject text not null, snippet text check (snippet is null or char_length(snippet) <= 500),
  received_at timestamptz, external_key text not null,
  created_at timestamptz not null default now(),
  unique (student_id, external_key)
);
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  class_id uuid references public.classes (id) on delete set null,
  source text not null, kind text, title text not null, starts_at timestamptz not null, ends_at timestamptz,
  external_key text not null, created_at timestamptz not null default now(),
  unique (student_id, external_key)
);
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  class_id uuid references public.classes (id) on delete cascade,
  unit_id uuid references public.units (id) on delete set null,
  kind text not null check (kind in ('link', 'ebook', 'syllabus', 'file')),
  provider text, title text not null, url text not null check (url ~* '^https?://' and char_length(url) <= 2000),
  source text not null, external_key text not null, created_at timestamptz not null default now(),
  unique (student_id, external_key)
);
create table if not exists public.source_records (
  student_id uuid not null references public.students (id) on delete cascade,
  source text not null, entity text not null, external_key text not null,
  payload_hash text not null check (char_length(payload_hash) = 64),
  first_seen timestamptz not null default now(), last_seen timestamptz not null default now(),
  primary key (student_id, source, entity, external_key)
);
create table if not exists public.portal_sessions (
  student_id uuid not null references public.students (id) on delete cascade,
  source text not null, status text not null check (status in ('ok', 'needs_login', 'error', 'skipped')),
  detail text, last_ok_at timestamptz, checked_at timestamptz not null default now(),
  primary key (student_id, source)
);

create index if not exists grade_snapshots_idx on public.grade_snapshots (student_id, class_id, captured_on desc);
create index if not exists attendance_idx on public.attendance_events (student_id, day desc);
create index if not exists posts_idx on public.posts (student_id, class_id, posted_at desc);
create index if not exists messages_idx on public.messages (student_id, class_id, received_at desc);
create index if not exists calendar_idx on public.calendar_events (student_id, starts_at);
create index if not exists resources_idx on public.resources (student_id, class_id);
create index if not exists class_aliases_class_idx on public.class_aliases (class_id);
create index if not exists teachers_idx on public.teachers (student_id);
create index if not exists terms_idx on public.terms (student_id);
create index if not exists classes_term_idx on public.classes (term_id);
create index if not exists classes_teacher_idx on public.classes (teacher_id);
create index if not exists attendance_class_idx on public.attendance_events (class_id);
create index if not exists posts_class_idx on public.posts (class_id);
create index if not exists messages_class_idx on public.messages (class_id);
create index if not exists calendar_class_idx on public.calendar_events (class_id);
create index if not exists resources_class_idx on public.resources (class_id);
create index if not exists resources_unit_idx on public.resources (unit_id);
create index if not exists grade_snapshots_class_idx on public.grade_snapshots (class_id);

do $$
declare t text; s text;
begin
  for t, s in values ('terms','schedule'), ('teachers','schedule'), ('class_aliases','schedule'), ('grade_snapshots','grades'),
    ('attendance_events','attendance'), ('posts','messages'), ('messages','messages'), ('calendar_events','schedule'),
    ('resources','assignments'), ('source_records','schedule'), ('portal_sessions','schedule')
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.can_view_student(student_id, %L))',
      t || '_select', t, s);
    execute format('revoke insert, update, delete on public.%I from anon, authenticated', t);
  end loop;
end $$;
