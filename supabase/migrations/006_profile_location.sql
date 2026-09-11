-- ============================================================
-- Adds a customer-supplied location (town/city) to profiles, so
-- the shop owner can see where their customer base lives.
-- Existing rows get null; the trigger now also captures it for
-- new signups.
-- ============================================================

alter table public.profiles
  add column if not exists location text;

create or replace function public.handle_new_verified_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.email_confirmed_at is not null and old.email_confirmed_at is null) then
    insert into public.profiles (id, full_name, phone_number, location, role)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'full_name', 'New Customer'),
      new.raw_user_meta_data ->> 'phone_number',
      new.raw_user_meta_data ->> 'location',
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
