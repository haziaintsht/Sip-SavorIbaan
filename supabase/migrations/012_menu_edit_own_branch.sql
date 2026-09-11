-- ============================================================
-- Menu items: any admin/cashier can VIEW both branches' menus
-- (unchanged), but a branch-locked cashier can only ADD/EDIT/
-- DELETE items belonging to their own branch. super_admin keeps
-- full write access to both, since they own the whole menu.
-- ============================================================

drop policy if exists "menu_items_admin_all" on public.menu_items;

create policy "menu_items_admin_select"
  on public.menu_items for select
  using (public.is_admin());

create policy "menu_items_write_own_branch"
  on public.menu_items for insert
  with check (
    public.is_super_admin()
    or (public.is_branch_cashier() and branch = public.current_admin_branch())
  );

create policy "menu_items_update_own_branch"
  on public.menu_items for update
  using (
    public.is_super_admin()
    or (public.is_branch_cashier() and branch = public.current_admin_branch())
  )
  with check (
    public.is_super_admin()
    or (public.is_branch_cashier() and branch = public.current_admin_branch())
  );

create policy "menu_items_delete_own_branch"
  on public.menu_items for delete
  using (
    public.is_super_admin()
    or (public.is_branch_cashier() and branch = public.current_admin_branch())
  );
