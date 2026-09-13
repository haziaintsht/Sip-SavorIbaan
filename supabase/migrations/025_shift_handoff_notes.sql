-- Free-text note a cashier can leave when closing a shift, so the next
-- person on that branch isn't walking in blind ("machine acting up",
-- "low on cups"). Purely informational — no RLS change needed beyond
-- what shift_closeouts already has.
alter table public.shift_closeouts
  add column if not exists handoff_note text;
