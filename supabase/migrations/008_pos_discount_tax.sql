-- ============================================================
-- Adds discount/tax tracking to orders so the POS can apply a
-- discount (e.g. senior/PWD 20%) and, optionally, tax — without
-- changing the meaning of subtotal/total already in use.
-- total = subtotal - discount + tax
-- ============================================================

alter table public.orders
  add column if not exists discount numeric(10, 2) not null default 0,
  add column if not exists tax numeric(10, 2) not null default 0;
