import { NextResponse } from "next/server";
import { createAdminClient, findUserByEmail } from "@/lib/supabase/admin";
import { generateCode, hashCode, CODE_TTL_MINUTES } from "@/lib/verificationCode";
import { sendResetCode } from "@/lib/emailjs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const { email } = body ?? {};
  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { user } = await findUserByEmail(admin, email);

  // Always respond the same way regardless of whether the account exists,
  // so this can't be used to find out which emails are registered.
  if (!user) {
    return NextResponse.json({ ok: true });
  }

  const code = generateCode();
  await admin.from("email_verification_codes").insert({
    email,
    code_hash: hashCode(code),
    purpose: "reset",
    user_id: user.id,
    expires_at: new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString(),
  });

  try {
    await sendResetCode(email, code);
  } catch {
    // Still respond ok — don't leak whether the account exists via a
    // different error path, and the user can just request another code.
  }

  return NextResponse.json({ ok: true });
}
