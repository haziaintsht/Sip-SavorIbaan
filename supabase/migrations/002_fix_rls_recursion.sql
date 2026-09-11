-- ============================================================
-- Fix: infinite recursion in RLS policies (42P17)
--
-- profiles_select_own_or_admin (and similar policies) checked
-- admin status by querying public.profiles from within a policy
-- defined ON public.profiles, which recurses. A security definer
-- function bypasses RLS internally and breaks the loop.
-- ============================================================

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "loyalty_cards_select_own_or_admin" on public.loyalty_cards;
create policy "loyalty_cards_select_own_or_admin"
  on public.loyalty_cards for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "loyalty_cards_admin_update" on public.loyalty_cards;
create policy "loyalty_cards_admin_update"
  on public.loyalty_cards for update
  using (public.is_admin());

drop policy if exists "stamp_logs_select_own_or_admin" on public.stamp_logs;
create policy "stamp_logs_select_own_or_admin"
  on public.stamp_logs for select
  using (
    exists (
      select 1 from public.loyalty_cards c
      where c.id = stamp_logs.card_id and c.user_id = auth.uid()
    )
    or public.is_admin()
  );

drop policy if exists "menu_items_admin_all" on public.menu_items;
create policy "menu_items_admin_all"
  on public.menu_items for all
  using (public.is_admin())
  with check (public.is_admin());
