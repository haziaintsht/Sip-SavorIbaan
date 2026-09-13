-- SECURITY FIX: profiles_update_own (migration 001) lets any authenticated
-- user update ANY column on their own row — the policy only checks row
-- ownership (auth.uid() = id), never which columns changed. Since `role`
-- and `branch` live on that same row, a customer could grant themselves
-- staff access with one client-side call:
--   supabase.from('profiles').update({ role: 'admin' }).eq('id', myId)
-- That would pass every is_admin()/is_super_admin() check elsewhere in the
-- app (stamps, orders, POS, staff management), since those all just read
-- profiles.role. This has been open since the very first migration.
--
-- Fixed with a trigger rather than tightening the RLS policy itself,
-- because customers still need to freely update full_name/phone_number/
-- location — a trigger can revert just the two privileged columns instead
-- of blocking the whole update.
--
-- auth.uid() is null when the caller is the service-role client (e.g. the
-- staff-management API route, which does its own super_admin check in
-- application code before calling this with the admin client) — that path
-- is intentionally left untouched. Only a customer's own authenticated
-- session (auth.uid() = their id, is_super_admin() = false) gets its
-- role/branch silently reverted.
create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_super_admin() then
    new.role := old.role;
    new.branch := old.branch;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_privileged_columns on public.profiles;
create trigger protect_profile_privileged_columns
  before update on public.profiles
  for each row
  execute function public.protect_profile_privileged_columns();
