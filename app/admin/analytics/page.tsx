"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAdminAccess } from "@/lib/useAdminAccess";
import CoffeeLoader from "@/components/CoffeeLoader";

type RangeKey = "7d" | "30d";

type DayRow = { date: string; Palindan: number; Uptown: number };

// Local-time date key (not toISOString, which is UTC and can shift the
// date by a day relative to the local-midnight bucket boundaries below).
function dateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function AdminAnalyticsPage() {
  const supabase = createClient();
  const access = useAdminAccess();

  const [range, setRange] = useState<RangeKey>("7d");
  const [rows, setRows] = useState<{ branch: string; total: number; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (access.role !== "super_admin") return;
    setLoading(true);
    const days = range === "7d" ? 7 : 30;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    supabase
      .from("orders")
      .select("branch, total, created_at")
      .eq("status", "completed")
      .gte("created_at", start.toISOString())
      .then(({ data }) => {
        setRows(data ?? []);
        setLoading(false);
      });
  }, [supabase, range, access.role]);

  const { days, totals } = useMemo(() => {
    const dayCount = range === "7d" ? 7 : 30;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (dayCount - 1));

    const byDay = new Map<string, DayRow>();
    for (let i = 0; i < dayCount; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      byDay.set(dateKey(d), { date: dateKey(d), Palindan: 0, Uptown: 0 });
    }
    const totals = { Palindan: { revenue: 0, orders: 0 }, Uptown: { revenue: 0, orders: 0 } };
    for (const r of rows) {
      const key = dateKey(new Date(r.created_at));
      const bucket = byDay.get(key);
      if (bucket && (r.branch === "Palindan" || r.branch === "Uptown")) {
        bucket[r.branch] += Number(r.total);
      }
      if (r.branch === "Palindan" || r.branch === "Uptown") {
        totals[r.branch].revenue += Number(r.total);
        totals[r.branch].orders += 1;
      }
    }
    return { days: [...byDay.values()], totals };
  }, [rows, range]);

  const maxDay = Math.max(...days.map((d) => Math.max(d.Palindan, d.Uptown)), 0);

  if (!access.loading && access.role !== "super_admin") {
    return (
      <div>
        <h2 className="font-serif text-2xl text-[#2D5A27]">Analytics</h2>
        <p className="mt-3 text-sm text-stone-600">Only the owner account can view branch trends.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-serif text-2xl text-[#2D5A27]">Analytics</h2>
      <p className="mt-1 text-sm text-stone-600">Revenue trends, Palindan vs. Uptown.</p>

      <div className="mt-5 flex gap-2">
        {(["7d", "30d"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`chip ${range === r ? "chip-active" : ""}`}
          >
            {r === "7d" ? "Last 7 days" : "Last 30 days"}
          </button>
        ))}
      </div>

      <div className="mt-4 flex gap-4 text-xs text-stone-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#2D5A27]" /> Palindan
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#2D5A27]/35" /> Uptown
        </span>
      </div>

      <div className="mt-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        {loading ? (
          <CoffeeLoader size={56} />
        ) : maxDay === 0 ? (
          <p className="text-sm text-stone-500">No completed orders in this period.</p>
        ) : (
          <div className="flex items-end gap-1 overflow-x-auto pb-1">
            {days.map((d) => (
              <div key={d.date} className="flex min-w-[18px] flex-1 flex-col items-center">
                <div className="flex h-32 w-full items-end justify-center gap-0.5">
                  <div
                    className="w-1/2 rounded-t bg-[#2D5A27]"
                    style={{ height: `${maxDay ? Math.max((d.Palindan / maxDay) * 100, d.Palindan > 0 ? 3 : 0) : 0}%` }}
                    title={`Palindan: ₱${d.Palindan.toFixed(2)}`}
                  />
                  <div
                    className="w-1/2 rounded-t bg-[#2D5A27]/35"
                    style={{ height: `${maxDay ? Math.max((d.Uptown / maxDay) * 100, d.Uptown > 0 ? 3 : 0) : 0}%` }}
                    title={`Uptown: ₱${d.Uptown.toFixed(2)}`}
                  />
                </div>
                <span className="mt-1.5 whitespace-nowrap text-[9px] text-stone-400">
                  {new Date(d.date).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <h3 className="mt-8 font-serif text-lg text-[#2D5A27]">
        Period Totals — {range === "7d" ? "Last 7 days" : "Last 30 days"}
      </h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {(["Palindan", "Uptown"] as const).map((branch) => {
          const t = totals[branch];
          const aov = t.orders > 0 ? t.revenue / t.orders : 0;
          return (
            <div key={branch} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <h4 className="font-serif text-base text-[#2D5A27]">{branch}</h4>
              <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-lg font-semibold text-[#2D5A27]">₱{t.revenue.toFixed(2)}</p>
                  <p className="text-xs text-stone-500">Revenue</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-[#2D5A27]">{t.orders}</p>
                  <p className="text-xs text-stone-500">Orders</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-[#2D5A27]">₱{aov.toFixed(2)}</p>
                  <p className="text-xs text-stone-500">Avg. order</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
