-- Bug fix: protect_review_moderation() (migration 023) forced status to
-- 'pending' on EVERY insert unconditionally, including migration 023's own
-- seed insert — so all 8 seeded testimonials landed as 'pending' instead
-- of 'approved', and the same gap existed on the update side for any
-- service-role-driven change. Both branches now treat "no auth.uid() at
-- all" (a migration or service-role call, never a real end-user session)
-- as trusted, same reasoning as protect_profile_privileged_columns.
create or replace function public.protect_review_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trusted boolean;
begin
  v_trusted := auth.uid() is null or public.is_super_admin();

  if TG_OP = 'INSERT' then
    if not v_trusted then
      new.status := 'pending';
      new.reviewed_at := null;
      new.reviewed_by := null;
    end if;
    return new;
  end if;

  if v_trusted then
    if new.status is distinct from old.status then
      new.reviewed_at := now();
      new.reviewed_by := auth.uid();
      insert into public.audit_log (actor_id, table_name, action, row_id, old_data, new_data)
      values (
        auth.uid(), 'reviews', 'MODERATE', new.id::text,
        jsonb_build_object('status', old.status),
        jsonb_build_object('status', new.status)
      );
    end if;
  else
    new.status := 'pending';
    new.reviewed_at := null;
    new.reviewed_by := null;
  end if;

  return new;
end;
$$;

-- Correct the 8 seed rows that landed as 'pending' because of the bug
-- above. Scoped to user_id is null so this can never touch a real
-- customer's own review.
update public.reviews
set status = 'approved', reviewed_at = now()
where user_id is null and status = 'pending';
