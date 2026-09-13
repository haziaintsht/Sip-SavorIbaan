import { NextResponse } from "next/server";
import { createAdminClient, findUserByEmail } from "@/lib/supabase/admin";
import { generateCode, hashCode, CODE_TTL_MINUTES } from "@/lib/verificationCode";
import { sendSignupCode } from "@/lib/emailjs";
import { checkRateLimit, getClientIp, TOO_MANY_REQUESTS } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const { email } = body ?? {};
  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  const admin = createAdminClient();

  const ip = getClientIp(request);
  const allowed = await checkRateLimit(admin, `resend-signup-code:${ip}`, 5, 3600);
  if (!allowed) {
    return NextResponse.json(TOO_MANY_REQUESTS, { status: 429 });
  }

  const { user } = await findUserByEmail(admin, email);

  // Same response whether or not the account exists, so this can't be used
  // to probe which emails are registered.
  if (!user || user.email_confirmed_at) {
    return NextResponse.json({ ok: true });
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);
  await admin.from("email_verification_codes").insert({
    email,
    code_hash: hashCode(code),
    purpose: "signup",
    user_id: user.id,
    expires_at: expiresAt.toISOString(),
  });

  try {
    await sendSignupCode(email, code, expiresAt);
  } catch {
    return NextResponse.json({ error: "The email failed to send. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
