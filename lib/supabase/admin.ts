import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only client using the service_role key — full Admin API access,
// bypasses RLS entirely. Never import this from a Client Component; it must
// only run inside Route Handlers / Server Actions. Routes that perform
// account-level actions on behalf of a logged-in caller (e.g. staff
// management) must verify that caller is super_admin first using the
// regular cookie-based server client; the public auth routes (signup,
// email verification, password reset) instead rely on the emailed one-time
// code as their access control, since the caller isn't logged in yet.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// The Admin API's listUsers() has no email filter, only pagination — fine
// at this business's scale, where "every user" comfortably fits one page.
export async function findUserByEmail(admin: SupabaseClient, email: string) {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) return { user: null, error };
  const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
  return { user, error: null };
}
