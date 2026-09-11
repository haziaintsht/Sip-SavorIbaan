-- ============================================================
-- Branch-scoped admins + customer order history
--
-- Problem: both branches' sales/orders were visible to every admin,
-- but Palindan and Uptown are run as separate, competing branches —
-- a cashier at one shouldn't see the other's revenue/orders/stamp
-- activity. The business owner (super_admin) still sees everything.
--
-- Also adds: customers can read their own past orders (previously
-- only admins could read the orders table at all).
-- ============================================================

-- 1. Give admin profiles a home branch; widen role to add 'super_admin'.
alter table public.profiles
  add column if not exists branch text check (branch in ('Palindan', 'Uptown'));

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('customer', 'admin', 'super_admin'));

-- 2. is_admin() now covers both admin tiers; add helpers for branch scoping.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin')
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'super_admin'
  );
$$;

create or replace function public.current_admin_branch()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select branch from public.profiles where id = auth.uid();
$$;

-- 3. orders: branch-scoped admins only see/act on their own branch;
--    super_admin sees all; a customer can read their own orders.
drop policy if exists "orders_admin_all" on public.orders;
create policy "orders_admin_all"
  on public.orders for all
  using (
    public.is_super_admin()
    or (public.is_admin() and branch = public.current_admin_branch())
  )
  with check (
    public.is_super_admin()
    or (public.is_admin() and branch = public.current_admin_branch())
  );

drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own"
  on public.orders for select
  using (auth.uid() = customer_id);

-- 4. order_items: scoped via the parent order's branch/owner.
drop policy if exists "order_items_admin_all" on public.order_items;
create policy "order_items_admin_all"
  on public.order_items for all
  using (
    public.is_super_admin()
    or exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and public.is_admin()
        and o.branch = public.current_admin_branch()
    )
  )
  with check (
    public.is_super_admin()
    or exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and public.is_admin()
        and o.branch = public.current_admin_branch()
    )
  );

drop policy if exists "order_items_select_own" on public.order_items;
create policy "order_items_select_own"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.customer_id = auth.uid()
    )
  );

-- 5. stamp_logs: branch-scoped admins only see logs from their own
--    branch (branch_location is stored as "<Branch> Branch").
drop policy if exists "stamp_logs_select_own_or_admin" on public.stamp_logs;
create policy "stamp_logs_select_own_or_admin"
  on public.stamp_logs for select
  using (
    exists (
      select 1 from public.loyalty_cards c
      where c.id = stamp_logs.card_id and c.user_id = auth.uid()
    )
    or public.is_super_admin()
    or (public.is_admin() and branch_location = public.current_admin_branch() || ' Branch')
  );

-- 6. Defense in depth: stamp_action() (security definer, bypasses RLS)
--    should refuse a branch-scoped admin logging a stamp under a
--    different branch's name.
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
  v_caller_branch text;
begin
  select role, branch into v_caller_role, v_caller_branch from public.profiles where id = auth.uid();
  if v_caller_role not in ('admin', 'super_admin') then
    raise exception 'Only admins can perform stamp actions';
  end if;

  if v_caller_role = 'admin' and v_caller_branch is not null
     and p_branch_location is not null
     and p_branch_location <> (v_caller_branch || ' Branch') then
    raise exception 'You can only log stamp actions for your own branch';
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

-- 7. Promote the existing owner account to super_admin (sees both branches).
update public.profiles set role = 'super_admin', branch = null
where id = '003b1db7-0de7-49fa-b056-e12c6f75fede';
