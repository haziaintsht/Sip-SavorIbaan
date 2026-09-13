-- Stores hashed one-time codes for the EmailJS-driven signup verification
-- and password reset flows, replacing Supabase's own auth emails. Only
-- ever touched by server routes using the service-role client — RLS is
-- enabled with no policies, so anon/authenticated access is denied by
-- default and the service role (which bypasses RLS entirely) is the only
-- way in.
create table if not exists public.email_verification_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,
  purpose text not null check (purpose in ('signup', 'reset')),
  user_id uuid references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists email_verification_codes_lookup_idx
  on public.email_verification_codes (email, purpose, consumed_at, expires_at);

alter table public.email_verification_codes enable row level security;
