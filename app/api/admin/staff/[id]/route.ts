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
  return { userId: user.id };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const { branch, role, banned } = body ?? {};

  const admin = createAdminClient();

  if (branch !== undefined || role !== undefined) {
    if (branch !== undefined && branch !== "Palindan" && branch !== "Uptown" && branch !== null) {
      return NextResponse.json({ error: "Branch must be Palindan, Uptown, or null" }, { status: 400 });
    }
    if (role !== undefined && role !== "admin" && role !== "super_admin") {
      return NextResponse.json({ error: "Role must be admin or super_admin" }, { status: 400 });
    }
    const patch: Record<string, unknown> = {};
    if (branch !== undefined) patch.branch = branch;
    if (role !== undefined) patch.role = role;

    const { error } = await admin.from("profiles").update(patch).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (banned !== undefined) {
    if (id === auth.userId) {
      return NextResponse.json({ error: "You can't deactivate your own account" }, { status: 400 });
    }
    const { error } = await admin.auth.admin.updateUserById(id, {
      ban_duration: banned ? "876000h" : "none",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
