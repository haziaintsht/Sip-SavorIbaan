-- ============================================================
-- Super admin is a monitoring/analytics role only — they can see
-- orders and stamps across both branches, but they don't run the
-- register. Only a branch-locked cashier (role 'admin' with a
-- branch set) can create orders/order_items (i.e. use the POS).
-- Voiding stays available to both, as a supervisory correction.
-- ============================================================

create or replace function public.is_branch_cashier()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and branch is not null
  );
$$;

-- orders: split the old "for all" policy so insert is cashier-only,
-- while select/update (void) stay open to super_admin too.
drop policy if exists "orders_admin_all" on public.orders;

create policy "orders_admin_select"
  on public.orders for select
  using (
    public.is_super_admin()
    or (public.is_branch_cashier() and branch = public.current_admin_branch())
  );

create policy "orders_cashier_insert"
  on public.orders for insert
  with check (public.is_branch_cashier() and branch = public.current_admin_branch());

create policy "orders_admin_update"
  on public.orders for update
  using (
    public.is_super_admin()
    or (public.is_branch_cashier() and branch = public.current_admin_branch())
  )
  with check (
    public.is_super_admin()
    or (public.is_branch_cashier() and branch = public.current_admin_branch())
  );

-- order_items: same split, scoped via the parent order.
drop policy if exists "order_items_admin_all" on public.order_items;

create policy "order_items_admin_select"
  on public.order_items for select
  using (
    public.is_super_admin()
    or exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and public.is_branch_cashier()
        and o.branch = public.current_admin_branch()
    )
  );

create policy "order_items_cashier_insert"
  on public.order_items for insert
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and public.is_branch_cashier()
        and o.branch = public.current_admin_branch()
    )
  );
