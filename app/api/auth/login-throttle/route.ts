import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp, TOO_MANY_REQUESTS } from "@/lib/rateLimit";

// Login itself goes straight from the browser to Supabase (so it can set
// the session cookies), which means our server never sees those requests
// to throttle them directly. The login page calls this first as a gate:
// both an IP-wide cap (stop one script hammering many accounts) and a
// per-email cap (stop distributed attempts against one target account).
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const { email } = body ?? {};
  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  const admin = createAdminClient();
  const ip = getClientIp(request);

  const [ipAllowed, emailAllowed] = await Promise.all([
    checkRateLimit(admin, `login-ip:${ip}`, 10, 900),
    checkRateLimit(admin, `login-email:${String(email).toLowerCase()}`, 10, 900),
  ]);

  if (!ipAllowed || !emailAllowed) {
    return NextResponse.json(TOO_MANY_REQUESTS, { status: 429 });
  }

  return NextResponse.json({ ok: true });
}
