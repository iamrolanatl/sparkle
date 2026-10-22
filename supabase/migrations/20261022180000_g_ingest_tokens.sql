-- Scoped device ingest tokens: a laptop sync agent uploads for ONE student without a user sign-in.
-- Only a sha256 hash is stored. No client policies: only the API (service role) reads it.
-- rollback: drop table if exists public.ingest_tokens;
create table if not exists public.ingest_tokens (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  token_hash text not null unique check (char_length(token_hash) = 64),
  label text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create index if not exists ingest_tokens_student_idx on public.ingest_tokens (student_id);
create index if not exists ingest_tokens_created_by_idx on public.ingest_tokens (created_by);
alter table public.ingest_tokens enable row level security;
revoke all on public.ingest_tokens from anon, authenticated;
