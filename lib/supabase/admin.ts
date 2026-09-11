import { createClient } from "@supabase/supabase-js";

// Server-only client using the service_role key — full Admin API access,
// bypasses RLS entirely. Never import this from a Client Component; it must
// only run inside Route Handlers / Server Actions, and every caller must be
// verified as super_admin first using the regular cookie-based server client.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
