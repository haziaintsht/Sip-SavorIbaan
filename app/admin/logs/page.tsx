import { createClient } from "@/lib/supabase/server";

type LogRow = {
  id: string;
  action: "ADD_STAMP" | "REMOVE_STAMP" | "REDEEM_REWARD";
  branch_location: string | null;
  created_at: string;
  loyalty_cards: { profiles: { full_name: string } | null } | null;
  admin: { full_name: string } | null;
};

const ACTION_LABEL: Record<LogRow["action"], string> = {
  ADD_STAMP: "Stamp added",
  REMOVE_STAMP: "Stamp removed",
  REDEEM_REWARD: "Reward redeemed",
};

const ACTION_STYLE: Record<LogRow["action"], string> = {
  ADD_STAMP: "bg-[#2D5A27]/10 text-[#2D5A27]",
  REMOVE_STAMP: "bg-red-100 text-red-700",
  REDEEM_REWARD: "bg-amber-100 text-amber-800",
};

export default async function AdminLogsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("stamp_logs")
    .select(
      "id, action, branch_location, created_at, loyalty_cards(profiles(full_name)), admin:profiles!stamp_logs_admin_id_fkey(full_name)"
    )
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<LogRow[]>();

  const logs = data ?? [];

  return (
    <div>
      <h2 className="font-serif text-2xl text-[#2D5A27]">Activity Log</h2>
      <p className="mt-1 text-sm text-stone-600">Most recent 100 stamp actions.</p>

      {error && <p className="mt-4 text-sm text-red-600">Couldn&apos;t load activity log.</p>}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-200 text-stone-500">
            <tr>
              <th className="px-5 py-3 font-medium">When</th>
              <th className="px-5 py-3 font-medium">Customer</th>
              <th className="px-5 py-3 font-medium">Action</th>
              <th className="px-5 py-3 font-medium">Branch</th>
              <th className="px-5 py-3 font-medium">Staff</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-stone-100 last:border-0">
                <td className="px-5 py-3 whitespace-nowrap text-stone-500">
                  {new Date(log.created_at).toLocaleString()}
                </td>
                <td className="px-5 py-3 text-stone-900">
                  {log.loyalty_cards?.profiles?.full_name ?? "—"}
                </td>
                <td className="px-5 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs ${ACTION_STYLE[log.action]}`}>
                    {ACTION_LABEL[log.action]}
                  </span>
                </td>
                <td className="px-5 py-3 text-stone-700">{log.branch_location ?? "—"}</td>
                <td className="px-5 py-3 text-stone-700">{log.admin?.full_name ?? "—"}</td>
              </tr>
            ))}

            {logs.length === 0 && !error && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-stone-500">
                  No activity logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
