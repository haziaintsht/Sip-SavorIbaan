-- Customer-submitted reviews. The landing page's testimonials marquee has
-- been showing fictional illustrative quotes since launch (see the comment
-- in app/page.tsx: "swap in real customer reviews as they come in") — this
-- finally wires that up. Reviews are moderated: a customer's own review
-- only appears publicly once a super_admin approves it, so the public
-- landing page can't be posted to directly.
create table if not exists public.reviews (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles(id) on delete set null,
  full_name    text not null,
  branch       text check (branch in ('Palindan', 'Uptown')),
  rating       integer not null check (rating between 1 and 5),
  body         text not null,
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at   timestamptz not null default now(),
  reviewed_at  timestamptz,
  reviewed_by  uuid references public.profiles(id),
  constraint reviews_user_id_unique unique (user_id)
);

alter table public.reviews enable row level security;

create policy "reviews_select_approved_public"
  on public.reviews for select
  using (status = 'approved');

create policy "reviews_select_own"
  on public.reviews for select
  using (auth.uid() = user_id);

create policy "reviews_select_admin"
  on public.reviews for select
  using (public.is_super_admin());

create policy "reviews_insert_own"
  on public.reviews for insert
  with check (auth.uid() = user_id);

create policy "reviews_update_own_or_admin"
  on public.reviews for update
  using (auth.uid() = user_id or public.is_super_admin());

-- A customer can never insert/update their way to status='approved' —
-- inserts always land as 'pending', and a customer editing their own
-- (possibly already-approved) review resets it to 'pending' rather than
-- letting an edited review stay live unreviewed. Only a super_admin update
-- can actually change status, and reviewed_at/reviewed_by are stamped here
-- rather than trusted from client input.
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
    end if;
  else
    new.status := 'pending';
    new.reviewed_at := null;
    new.reviewed_by := null;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_review_moderation on public.reviews;
create trigger protect_review_moderation
  before insert or update on public.reviews
  for each row
  execute function public.protect_review_moderation();

-- Seed with the original illustrative testimonials (pre-approved, no
-- user_id) so the marquee keeps its content until real reviews land, and
-- the super_admin can retire them later from the same moderation screen.
-- Guarded on the table being empty so re-running this migration can't
-- duplicate the seed rows.
insert into public.reviews (full_name, branch, rating, body, status, reviewed_at)
select * from (values
  ('Marites Magsino', 'Palindan', 5, 'Sobrang sarap ng kape dito, tapos may WiFi pa for work! Regular na ako dito sa Palindan, konti na lang stamps ko para sa free drink.', 'approved', now()),
  ('Jun Pesigan', 'Uptown', 5, 'Ang bait ng staff dito sa Uptown, parang barkada mo lang! Favorite ko yung Signature Glazed Chicken, sulit na sulit.', 'approved', now()),
  ('Grace Villanueva', 'Palindan', 5, 'Go-to spot namin ng family every weekend. Cozy yung ambiance, maganda din for chikahan. Sulit yung loyalty card, libre na kape after 10 stamps!', 'approved', now()),
  ('Ramon Macatangay', 'Uptown', 4, 'Dinala ko yung aso ko dito last week, ayos lang pala! Alfresco pa yung seating so sobrang relax ng vibe. Balik-balikan talaga.', 'approved', now()),
  ('Baby Marasigan', 'Palindan', 5, 'May live music sila tuwing weekend, sobrang saya! Dito na lang kami palagi mag-hangout ng mga kaibigan ko every Saturday night.', 'approved', now()),
  ('Ella Panganiban', 'Uptown', 5, 'Maluwag yung parking kaya OK na OK pag maramihan kami. Yung mga blended drinks nila, panalo lagi — ilang beses na kami bumalik dito.', 'approved', now()),
  ('Noel Ilagan', 'Palindan', 4, 'First time ko dito nung nag-work from home ako, ayun na-loyalty program pa pala ako in-add. Tuwang-tuwa ako sa stamp card nila, ang cute!', 'approved', now()),
  ('Tin Mendoza', 'Uptown', 5, 'Naka-ilang stamp na ako dito sa Uptown, sulit talaga bawat order. Yung rice meals nila, laking tulong pag busy day sa trabaho.', 'approved', now())
) as seed(full_name, branch, rating, body, status, reviewed_at)
where not exists (select 1 from public.reviews);
