import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashCode } from "@/lib/verificationCode";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const { email, code } = body ?? {};
  if (!email || !code) {
    return NextResponse.json({ error: "Missing email or code" }, { status: 400 });
  }

  const admin = createAdminClient();
  const codeHash = hashCode(String(code).trim());

  const { data: match } = await admin
    .from("email_verification_codes")
    .select("id, user_id, expires_at")
    .eq("email", email)
    .eq("purpose", "signup")
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

  const { error: confirmError } = await admin.auth.admin.updateUserById(match.user_id, {
    email_confirm: true,
  });
  if (confirmError) {
    return NextResponse.json({ error: confirmError.message }, { status: 500 });
  }

  // Give the profile/loyalty_card creation trigger (fires on the
  // email-confirmed transition) a moment to finish before the user tries
  // to log in.
  await new Promise((r) => setTimeout(r, 500));

  return NextResponse.json({ ok: true });
}
