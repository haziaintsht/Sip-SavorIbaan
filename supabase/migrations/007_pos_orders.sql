-- ============================================================
-- Point-of-sale: orders + order_items, admin-only.
-- Completing an order in the POS also awards a loyalty stamp via
-- the existing stamp_action() RPC when a customer is attached —
-- no schema change needed there, it's just called from the app.
-- ============================================================

create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  branch         text not null check (branch in ('Palindan', 'Uptown')),
  customer_id    uuid references public.profiles(id),
  admin_id       uuid references public.profiles(id),
  subtotal       numeric(10, 2) not null,
  total          numeric(10, 2) not null,
  payment_method text not null check (payment_method in ('Cash', 'GCash')),
  status         text not null default 'completed' check (status in ('completed', 'voided')),
  created_at     timestamptz not null default now()
);

create table if not exists public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  menu_item_id  uuid references public.menu_items(id) on delete set null,
  name          text not null,
  unit_price    numeric(10, 2) not null,
  quantity      integer not null check (quantity > 0),
  line_total    numeric(10, 2) not null
);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create index if not exists orders_created_at_idx on public.orders (created_at);
create index if not exists orders_branch_idx on public.orders (branch);
create index if not exists order_items_order_id_idx on public.order_items (order_id);

create policy "orders_admin_all"
  on public.orders for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "order_items_admin_all"
  on public.order_items for all
  using (public.is_admin())
  with check (public.is_admin());
