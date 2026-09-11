-- ============================================================
-- POS additions:
--  1. discount_reason / discount_note on orders, for an audit
--     trail on why a discount was applied (beyond Senior/PWD).
--  2. shift_closeouts — a cashier's end-of-shift cash reconciliation
--     (expected vs. counted cash), branch-scoped like orders.
-- ============================================================

alter table public.orders
  add column if not exists discount_reason text,
  add column if not exists discount_note text;

create table if not exists public.shift_closeouts (
  id             uuid primary key default gen_random_uuid(),
  branch         text not null check (branch in ('Palindan', 'Uptown')),
  admin_id       uuid references public.profiles(id),
  period_start   timestamptz not null,
  period_end     timestamptz not null,
  order_count    integer not null default 0,
  cash_total     numeric(10, 2) not null default 0,
  gcash_total    numeric(10, 2) not null default 0,
  counted_cash   numeric(10, 2) not null,
  variance       numeric(10, 2) not null,
  created_at     timestamptz not null default now()
);

alter table public.shift_closeouts enable row level security;

create index if not exists shift_closeouts_branch_idx on public.shift_closeouts (branch, created_at);

create policy "shift_closeouts_select"
  on public.shift_closeouts for select
  using (
    public.is_super_admin()
    or (public.is_branch_cashier() and branch = public.current_admin_branch())
  );

create policy "shift_closeouts_insert"
  on public.shift_closeouts for insert
  with check (public.is_branch_cashier() and branch = public.current_admin_branch());
