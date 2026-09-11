-- ============================================================
-- WiFi password per branch, shown on receipts. Editable via the
-- Settings page like the rest of branch_info.
-- ============================================================

alter table public.branch_info
  add column if not exists wifi_password text;

update public.branch_info set wifi_password = 'TaraKape2026!' where branch = 'Palindan' and wifi_password is null;
update public.branch_info set wifi_password = 'TaraKape2026!' where branch = 'Uptown' and wifi_password is null;
