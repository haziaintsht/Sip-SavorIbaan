import type { SupabaseClient } from "@supabase/supabase-js";

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

// Fails OPEN: if the rate-limit check itself errors (e.g. a transient DB
// hiccup), the request is allowed through rather than locking everyone out
// of signup/login over an unrelated outage.
export async function checkRateLimit(
  admin: SupabaseClient,
  key: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<boolean> {
  const { data, error } = await admin.rpc("check_rate_limit", {
    p_key: key,
    p_max_attempts: maxAttempts,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("check_rate_limit failed:", error.message);
    return true;
  }
  return data === true;
}

export const TOO_MANY_REQUESTS = {
  error: "Too many attempts. Please wait a bit and try again.",
} as const;
