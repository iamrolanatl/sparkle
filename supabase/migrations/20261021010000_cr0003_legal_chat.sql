-- CR-0003: privacy requests (FR-18), sales/support chat (FR-19), admin chat monitoring (FR-20).
-- Chat tables are written ONLY by the API worker with the service role; no client access.

-- ---------------------------------------------------------------------------
-- Privacy requests (CCPA/CPRA "Do Not Sell or Share", access, deletion)
-- ---------------------------------------------------------------------------
create table public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  request_type text not null check (request_type in ('do_not_sell_share', 'access', 'delete', 'correct', 'other')),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  details text check (char_length(details) <= 2000),
  gpc_signal boolean not null default false, -- Global Privacy Control header present
  state_of_residence text check (char_length(state_of_residence) <= 40),
  ip_hash text check (char_length(ip_hash) <= 64),
  status text not null default 'received' check (status in ('received', 'verifying', 'completed', 'denied')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index on public.privacy_requests (ip_hash, created_at);
create or replace function public.privacy_requests_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.status := 'received'; new.resolved_at := null; new.created_at := now();
  if new.ip_hash is not null and (select count(*) from public.privacy_requests
       where ip_hash = new.ip_hash and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'rate limited' using errcode = 'P0429';
  end if;
  return new;
end $$;
create trigger privacy_requests_guard before insert on public.privacy_requests
  for each row execute function public.privacy_requests_guard();
alter table public.privacy_requests enable row level security;
grant insert (request_type, email, details, gpc_signal, state_of_residence, ip_hash) on public.privacy_requests to anon, authenticated;
create policy privacy_requests_insert on public.privacy_requests for insert to anon, authenticated with check (true);

-- ---------------------------------------------------------------------------
-- Feature flags (kill switches). Read/written by service role (API worker, admin server).
-- ---------------------------------------------------------------------------
create table public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  updated_by uuid,
  updated_at timestamptz not null default now()
);
insert into public.feature_flags (key, enabled, config) values
  ('sales_chat', true, '{"daily_token_budget": 200000, "max_messages_per_session": 30}'),
  ('vault_enabled', false, '{"note": "FR-24 mail vault: sample data only until legal/security review (CR-0004)"}');
alter table public.feature_flags enable row level security;

-- ---------------------------------------------------------------------------
-- Sales & support chat
-- ---------------------------------------------------------------------------
create table public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  ip_hash text,
  page text,
  flagged boolean not null default false,
  flag_reason text,
  escalated boolean not null default false,
  message_count int not null default 0,
  error_count int not null default 0,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days' -- retention TTL
);
create index on public.chat_sessions (last_message_at desc);
create index on public.chat_sessions (expires_at);

create table public.chat_messages (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.chat_sessions (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'error')),
  content_redacted text not null, -- emails/phones/IDs removed before storage
  tokens_in int not null default 0,
  tokens_out int not null default 0,
  flagged boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.chat_messages (session_id, created_at);
create index on public.chat_messages (created_at);

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.chat_sessions (id) on delete set null,
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  question text not null check (char_length(question) <= 2000),
  status text not null default 'open' check (status in ('open', 'in_progress', 'closed')),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.support_tickets enable row level security;
-- No grants/policies for anon/authenticated on chat tables or feature_flags.

-- Usage today (tokens) for budget kill switch / admin dashboard.
create or replace function public.chat_usage_today()
returns table (tokens bigint, messages bigint, errors bigint, sessions bigint)
language sql stable security definer set search_path = public as $$
  select coalesce(sum(tokens_in + tokens_out), 0)::bigint,
         count(*) filter (where role = 'user')::bigint,
         count(*) filter (where role = 'error')::bigint,
         count(distinct session_id)::bigint
  from public.chat_messages where created_at >= date_trunc('day', now())
$$;
revoke execute on function public.chat_usage_today() from public, anon, authenticated;

-- Retention: delete expired chat sessions (cascade messages). Schedule daily with pg_cron:
--   select cron.schedule('purge-chats', '15 3 * * *', 'select public.purge_expired_chats()');
create or replace function public.purge_expired_chats()
returns int language sql volatile security definer set search_path = public as $$
  with d as (delete from public.chat_sessions where expires_at < now() returning 1) select count(*)::int from d
$$;
revoke execute on function public.purge_expired_chats() from public, anon, authenticated;
