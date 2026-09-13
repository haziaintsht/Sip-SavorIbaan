-- Dine-in vs. take-out, with a Php 10/container fee. Same pattern as
-- discount/tax (008_pos_discount_tax.sql): plain numeric columns folded
-- into total, not a synthetic order_items row.
-- total = subtotal - discount + tax + container_fee
alter table public.orders
  add column if not exists dining_option text not null default 'Dine-in'
    check (dining_option in ('Dine-in', 'Take-out')),
  add column if not exists container_count integer not null default 0,
  add column if not exists container_fee numeric(10, 2) not null default 0;
