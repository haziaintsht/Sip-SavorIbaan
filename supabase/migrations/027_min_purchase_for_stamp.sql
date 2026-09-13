-- Orders under Php 199 don't earn a loyalty stamp. Enforced here (not just
-- the POS UI hiding the customer lookup) so it can't be skipped by calling
-- the RPC directly. p_purchase_amount defaults to null, which skips the
-- check entirely — the standalone /admin/stamps tool (manual add/remove,
-- not tied to a specific order) keeps working exactly as before.
create or replace function public.stamp_action(
  p_card_id uuid,
  p_action text,
  p_branch_location text default null,
  p_purchase_amount numeric default null
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

  if p_action = 'ADD_STAMP' and p_purchase_amount is not null and p_purchase_amount < 199 then
    raise exception 'Purchase must be at least Php 199 to earn a stamp';
  end if;

  if p_action = 'ADD_STAMP' then
    update public.loyalty_cards
      set stamp_count = least(stamp_count + 1, 10)
      where id = p_card_id
      returning * into v_card;
  elsif p_action = 'REMOVE_STAMP' then
    update public.loyalty_cards
      set stamp_count = greatest(stamp_count - 1, 0)
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
