-- ============================================================
-- Super admin is strictly view-only for orders — monitoring both
-- branches, not acting on them. Voiding (like inserting) is now
-- a branch-cashier-only action, scoped to their own branch.
-- ============================================================

drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_cashier_update"
  on public.orders for update
  using (public.is_branch_cashier() and branch = public.current_admin_branch())
  with check (public.is_branch_cashier() and branch = public.current_admin_branch());
