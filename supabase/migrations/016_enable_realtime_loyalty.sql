-- The customer dashboard subscribes to postgres_changes on loyalty_cards
-- (UPDATE) and stamp_logs (INSERT) to show a live "you got a stamp!" toast,
-- but neither table was ever added to the supabase_realtime publication —
-- so the client subscribes successfully (status "SUBSCRIBED") yet never
-- receives a single event, because Postgres never streams their WAL changes
-- to the Realtime service in the first place. Confirmed via a raw
-- @supabase/supabase-js listener that stayed subscribed through a real
-- UPDATE + INSERT and received nothing.
alter publication supabase_realtime add table public.loyalty_cards;
alter publication supabase_realtime add table public.stamp_logs;
