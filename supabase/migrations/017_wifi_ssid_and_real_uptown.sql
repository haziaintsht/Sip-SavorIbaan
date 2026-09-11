-- Adds the WiFi network name (SSID) alongside the existing password column,
-- and sets the real Uptown WiFi details the owner provided. Palindan's
-- previous wifi_password was a placeholder invented for testing, not real
-- WiFi info — clearing it so receipts don't show fake credentials to
-- customers until the real Palindan details are provided.
alter table public.branch_info
  add column if not exists wifi_ssid text;

update public.branch_info
  set wifi_ssid = 'sipandsavorspot', wifi_password = 'Uptown1!'
  where branch = 'Uptown';

update public.branch_info
  set wifi_ssid = null, wifi_password = null
  where branch = 'Palindan';
