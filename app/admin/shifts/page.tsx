"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ClosetoutRow = {
  id: string;
  branch: string;
  created_at: string;
  period_start: string;
  order_count: number;
  cash_total: number;
  gcash_total: number;
  counted_cash: number;
  variance: number;
  admin: { full_name: string } | null;
};

export default function AdminShiftsPage() {
  const supabase = createClient();
  const [closeouts, setCloseouts] = useState<ClosetoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onlyVariances, setOnlyVariances] = useState(false);

  useEffect(() => {
    supabase
      .from("shift_closeouts")
      .select(
        "id, branch, created_at, period_start, order_count, cash_total, gcash_total, counted_cash, variance, admin:profiles!shift_closeouts_admin_id_fkey(full_name)"
      )
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<ClosetoutRow[]>()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        setCloseouts(data ?? []);
        setLoading(false);
      });
  }, [supabase]);

  const summary = useMemo(() => {
    const withVariance = closeouts.filter((c) => Number(c.variance) !== 0);
    const netVariance = closeouts.reduce((s, c) => s + Number(c.variance), 0);
    return { total: closeouts.length, offCount: withVariance.length, netVariance };
  }, [closeouts]);

  const visible = onlyVariances ? closeouts.filter((c) => Number(c.variance) !== 0) : closeouts;

  return (
    <div>
      <h2 className="font-serif text-2xl text-[#2D5A27]">Shift Close-outs</h2>
      <p className="mt-1 text-sm text-stone-600">Cash drawer reconciliation history, most recent first.</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xl font-semibold text-[#2D5A27]">{summary.total}</p>
          <p className="text-xs text-stone-500">Shifts closed</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className={`text-xl font-semibold ${summary.offCount > 0 ? "text-red-600" : "text-[#2D5A27]"}`}>
            {summary.offCount}
          </p>
          <p className="text-xs text-stone-500">Shifts with a variance</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className={`text-xl font-semibold ${summary.netVariance < 0 ? "text-red-600" : "text-[#2D5A27]"}`}>
            {summary.netVariance === 0 ? "₱0.00" : `${summary.netVariance > 0 ? "+" : "−"}₱${Math.abs(summary.netVariance).toFixed(2)}`}
          </p>
          <p className="text-xs text-stone-500">Net variance</p>
        </div>
      </div>

      <button
        onClick={() => setOnlyVariances((v) => !v)}
        className={`chip mt-4 ${onlyVariances ? "chip-active" : ""}`}
      >
        {onlyVariances ? "Showing variances only" : "Show only variances"}
      </button>

      {error && <p className="mt-4 text-sm text-red-600">Couldn&apos;t load shift close-outs.</p>}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#2D5A27]/5 text-stone-500">
            <tr>
              <th className="px-5 py-3 font-medium">Closed</th>
              <th className="px-5 py-3 font-medium">Branch</th>
              <th className="px-5 py-3 font-medium">Staff</th>
              <th className="px-5 py-3 font-medium">Orders</th>
              <th className="px-5 py-3 font-medium">Expected cash</th>
              <th className="px-5 py-3 font-medium">Counted</th>
              <th className="px-5 py-3 font-medium">GCash</th>
              <th className="px-5 py-3 font-medium">Variance</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-stone-500">
                  Loading…
                </td>
              </tr>
            ) : (
              visible.map((c) => (
                <tr key={c.id} className="border-t border-stone-100 transition hover:bg-stone-50">
                  <td className="whitespace-nowrap px-5 py-3 text-stone-500">
                    {new Date(c.created_at).toLocaleString("en-PH", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-5 py-3 text-stone-700">{c.branch}</td>
                  <td className="px-5 py-3 text-stone-700">{c.admin?.full_name ?? "—"}</td>
                  <td className="px-5 py-3 text-stone-700">{c.order_count}</td>
                  <td className="px-5 py-3 text-stone-700">₱{Number(c.cash_total).toFixed(2)}</td>
                  <td className="px-5 py-3 text-stone-700">₱{Number(c.counted_cash).toFixed(2)}</td>
                  <td className="px-5 py-3 text-stone-700">₱{Number(c.gcash_total).toFixed(2)}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        Number(c.variance) === 0
                          ? "bg-[#2D5A27]/10 text-[#2D5A27]"
                          : Number(c.variance) > 0
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {Number(c.variance) === 0
                        ? "Balanced"
                        : Number(c.variance) > 0
                        ? `+₱${Number(c.variance).toFixed(2)}`
                        : `−₱${Math.abs(Number(c.variance)).toFixed(2)}`}
                    </span>
                  </td>
                </tr>
              ))
            )}

            {!loading && visible.length === 0 && !error && (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-stone-500">
                  {onlyVariances ? "No shifts with a variance." : "No shift close-outs yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
