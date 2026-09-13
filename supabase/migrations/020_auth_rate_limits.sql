-- Throttles the custom-auth endpoints (signup, resend/forgot-password code
-- sends, and guessing a verification code) so a script can't burn through
-- the EmailJS quota or brute-force a 6-digit code. Server-only: called via
-- the service-role client from Route Handlers, never exposed to the anon
-- or authenticated roles, so no RLS/grants are needed here.
create table if not exists public.rate_limits (
  key          text primary key,
  attempts     integer not null default 1,
  window_start timestamptz not null default now()
);

create or replace function public.check_rate_limit(
  p_key text,
  p_max_attempts integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.rate_limits;
begin
  -- Row lock so two concurrent requests for the same key can't both read
  -- the same "attempts" value and both squeak through as the (max)th.
  select * into v_row from public.rate_limits where key = p_key for update;

  if not found then
    insert into public.rate_limits (key, attempts, window_start) values (p_key, 1, now());
    return true;
  end if;

  if now() - v_row.window_start > (p_window_seconds || ' seconds')::interval then
    update public.rate_limits set attempts = 1, window_start = now() where key = p_key;
    return true;
  end if;

  if v_row.attempts >= p_max_attempts then
    return false;
  end if;

  update public.rate_limits set attempts = attempts + 1 where key = p_key;
  return true;
end;
$$;
