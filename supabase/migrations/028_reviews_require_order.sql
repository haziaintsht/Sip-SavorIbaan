-- A customer can only submit a review if they have at least one completed
-- order on record — stops someone who never actually bought anything from
-- posting a review. Enforced in the insert policy itself (not just the
-- dashboard UI), so it can't be skipped by calling the API directly.
drop policy if exists "reviews_insert_own" on public.reviews;

create policy "reviews_insert_own"
  on public.reviews for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.orders
      where customer_id = auth.uid() and status = 'completed'
    )
  );
