-- Lets a cashier undo a misclicked "Add Stamp" instead of the customer
-- being stuck with a stamp they didn't earn. Logged as its own event
-- (REMOVE_STAMP) rather than deleting the original ADD_STAMP row, so the
-- correction stays visible in history instead of quietly rewriting it.
alter table public.stamp_logs drop constraint if exists stamp_logs_action_check;
alter table public.stamp_logs
  add constraint stamp_logs_action_check
  check (action in ('ADD_STAMP', 'REDEEM_REWARD', 'REMOVE_STAMP'));

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
