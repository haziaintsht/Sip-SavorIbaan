-- ============================================================
-- Newsletter signups from the footer. Anyone can subscribe
-- (public insert); only admins can read the list.
-- ============================================================

create table if not exists public.newsletter_subscribers (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  created_at timestamptz not null default now()
);

alter table public.newsletter_subscribers enable row level security;

create policy "newsletter_public_insert"
  on public.newsletter_subscribers for insert
  with check (true);

create policy "newsletter_admin_select"
  on public.newsletter_subscribers for select
  using (public.is_admin());
