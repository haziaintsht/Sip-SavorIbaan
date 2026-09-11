-- ============================================================
-- Branch info: address/hours/map coordinates, editable by the
-- owner instead of hardcoded in the site's source. Publicly
-- readable (the landing page and footer need it unauthenticated).
-- ============================================================

create table if not exists public.branch_info (
  branch      text primary key check (branch in ('Palindan', 'Uptown')),
  address     text not null,
  hours       text not null,
  map_lat     numeric(10, 7),
  map_lng     numeric(10, 7),
  updated_at  timestamptz not null default now()
);

alter table public.branch_info enable row level security;

create policy "branch_info_select_public"
  on public.branch_info for select
  using (true);

create policy "branch_info_write_super_admin"
  on public.branch_info for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop trigger if exists set_branch_info_updated_at on public.branch_info;
create trigger set_branch_info_updated_at
  before update on public.branch_info
  for each row execute function public.set_updated_at();

insert into public.branch_info (branch, address, hours, map_lat, map_lng) values
  ('Palindan', 'Old Alternate Route, Palindan', '10:00 AM – 12:00 MN', 13.825266, 121.132656),
  ('Uptown', 'Inside Ibaan Recreation Park, Poblacion', '8:00 AM – 12:00 MN', null, null)
on conflict (branch) do nothing;
