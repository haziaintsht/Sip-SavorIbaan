-- ============================================================
-- Sip & Savor Spot — Initial schema
-- Tables: profiles, loyalty_cards, stamp_logs, menu_items
-- Includes: auth triggers, RLS policies
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. profiles
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text not null,
  phone_number  text,
  role          text not null default 'customer' check (role in ('customer', 'admin')),
  created_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- ------------------------------------------------------------
-- 2. loyalty_cards
-- ------------------------------------------------------------
create table if not exists public.loyalty_cards (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles(id) on delete cascade,
  stamp_count           integer not null default 0 check (stamp_count >= 0 and stamp_count <= 10),
  total_earned_rewards  integer not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (user_id)
);

alter table public.loyalty_cards enable row level security;

-- ------------------------------------------------------------
-- 3. stamp_logs
-- ------------------------------------------------------------
create table if not exists public.stamp_logs (
  id               uuid primary key default gen_random_uuid(),
  card_id          uuid not null references public.loyalty_cards(id) on delete cascade,
  admin_id         uuid references public.profiles(id),
  action           text not null check (action in ('ADD_STAMP', 'REDEEM_REWARD')),
  branch_location  text,
  created_at       timestamptz not null default now()
);

alter table public.stamp_logs enable row level security;

-- ------------------------------------------------------------
-- 4. menu_items
-- ------------------------------------------------------------
create table if not exists public.menu_items (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  price         numeric(10, 2) not null,
  category      text not null,
  image_url     text,
  is_hidden     boolean not null default false,
  is_available  boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.menu_items enable row level security;

-- ============================================================
-- Auth trigger: auto-create profile + loyalty card on signup
-- Fires once the user's email is verified (email_confirmed_at set)
-- ============================================================
create or replace function public.handle_new_verified_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- only act the moment the email becomes confirmed
  if (new.email_confirmed_at is not null and old.email_confirmed_at is null) then
    insert into public.profiles (id, full_name, phone_number, role)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'full_name', 'New Customer'),
      new.raw_user_meta_data ->> 'phone_number',
      'customer'
    )
    on conflict (id) do nothing;

    insert into public.loyalty_cards (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_verified on auth.users;
create trigger on_auth_user_verified
  after update on auth.users
  for each row execute function public.handle_new_verified_user();

-- ============================================================
-- updated_at helper
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_loyalty_cards_updated_at on public.loyalty_cards;
create trigger set_loyalty_cards_updated_at
  before update on public.loyalty_cards
  for each row execute function public.set_updated_at();

drop trigger if exists set_menu_items_updated_at on public.menu_items;
create trigger set_menu_items_updated_at
  before update on public.menu_items
  for each row execute function public.set_updated_at();

-- ============================================================
-- RPC: stamp_action — admin-only, atomic add/redeem
-- ============================================================
create or replace function public.stamp_action(
  p_card_id uuid,
  p_action text,
  p_branch_location text default null
)
returns public.loyalty_cards
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card public.loyalty_cards;
  v_caller_role text;
begin
  select role into v_caller_role from public.profiles where id = auth.uid();
  if v_caller_role is distinct from 'admin' then
    raise exception 'Only admins can perform stamp actions';
  end if;

  if p_action = 'ADD_STAMP' then
    update public.loyalty_cards
      set stamp_count = least(stamp_count + 1, 10)
      where id = p_card_id
      returning * into v_card;
  elsif p_action = 'REDEEM_REWARD' then
    update public.loyalty_cards
      set stamp_count = 0,
          total_earned_rewards = total_earned_rewards + 1
      where id = p_card_id
      returning * into v_card;
  else
    raise exception 'Unknown action: %', p_action;
  end if;

  insert into public.stamp_logs (card_id, admin_id, action, branch_location)
  values (p_card_id, auth.uid(), p_action, p_branch_location);

  return v_card;
end;
$$;

-- ============================================================
-- Row Level Security policies
-- ============================================================

-- profiles: user reads/updates own row; admins read all
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (
    auth.uid() = id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- loyalty_cards: owner reads own card; admins read/update all
create policy "loyalty_cards_select_own_or_admin"
  on public.loyalty_cards for select
  using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "loyalty_cards_admin_update"
  on public.loyalty_cards for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- stamp_logs: owner (via card) or admin can read; only admin can insert directly
-- (normal inserts happen through the stamp_action() RPC, which is security definer)
create policy "stamp_logs_select_own_or_admin"
  on public.stamp_logs for select
  using (
    exists (
      select 1 from public.loyalty_cards c
      where c.id = stamp_logs.card_id and c.user_id = auth.uid()
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- menu_items: everyone (incl. anonymous) can read available, non-hidden items;
-- authenticated customers can also read hidden items (secret menu gate is UI-side);
-- only admins can write
create policy "menu_items_select_public"
  on public.menu_items for select
  using (is_available = true);

create policy "menu_items_admin_all"
  on public.menu_items for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ============================================================
-- Seed: menu items (public + hidden/secret)
-- ============================================================
insert into public.menu_items (name, description, price, category, is_hidden) values
  ('Signature Glazed Chicken', '5 pcs + 1 rice + pickled radish', 169, 'Mini Drumsticks & Signature Glazed Chicken', false),
  ('Cafe Latte (M)', 'Espresso with steamed milk', 129, 'Coffee-Based Signature Drinks', false),
  ('Ube Latte', 'Silky ube and milk topped with an espresso shot', 179, 'Hidden Menu', true),
  ('Milo Dinosaur', 'Iced Milo loaded with extra Milo powder', 160, 'Hidden Menu', true),
  ('Dirty Matcha', 'Earthy matcha paired with espresso and milk', 179, 'Hidden Menu', true),
  ('Strawberry Coke Espresso', 'Tangy strawberry, fizzy cola, and bold espresso', 179, 'Hidden Menu', true),
  ('Golden Sunrise', 'Espresso blended with tropical pineapple', 179, 'Hidden Menu', true)
on conflict do nothing;
