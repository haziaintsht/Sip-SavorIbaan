import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Hit when the customer clicks the verification link in their email.
// Exchanging the code confirms the email, but we sign back out right after
// so they land on a genuinely logged-out /login page, not a login form
// sitting behind an already-authenticated navbar.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/login?verified=1";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=verification_failed`);
}
