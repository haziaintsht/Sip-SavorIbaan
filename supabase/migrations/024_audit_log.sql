-- Audit trail for privileged actions. stamp_logs has always covered
-- stamp/reward activity; this covers everything else that previously left
-- no trace: menu edits, branch/settings edits, staff role/branch changes
-- (including BLOCKED self-escalation attempts — see migration 021), and
-- review moderation decisions. Super_admin-readable only.
create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.profiles(id),
  table_name  text not null,
  action      text not null,
  row_id      text,
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz not null default now()
);

alter table public.audit_log enable row level security;

create policy "audit_log_select_super_admin"
  on public.audit_log for select
  using (public.is_super_admin());

-- No insert/update/delete policy for anon/authenticated roles — rows are
-- only ever written by the security-definer trigger functions below.

create or replace function public.log_audit_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log (actor_id, table_name, action, row_id, old_data, new_data)
  values (
    auth.uid(),
    TG_TABLE_NAME,
    TG_OP,
    (case when TG_OP = 'DELETE' then old.id else new.id end)::text,
    case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when TG_OP in ('UPDATE', 'INSERT') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists audit_menu_items on public.menu_items;
create trigger audit_menu_items
  after insert or update or delete on public.menu_items
  for each row execute function public.log_audit_change();

drop trigger if exists audit_branch_info on public.branch_info;
create trigger audit_branch_info
  after insert or update or delete on public.branch_info
  for each row execute function public.log_audit_change();

-- Staff role/branch changes get their own trigger rather than the generic
-- one above, since a blanket profiles trigger would also log every
-- customer's own full_name/phone/location edits — noise this audit trail
-- doesn't need. Fires AFTER protect_profile_privileged_columns (migration
-- 021) has already reverted any unauthorized change, so it naturally
-- distinguishes a real staff change (old/new differ) from a blocked
-- customer escalation attempt (old/new end up identical, nothing logged
-- here — the attempt itself is logged separately below).
create or replace function public.log_staff_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role or new.branch is distinct from old.branch then
    insert into public.audit_log (actor_id, table_name, action, row_id, old_data, new_data)
    values (
      auth.uid(), 'profiles_role_branch', 'UPDATE', new.id::text,
      jsonb_build_object('role', old.role, 'branch', old.branch),
      jsonb_build_object('role', new.role, 'branch', new.branch)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists log_staff_role_change on public.profiles;
create trigger log_staff_role_change
  after update on public.profiles
  for each row execute function public.log_staff_role_change();

-- Enhance the existing role/branch protection (migration 021) to also log
-- a blocked self-escalation attempt — a customer's own client successfully
-- reaching the database with role/branch in the payload is worth knowing
-- about even though the write itself is neutralized.
create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_super_admin() then
    if new.role is distinct from old.role or new.branch is distinct from old.branch then
      insert into public.audit_log (actor_id, table_name, action, row_id, old_data, new_data)
      values (
        auth.uid(), 'profiles_role_branch', 'BLOCKED_ATTEMPT', old.id::text,
        jsonb_build_object('role', old.role, 'branch', old.branch),
        jsonb_build_object('attempted_role', new.role, 'attempted_branch', new.branch)
      );
    end if;
    new.role := old.role;
    new.branch := old.branch;
  end if;
  return new;
end;
$$;

-- Review moderation decisions (approve/reject) by a super_admin.
create or replace function public.protect_review_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    new.status := 'pending';
    new.reviewed_at := null;
    new.reviewed_by := null;
    return new;
  end if;

  if public.is_super_admin() then
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
