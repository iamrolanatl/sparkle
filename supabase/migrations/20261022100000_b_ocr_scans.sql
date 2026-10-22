-- Team B / FR-23 (WBS 4.10): OCR scans of school documents. Additive only.
-- Rollback (down): drop table if exists public.scans;  (no other objects touched; R2 objects under scans/ removed separately)
-- Writes happen only via the API with the service role; users read through RLS (DEC-123: guardians + the student only).
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
  client_text text,          -- on-device OCR text (already redacted); cleared after processing
  ocr_text text,             -- redacted OCR text (DEC-22)
  fields jsonb,              -- suggested fields
  confirmed_fields jsonb,    -- user-reviewed fields (review gate, DEC-120)
  redactions jsonb,
  error text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scans_student_sha_uq unique (student_id, sha256)  -- idempotent uploads (DEC-121)
);
create index if not exists scans_student_created_idx on public.scans (student_id, created_at desc);
create index if not exists scans_uploaded_by_idx on public.scans (uploaded_by);
create index if not exists scans_reviewed_by_idx on public.scans (reviewed_by);
create index if not exists scans_pending_idx on public.scans (status, updated_at) where status in ('queued', 'processing');

alter table public.scans enable row level security;
drop policy if exists scans_select on public.scans;
create policy scans_select on public.scans for select to authenticated
  using (public.is_active_guardian(student_id) or public.is_student_self(student_id));
revoke all on public.scans from anon;
grant select on public.scans to authenticated;
