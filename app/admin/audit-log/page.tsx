"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAdminAccess } from "@/lib/useAdminAccess";
import CoffeeLoader from "@/components/CoffeeLoader";
import EmptyState from "@/components/EmptyState";
import { History, ChevronDown, ChevronUp } from "lucide-react";

type AuditRow = {
  id: string;
  table_name: string;
  action: string;
  row_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
  actor: { full_name: string } | null;
};

const TABLE_LABEL: Record<string, string> = {
  menu_items: "Menu",
  branch_info: "Settings",
  profiles_role_branch: "Staff role/branch",
  reviews: "Review",
};

const ACTION_STYLE: Record<string, string> = {
  INSERT: "bg-[#2D5A27]/10 text-[#2D5A27]",
  UPDATE: "bg-amber-100 text-amber-800",
  DELETE: "bg-red-100 text-red-700",
  MODERATE: "bg-[#2D5A27]/10 text-[#2D5A27]",
  BLOCKED_ATTEMPT: "bg-red-100 text-red-700",
};

export default function AdminAuditLogPage() {
  const supabase = createClient();
  const access = useAdminAccess();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (access.role !== "super_admin") return;
    supabase
      .from("audit_log")
      .select("id, table_name, action, row_id, old_data, new_data, created_at, actor:profiles!audit_log_actor_id_fkey(full_name)")
      .order("created_at", { ascending: false })
      .limit(200)
      .returns<AuditRow[]>()
      .then(({ data }) => {
        setRows(data ?? []);
        setLoading(false);
      });
  }, [supabase, access.role]);

  if (!access.loading && access.role !== "super_admin") {
    return (
      <div>
        <h2 className="font-serif text-2xl text-[#2D5A27]">Audit Log</h2>
        <p className="mt-3 text-sm text-stone-600">Only the owner account can view the audit log.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-serif text-2xl text-[#2D5A27]">Audit Log</h2>
      <p className="mt-1 text-sm text-stone-600">
        Menu edits, settings changes, staff role/branch changes, and review moderation — most recent 200.
      </p>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#2D5A27]/5 text-stone-500">
            <tr>
              <th className="px-5 py-3 font-medium">When</th>
              <th className="px-5 py-3 font-medium">Actor</th>
              <th className="px-5 py-3 font-medium">Area</th>
              <th className="px-5 py-3 font-medium">Action</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-8">
                  <CoffeeLoader size={36} label={null} />
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <>
                  <tr key={r.id} className="border-t border-stone-100 transition hover:bg-stone-50">
                    <td className="whitespace-nowrap px-5 py-3 text-stone-500">
                      {new Date(r.created_at).toLocaleString("en-PH", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-5 py-3 text-stone-700">{r.actor?.full_name ?? "—"}</td>
                    <td className="px-5 py-3 text-stone-700">{TABLE_LABEL[r.table_name] ?? r.table_name}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ACTION_STYLE[r.action] ?? "bg-stone-100 text-stone-600"}`}>
                        {r.action === "BLOCKED_ATTEMPT" ? "Blocked attempt" : r.action[0] + r.action.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                        className="text-stone-400 hover:text-[#2D5A27]"
                      >
                        {expanded === r.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </td>
                  </tr>
                  {expanded === r.id && (
                    <tr key={`${r.id}-detail`} className="border-t border-stone-100 bg-stone-50">
                      <td colSpan={5} className="px-5 py-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          {r.old_data && (
                            <div>
                              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-400">Before</p>
                              <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-white p-3 text-xs text-stone-600">
                                {JSON.stringify(r.old_data, null, 2)}
                              </pre>
                            </div>
                          )}
                          {r.new_data && (
                            <div>
                              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-400">After</p>
                              <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-white p-3 text-xs text-stone-600">
                                {JSON.stringify(r.new_data, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}

            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <EmptyState icon={History} message="No audit events yet." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
