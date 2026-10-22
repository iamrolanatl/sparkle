-- Team B / FR-23 (WBS 4.10): OCR scans of school documents. Additive only (SOP-15).
-- rollback: drop function if exists public.scans_due_for_purge(int); drop function if exists public.scans_touch(); drop table if exists public.scans;
--           (no existing objects altered; R2 objects under scans/ are removed by the purge job or manually)
-- Writes only via the API (service role). Reads via RLS: the student, or an active guardian unless a student over the
-- age threshold limited 'resources' (DEC-06, DEC-123). Helpers excluded.
create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  uploaded_by uuid references public.profiles (id) on delete set null,
  r2_key text not null,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  content_type text not null,
  size_bytes int not null check (size_bytes > 0 and size_bytes <= 10485760),
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'review', 'saved', 'failed', 'discarded')),
  attempts int not null default 0,
  client_text text,          -- on-device OCR text, re-redacted server-side; must be null once processed
  ocr_text text,             -- redacted OCR text (DEC-22/122)
  ocr_engine text check (ocr_engine in ('on_device', 'workers_ai')),  -- OcrResult contract (#54)
  ocr_confidence real check (ocr_confidence between 0 and 1),
  fields jsonb,
  confirmed_fields jsonb,    -- user-reviewed fields (DEC-120)
  redactions jsonb,
  error text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scans_student_sha_uq unique (student_id, sha256),                       -- DEC-121
  constraint scans_client_text_cleared check (client_text is null or status in ('queued', 'processing'))
);
create index if not exists scans_student_created_idx on public.scans (student_id, created_at desc);
create index if not exists scans_uploaded_by_idx on public.scans (uploaded_by);
create index if not exists scans_reviewed_by_idx on public.scans (reviewed_by);
create index if not exists scans_pending_idx on public.scans (status, updated_at) where status <> 'saved';

create or replace function public.scans_touch() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists scans_touch on public.scans;
create trigger scans_touch before update on public.scans for each row execute function public.scans_touch();

alter table public.scans enable row level security;
drop policy if exists scans_select on public.scans;
create policy scans_select on public.scans for select to authenticated
  using (public.is_student_self(student_id)
         or (public.is_active_guardian(student_id) and public.can_view_student(student_id, 'resources')));
revoke all on public.scans from anon;
grant select on public.scans to authenticated;

-- DEC-126: unsaved scans (anything not 'saved') are purged 30 days after last update. Service role only.
create or replace function public.scans_due_for_purge(p_limit int default 500)
returns table (id uuid, r2_key text) language sql stable security definer set search_path = public as $$
  select s.id, s.r2_key from public.scans s
  where s.status <> 'saved' and s.updated_at < now() - interval '30 days'
  order by s.updated_at limit least(greatest(p_limit, 1), 1000)
$$;
revoke all on function public.scans_due_for_purge(int) from public, anon, authenticated;
grant execute on function public.scans_due_for_purge(int) to service_role;
