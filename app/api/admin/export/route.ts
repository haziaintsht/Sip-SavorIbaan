import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const EXPORT_TABLES = [
  "profiles",
  "loyalty_cards",
  "stamp_logs",
  "orders",
  "order_items",
  "menu_items",
  "branch_info",
  "reviews",
  "shift_closeouts",
  "audit_log",
] as const;

const PAGE_SIZE = 1000;

// PostgREST caps a single response at 1000 rows by default — page through
// each table rather than silently truncating a "full backup".
async function fetchAllRows(admin: SupabaseClient, table: string) {
  const rows: Record<string, unknown>[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await admin.from(table).select("*").range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Only the owner account can export data" }, { status: 403 });
  }

  const admin = createAdminClient();
  const data: Record<string, unknown[]> = {};
  for (const table of EXPORT_TABLES) {
    try {
      data[table] = await fetchAllRows(admin, table);
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Export failed" }, { status: 500 });
    }
  }

  const payload = {
    exported_at: new Date().toISOString(),
    exported_by: user.email,
    tables: data,
  };

  const dateStamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="sip-savor-spot-backup-${dateStamp}.json"`,
    },
  });
}
