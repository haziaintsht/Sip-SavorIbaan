import { createClient } from "@/lib/supabase/server";
import {
  Wallet,
  ShoppingBag,
  Gift,
  Users,
  Award,
  Trophy,
  Calculator,
  Banknote,
  Smartphone,
  Tag,
  Ban,
  TrendingUp,
  TrendingDown,
  Minus,
  Flame,
} from "lucide-react";

function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const startOfToday = startOfTodayISO();
  const todayISO = startOfToday.toISOString();
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const yesterdayISO = startOfYesterday.toISOString();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: myProfile } = user
    ? await supabase.from("profiles").select("role, branch").eq("id", user.id).single()
    : { data: null };
  const isBranchLocked = myProfile?.role === "admin" && !!myProfile.branch;

  const [
    { count: customerCount },
    { count: rewardsRedeemedTotal },
    { data: todayLogs },
    { data: todayOrders },
    { data: todayItems },
    { data: yesterdayOrders },
    { data: todayVoided },
    { data: nearRewardCards },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "customer"),
    supabase
      .from("stamp_logs")
      .select("*", { count: "exact", head: true })
      .eq("action", "REDEEM_REWARD"),
    supabase
      .from("stamp_logs")
      .select("action, branch_location")
      .gte("created_at", todayISO),
    supabase
      .from("orders")
      .select("branch, total, payment_method, discount, created_at")
      .eq("status", "completed")
      .gte("created_at", todayISO),
    supabase
      .from("order_items")
      .select("name, quantity, orders!inner(status, created_at)")
      .eq("orders.status", "completed")
      .gte("orders.created_at", todayISO),
    supabase
      .from("orders")
      .select("total")
      .eq("status", "completed")
      .gte("created_at", yesterdayISO)
      .lt("created_at", todayISO),
    supabase
      .from("orders")
      .select("total")
      .eq("status", "voided")
      .gte("created_at", todayISO),
    supabase
      .from("loyalty_cards")
      .select("stamp_count, profiles(full_name)")
      .gte("stamp_count", 8)
      .lt("stamp_count", 10)
      .order("stamp_count", { ascending: false })
      .limit(6),
  ]);

  const bestSellers = (() => {
    const byName = new Map<string, number>();
    for (const row of todayItems ?? []) {
      byName.set(row.name, (byName.get(row.name) ?? 0) + row.quantity);
    }
    return [...byName.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  })();
  const topSellerQty = bestSellers[0]?.[1] ?? 0;

  const logs = todayLogs ?? [];
  const stampsToday = logs.filter((l) => l.action === "ADD_STAMP").length;
  const redeemsToday = logs.filter((l) => l.action === "REDEEM_REWARD").length;

  const orders = todayOrders ?? [];
  const revenueToday = orders.reduce((sum, o) => sum + Number(o.total), 0);
  const ordersToday = orders.length;
  const avgOrderValue = ordersToday > 0 ? revenueToday / ordersToday : 0;

  const cashToday = orders.filter((o) => o.payment_method === "Cash").reduce((s, o) => s + Number(o.total), 0);
  const gcashToday = orders.filter((o) => o.payment_method === "GCash").reduce((s, o) => s + Number(o.total), 0);
  const discountToday = orders.reduce((s, o) => s + Number(o.discount ?? 0), 0);

  const revenueYesterday = (yesterdayOrders ?? []).reduce((s, o) => s + Number(o.total), 0);
  const revenueChangePct =
    revenueYesterday > 0 ? ((revenueToday - revenueYesterday) / revenueYesterday) * 100 : null;

  const voided = todayVoided ?? [];
  const voidedCount = voided.length;
  const voidedAmount = voided.reduce((s, o) => s + Number(o.total), 0);

  const nearReward = (nearRewardCards ?? []).map((c: any) => ({
    name: c.profiles?.full_name ?? "Unknown",
    stampCount: c.stamp_count,
  }));

  // Sales by hour, covering the branches' full opening window (8am–11pm).
  const hourBuckets = new Map<number, number>();
  for (const o of orders) {
    const h = new Date(o.created_at).getHours();
    hourBuckets.set(h, (hourBuckets.get(h) ?? 0) + Number(o.total));
  }
  const HOUR_RANGE = Array.from({ length: 16 }, (_, i) => i + 8); // 8..23
  const salesByHour = HOUR_RANGE.map((h) => ({ hour: h, revenue: hourBuckets.get(h) ?? 0 }));
  const maxHourRevenue = Math.max(...salesByHour.map((s) => s.revenue), 0);
  function formatHour(h: number) {
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}${period}`;
  }

  const byBranch = new Map<string, { stamps: number; redeems: number; orders: number; revenue: number }>();
  function entryFor(branch: string) {
    const existing = byBranch.get(branch);
    if (existing) return existing;
    const fresh = { stamps: 0, redeems: 0, orders: 0, revenue: 0 };
    byBranch.set(branch, fresh);
    return fresh;
  }
  for (const log of logs) {
    const branch = (log.branch_location ?? "Unspecified").replace(/ Branch$/, "");
    const entry = entryFor(branch);
    if (log.action === "ADD_STAMP") entry.stamps += 1;
    else entry.redeems += 1;
  }
  for (const o of orders) {
    const entry = entryFor(o.branch);
    entry.orders += 1;
    entry.revenue += Number(o.total);
  }

  const todayLabel = new Date().toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" });

  const stats = [
    { label: "Revenue today", value: `₱${revenueToday.toFixed(2)}`, icon: Wallet },
    { label: "Orders today", value: ordersToday, icon: ShoppingBag },
    { label: "Average order value", value: `₱${avgOrderValue.toFixed(2)}`, icon: Calculator },
    { label: "Stamps given today", value: stampsToday, icon: Gift },
    { label: "Total customers", value: customerCount ?? 0, icon: Users },
    { label: "Rewards redeemed today", value: redeemsToday, icon: Award },
    { label: "Rewards redeemed (all time)", value: rewardsRedeemedTotal ?? 0, icon: Trophy },
    { label: "Discounts given today", value: `₱${discountToday.toFixed(2)}`, icon: Tag },
    {
      label: "Voided orders today",
      value: `${voidedCount} · ₱${voidedAmount.toFixed(2)}`,
      icon: Ban,
    },
  ];

  const medalStyles = ["bg-amber-400 text-amber-950", "bg-stone-300 text-stone-700", "bg-amber-700 text-amber-50"];

  const TrendIcon = revenueChangePct === null ? Minus : revenueChangePct >= 0 ? TrendingUp : TrendingDown;
  const trendColor =
    revenueChangePct === null
      ? "bg-stone-100 text-stone-500"
      : revenueChangePct >= 0
      ? "bg-[#2D5A27]/10 text-[#2D5A27]"
      : "bg-red-100 text-red-600";

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-widest text-[#2D5A27]/50">{todayLabel}</p>
      <h2 className="mt-1 font-serif text-3xl text-[#2D5A27]">Overview</h2>
      <p className="mt-1 text-sm text-stone-500">
        {isBranchLocked ? `Today at a glance — ${myProfile?.branch}.` : "Today at a glance across both branches."}
      </p>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => {
          const Icon = s.icon;
          const showTrend = s.label === "Revenue today" && revenueChangePct !== null;
          return (
            <div
              key={s.label}
              className="group flex items-start justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-semibold text-[#2D5A27]">{s.value}</p>
                  {showTrend && (
                    <span className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium ${trendColor}`}>
                      <TrendIcon size={11} />
                      {`${Math.abs(revenueChangePct as number).toFixed(0)}%`}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-stone-500">{s.label}</p>
                {s.label === "Revenue today" && (
                  <p className="mt-0.5 text-xs text-stone-400">vs. ₱{revenueYesterday.toFixed(2)} yesterday</p>
                )}
              </div>
              <div className="rounded-full bg-[#2D5A27]/10 p-2.5 text-[#2D5A27] transition group-hover:bg-[#2D5A27] group-hover:text-[#F9F6F0]">
                <Icon size={18} strokeWidth={2} />
              </div>
            </div>
          );
        })}
      </div>

      <h3 className="mt-10 font-serif text-lg text-[#2D5A27]">Payment Split Today</h3>
      <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        {revenueToday === 0 ? (
          <p className="text-sm text-stone-500">No completed orders yet today.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {[
              { label: "Cash", amount: cashToday, icon: Banknote },
              { label: "GCash", amount: gcashToday, icon: Smartphone },
            ].map((p) => {
              const Icon = p.icon;
              const pct = revenueToday ? (p.amount / revenueToday) * 100 : 0;
              return (
                <div key={p.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 font-medium text-stone-700">
                      <Icon size={15} className="text-[#2D5A27]" />
                      {p.label}
                    </span>
                    <span className="text-stone-500">
                      ₱{p.amount.toFixed(2)} · {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-stone-100">
                    <div className="h-full rounded-full bg-[#2D5A27]" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <h3 className="mt-10 font-serif text-lg text-[#2D5A27]">Sales by Hour</h3>
      <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        {maxHourRevenue === 0 ? (
          <p className="text-sm text-stone-500">No completed orders yet today.</p>
        ) : (
          <div className="flex items-end gap-1.5">
            {salesByHour.map((s) => (
              <div key={s.hour} className="flex flex-1 flex-col items-center">
                <div className="group/bar relative flex h-24 w-full items-end justify-center">
                  <div
                    className={`w-full rounded-t transition ${s.revenue > 0 ? "bg-[#2D5A27]" : "bg-stone-100"}`}
                    style={{ height: `${maxHourRevenue ? Math.max((s.revenue / maxHourRevenue) * 100, s.revenue > 0 ? 4 : 2) : 2}%` }}
                  />
                  {s.revenue > 0 && (
                    <span className="pointer-events-none absolute -top-6 hidden whitespace-nowrap rounded bg-stone-800 px-1.5 py-0.5 text-[10px] text-white group-hover/bar:block">
                      ₱{s.revenue.toFixed(0)}
                    </span>
                  )}
                </div>
                <span className="mt-1.5 text-[9px] text-stone-400">{formatHour(s.hour)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <h3 className="mt-10 font-serif text-lg text-[#2D5A27]">Today&apos;s Best Sellers</h3>
      {bestSellers.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500">No completed orders yet today.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {bestSellers.map(([name, qty], i) => (
            <div
              key={name}
              className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white px-5 py-3.5 shadow-sm transition hover:shadow-md"
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  medalStyles[i] ?? "bg-[#2D5A27]/10 text-[#2D5A27]"
                }`}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-stone-900">{name}</p>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                  <div
                    className="h-full rounded-full bg-[#2D5A27]"
                    style={{ width: `${topSellerQty ? (qty / topSellerQty) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <span className="shrink-0 text-sm font-medium text-[#2D5A27]">{qty} sold</span>
            </div>
          ))}
        </div>
      )}

      <h3 className="mt-10 flex items-center gap-2 font-serif text-lg text-[#2D5A27]">
        <Flame size={18} className="text-amber-500" />
        Near a Free Drink
      </h3>
      {nearReward.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500">No one is close to a reward right now.</p>
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {nearReward.map((c, i) => (
            <div
              key={`${c.name}-${i}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white px-5 py-3 shadow-sm"
            >
              <span className="text-sm font-medium text-stone-900">{c.name}</span>
              <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                {c.stampCount}/10 stamps
              </span>
            </div>
          ))}
        </div>
      )}

      {!isBranchLocked && (
        <>
          <h3 className="mt-10 font-serif text-lg text-[#2D5A27]">Today by branch</h3>
          {byBranch.size === 0 ? (
            <p className="mt-3 text-sm text-stone-500">No activity yet today.</p>
          ) : (
            <div className="mt-4 overflow-hidden overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#2D5A27]/5 text-stone-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Branch</th>
                    <th className="px-5 py-3 font-medium">Orders</th>
                    <th className="px-5 py-3 font-medium">Revenue</th>
                    <th className="px-5 py-3 font-medium">Stamps added</th>
                    <th className="px-5 py-3 font-medium">Rewards redeemed</th>
                  </tr>
                </thead>
                <tbody>
                  {[...byBranch.entries()].map(([branch, counts]) => (
                    <tr key={branch} className="border-t border-stone-100 transition hover:bg-stone-50">
                      <td className="px-5 py-3 font-medium text-stone-900">{branch}</td>
                      <td className="px-5 py-3 text-stone-700">{counts.orders}</td>
                      <td className="px-5 py-3 font-medium text-[#2D5A27]">₱{counts.revenue.toFixed(2)}</td>
                      <td className="px-5 py-3 text-stone-700">{counts.stamps}</td>
                      <td className="px-5 py-3 text-stone-700">{counts.redeems}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
