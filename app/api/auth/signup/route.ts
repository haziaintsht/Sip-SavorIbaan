import { NextResponse } from "next/server";
import { createAdminClient, findUserByEmail } from "@/lib/supabase/admin";
import { generateCode, hashCode, CODE_TTL_MINUTES } from "@/lib/verificationCode";
import { sendSignupCode } from "@/lib/emailjs";
import { checkRateLimit, getClientIp, TOO_MANY_REQUESTS } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const { fullName, email, phoneNumber, location, password } = body ?? {};

  if (!fullName || !email || !phoneNumber || !location || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (String(password).length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const admin = createAdminClient();

  const ip = getClientIp(request);
  const allowed = await checkRateLimit(admin, `signup:${ip}`, 5, 3600);
  if (!allowed) {
    return NextResponse.json(TOO_MANY_REQUESTS, { status: 429 });
  }

  const { user: existing } = await findUserByEmail(admin, email);

  if (existing && existing.email_confirmed_at) {
    return NextResponse.json(
      { error: "You already have an account with this email. Please log in instead.", code: "ACCOUNT_EXISTS" },
      { status: 409 }
    );
  }

  let userId: string;

  if (existing) {
    // A previous signup attempt with this email was never verified — reuse
    // that account instead of erroring, in case the customer is retrying
    // with a corrected password/phone/barangay.
    const { error: updateError } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      user_metadata: { full_name: fullName, phone_number: phoneNumber, location },
    });
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }
    userId = existing.id;
    await admin
      .from("email_verification_codes")
      .update({ consumed_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("purpose", "signup")
      .is("consumed_at", null);
  } else {
    // Created unconfirmed — the profiles/loyalty_cards row only appears once
    // email_confirm flips to true in the verify step below.
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { full_name: fullName, phone_number: phoneNumber, location },
    });

    if (error || !data.user) {
      return NextResponse.json({ error: error?.message ?? "Failed to create account" }, { status: 400 });
    }
    userId = data.user.id;
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);
  const { error: codeError } = await admin.from("email_verification_codes").insert({
    email,
    code_hash: hashCode(code),
    purpose: "signup",
    user_id: userId,
    expires_at: expiresAt.toISOString(),
  });

  if (codeError) {
    return NextResponse.json({ error: codeError.message }, { status: 500 });
  }

  try {
    await sendSignupCode(email, code, expiresAt);
  } catch {
    return NextResponse.json(
      { error: "Account created but the email failed to send. Try resending the code." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
