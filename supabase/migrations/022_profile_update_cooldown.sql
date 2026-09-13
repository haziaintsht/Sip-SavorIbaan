-- A customer can only change their own full_name/phone_number/location
-- once every 7 days. Enforced in the database (not just the /account page
-- UI) so it can't be skipped with a direct API call, same reasoning as the
-- role/branch protection in the previous migration.
alter table public.profiles
  add column if not exists profile_updated_at timestamptz;

create or replace function public.enforce_profile_update_cooldown()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_changed boolean;
begin
  v_changed :=
    new.full_name is distinct from old.full_name
    or new.phone_number is distinct from old.phone_number
    or new.location is distinct from old.location;

  if v_changed and old.role = 'customer' and auth.uid() is not null and not public.is_super_admin() then
    if old.profile_updated_at is not null and now() - old.profile_updated_at < interval '7 days' then
      raise exception 'You can update your profile again on %',
        to_char(old.profile_updated_at + interval '7 days', 'FMMonth FMDD, YYYY');
    end if;
    new.profile_updated_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_profile_update_cooldown on public.profiles;
create trigger enforce_profile_update_cooldown
  before update on public.profiles
  for each row
  execute function public.enforce_profile_update_cooldown();
