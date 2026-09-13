import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashCode } from "@/lib/verificationCode";
import { checkRateLimit, getClientIp, TOO_MANY_REQUESTS } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const { email, code, password } = body ?? {};
  if (!email || !code || !password) {
    return NextResponse.json({ error: "Missing email, code, or password" }, { status: 400 });
  }
  if (String(password).length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Keyed by IP + email so brute-forcing a 6-digit code (1M combinations)
  // can't just be retried faster than a per-IP-only limit would allow.
  const ip = getClientIp(request);
  const allowed = await checkRateLimit(admin, `reset-password:${ip}:${email}`, 8, 900);
  if (!allowed) {
    return NextResponse.json(TOO_MANY_REQUESTS, { status: 429 });
  }

  const codeHash = hashCode(String(code).trim());

  const { data: match } = await admin
    .from("email_verification_codes")
    .select("id, user_id, expires_at")
    .eq("email", email)
    .eq("purpose", "reset")
    .eq("code_hash", codeHash)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!match || new Date(match.expires_at) < new Date()) {
    return NextResponse.json({ error: "That code is invalid or expired." }, { status: 400 });
  }

  await admin
    .from("email_verification_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", match.id);

  const { error: updateError } = await admin.auth.admin.updateUserById(match.user_id, { password });
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
