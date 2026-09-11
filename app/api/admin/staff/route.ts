import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "super_admin") {
    return { errorResponse: NextResponse.json({ error: "Only the owner account can manage staff" }, { status: 403 }) };
  }
  return { user, supabase };
}

export async function GET() {
  const auth = await requireSuperAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  const { data: staffProfiles, error } = await auth.supabase!
    .from("profiles")
    .select("id, full_name, phone_number, role, branch, created_at")
    .in("role", ["admin", "super_admin"])
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const admin = createAdminClient();
  const staff = await Promise.all(
    (staffProfiles ?? []).map(async (p) => {
      const { data } = await admin.auth.admin.getUserById(p.id);
      const bannedUntil = data.user?.banned_until;
      return {
        ...p,
        email: data.user?.email ?? null,
        banned: !!bannedUntil && bannedUntil !== "none" && new Date(bannedUntil) > new Date(),
      };
    })
  );

  return NextResponse.json({ staff });
}

export async function POST(request: Request) {
  const auth = await requireSuperAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  const body = await request.json().catch(() => null);
  const { email, password, full_name, branch } = body ?? {};
  if (!email || !password || !full_name || !branch) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (branch !== "Palindan" && branch !== "Uptown") {
    return NextResponse.json({ error: "Branch must be Palindan or Uptown" }, { status: 400 });
  }
  if (String(password).length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });
  if (error || !data.user) {
    return NextResponse.json({ error: error?.message ?? "Failed to create account" }, { status: 400 });
  }

  // The profiles/loyalty_cards rows are created by a DB trigger that fires
  // on the email-confirmed transition; give it a moment before flipping
  // this new profile from the trigger's default 'customer' role to 'admin'.
  await new Promise((r) => setTimeout(r, 500));

  const { error: updateError } = await admin.from("profiles").update({ role: "admin", branch }).eq("id", data.user.id);
  if (updateError) {
    return NextResponse.json(
      { error: `Account created but failed to assign role: ${updateError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: data.user.id });
}
